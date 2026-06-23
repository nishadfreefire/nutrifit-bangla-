import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const LOVABLE_AI = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(model: string, messages: unknown[], opts?: { temperature?: number }) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI not configured.");
  const res = await fetch(LOVABLE_AI, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: opts?.temperature ?? 0.6 }),
  });
  if (res.status === 429) throw new Error("Rate limit. Try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted.");
  if (!res.ok) throw new Error(`AI error (${res.status})`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

// ===== Weight forecast (pure math, no AI cost) =====
export const predictProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: weights }] = await Promise.all([
      supabase.from("profiles").select("weight_kg, goal, height_cm").eq("id", userId).maybeSingle(),
      supabase.from("weight_logs").select("weight_kg, logged_at").eq("user_id", userId).order("logged_at", { ascending: true }),
    ]);

    if (!weights || weights.length < 2) {
      return { hasEnoughData: false, current: profile?.weight_kg ?? null };
    }

    // Linear regression: weight vs days
    const first = new Date(weights[0].logged_at).getTime();
    const points = weights.map((w: any) => ({
      x: (new Date(w.logged_at).getTime() - first) / 86400000,
      y: Number(w.weight_kg),
    }));
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    const lastX = points[n - 1].x;
    const current = Number(profile?.weight_kg ?? points[n - 1].y);
    const project = (daysAhead: number) => +(intercept + slope * (lastX + daysAhead)).toFixed(1);

    const weeklyChange = +(slope * 7).toFixed(2);
    const monthlyChange = +(slope * 30).toFixed(2);

    return {
      hasEnoughData: true,
      current,
      weeklyChange,
      monthlyChange,
      in4Weeks: project(28),
      in8Weeks: project(56),
      in12Weeks: project(84),
      trend: slope < -0.02 ? "losing" : slope > 0.02 ? "gaining" : "stable",
      goal: profile?.goal,
      dataPoints: n,
    };
  });

// ===== AI Grocery List =====
export const generateGroceryList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lang: z.enum(["en", "bn"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: plan } = await supabase
      .from("diet_plans")
      .select("plan, daily_calories, budget")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!plan) throw new Error(data.lang === "bn" ? "প্রথমে diet plan generate করুন।" : "Generate a diet plan first.");

    const sys = data.lang === "bn"
      ? "আপনি বাংলাদেশি বাজার বিশেষজ্ঞ। নিচের সাপ্তাহিক diet plan থেকে একটি সম্পূর্ণ শপিং লিস্ট বানান। শুধুমাত্র বাংলায় লিখুন। কাঠামো:\n\n## 🛒 সাপ্তাহিক বাজার লিস্ট\n\n### 🥬 সবজি ও ফল\n- নাম — পরিমাণ — আনুমানিক দাম (৳)\n\n### 🍗 প্রোটিন (মাছ/মাংস/ডিম/ডাল)\n\n### 🌾 শস্য ও তেল\n\n### 🥛 দুগ্ধ ও অন্যান্য\n\n### 💰 মোট আনুমানিক খরচ: ৳XXXX\n\n### 💡 টিপস\n- কোথা থেকে কিনলে সস্তা\n- কী আগে কিনতে হবে"
      : "You are a Bangladeshi market expert. From the weekly diet plan below, generate a complete grocery shopping list in English. Structure:\n\n## 🛒 Weekly Grocery List\n\n### 🥬 Vegetables & Fruits\n- item — quantity — estimated price (৳)\n\n### 🍗 Protein (fish/meat/eggs/dal)\n\n### 🌾 Grains & Oil\n\n### 🥛 Dairy & Others\n\n### 💰 Total estimated: ৳XXXX\n\n### 💡 Tips";

    const reply = await callAI("google/gemini-3.1-flash-lite", [
      { role: "system", content: sys },
      { role: "user", content: `Budget: ${plan.budget ?? "mid"}\nDaily calories: ${plan.daily_calories}\nDiet plan:\n${JSON.stringify(plan.plan).slice(0, 3000)}` },
    ], { temperature: 0.5 });

    await supabase.from("ai_insights").insert({ user_id: userId, kind: "grocery", content: reply });
    return { content: reply };
  });

// ===== Meal Swap =====
export const swapMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    currentMeal: z.string().min(2).max(300),
    mealType: z.string().min(2).max(30),
    targetCalories: z.number().int().min(50).max(2000),
    lang: z.enum(["en", "bn"]),
    reason: z.string().max(200).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const sys = data.lang === "bn"
      ? "আপনি বাংলাদেশি পুষ্টিবিদ। ব্যবহারকারীর বর্তমান খাবার পছন্দ না — ৩টি বিকল্প দিন। শুধু বাংলায় লিখুন। প্রতিটি বিকল্পের জন্য:\n\n### বিকল্প ১: [নাম]\n- 🔥 ক্যালরি: XXX kcal\n- 🛒 উপকরণ: ...\n- 👨‍🍳 প্রস্তুতি: এক লাইনে\n- 💡 কেন ভালো: ..."
      : "You are a Bangladeshi nutritionist. Give 3 alternative meals. For each:\n\n### Option 1: [name]\n- 🔥 Calories: XXX kcal\n- 🛒 Ingredients\n- 👨‍🍳 Quick prep\n- 💡 Why this works";

    const reply = await callAI("google/gemini-3.1-flash-lite", [
      { role: "system", content: sys },
      { role: "user", content: `Meal type: ${data.mealType}\nCurrent meal: ${data.currentMeal}\nTarget calories: ~${data.targetCalories} kcal\nReason for swap: ${data.reason ?? "প্রিয় না / not preferred"}` },
    ], { temperature: 0.8 });

    return { content: reply };
  });
