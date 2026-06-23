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
  if (!res.ok) throw new Error(`AI error (${res.status}): ${await res.text().catch(() => "")}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const reply = json.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Empty AI response.");
  return reply;
}

async function gatherUserContext(supabase: any, userId: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  const weekAgo = new Date(today.getTime() - 7 * 86400000).toISOString();
  const todayDate = todayISO.slice(0, 10);

  const [pr, w7, water7, meals7, workouts7, wellness7, plan] = await Promise.all([
    supabase.from("profiles").select("name, age, gender, height_cm, weight_kg, activity_level, goal, water_goal_ml, language").eq("id", userId).maybeSingle(),
    supabase.from("weight_logs").select("weight_kg, logged_at").eq("user_id", userId).gte("logged_at", weekAgo).order("logged_at", { ascending: true }),
    supabase.from("water_logs").select("amount_ml, logged_at").eq("user_id", userId).gte("logged_at", weekAgo),
    supabase.from("meal_logs").select("meal_type, name, calories, logged_at").eq("user_id", userId).gte("logged_at", weekAgo),
    supabase.from("workout_logs").select("day_label, duration_min, calories_burned, logged_at").eq("user_id", userId).gte("logged_at", weekAgo),
    supabase.from("wellness_logs").select("day, sleep_hours, mood, steps, notes").eq("user_id", userId).gte("day", weekAgo.slice(0, 10)).order("day", { ascending: true }),
    supabase.from("diet_plans").select("daily_calories, budget").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const profile = pr.data;
  const latestW = w7.data?.[w7.data.length - 1]?.weight_kg ?? profile?.weight_kg;
  const bmi = profile?.height_cm && latestW ? (Number(latestW) / Math.pow(Number(profile.height_cm) / 100, 2)).toFixed(1) : null;

  const todayWater = (water7.data ?? []).filter((r: any) => r.logged_at >= todayISO).reduce((s: number, r: any) => s + (r.amount_ml ?? 0), 0);
  const todayMeals = (meals7.data ?? []).filter((r: any) => r.logged_at >= todayISO);
  const todayCals = todayMeals.reduce((s: number, r: any) => s + (r.calories ?? 0), 0);
  const todayWorkouts = (workouts7.data ?? []).filter((r: any) => r.logged_at >= todayISO);
  const todayWellness = (wellness7.data ?? []).find((r: any) => r.day === todayDate);

  const weekAvgCals = Math.round(((meals7.data ?? []).reduce((s: number, r: any) => s + (r.calories ?? 0), 0)) / 7);
  const weekAvgSleep = (wellness7.data ?? []).filter((r: any) => r.sleep_hours != null).reduce((s: number, r: any, _i: number, arr: any[]) => s + Number(r.sleep_hours) / arr.length, 0);
  const weekAvgSteps = Math.round((wellness7.data ?? []).filter((r: any) => r.steps != null).reduce((s: number, r: any, _i: number, arr: any[]) => s + Number(r.steps) / arr.length, 0));
  const weekAvgMood = (wellness7.data ?? []).filter((r: any) => r.mood != null).reduce((s: number, r: any, _i: number, arr: any[]) => s + Number(r.mood) / arr.length, 0);

  return {
    profile, plan: plan.data, bmi,
    today: { water_ml: todayWater, calories: todayCals, meals: todayMeals, workouts: todayWorkouts, wellness: todayWellness },
    week: { meals: meals7.data ?? [], workouts: workouts7.data ?? [], weights: w7.data ?? [], wellness: wellness7.data ?? [], avg_calories: weekAvgCals, avg_sleep: Number(weekAvgSleep.toFixed(1)), avg_steps: weekAvgSteps, avg_mood: Number(weekAvgMood.toFixed(1)) },
  };
}

function contextLines(ctx: any, lang: "en" | "bn") {
  const p = ctx.profile ?? {};
  return [
    `PROFILE: name=${p.name ?? "?"}, age=${p.age ?? "?"}, gender=${p.gender ?? "?"}, height=${p.height_cm ?? "?"}cm, weight=${p.weight_kg ?? "?"}kg, BMI=${ctx.bmi ?? "?"}, goal=${p.goal ?? "?"}, activity=${p.activity_level ?? "?"}.`,
    `TODAY: water=${ctx.today.water_ml}/${p.water_goal_ml ?? 2500}ml, calories=${ctx.today.calories}${ctx.plan?.daily_calories ? `/${ctx.plan.daily_calories}` : ""}kcal, meals_logged=${ctx.today.meals.length}, workouts_today=${ctx.today.workouts.length}, sleep=${ctx.today.wellness?.sleep_hours ?? "?"}h, mood=${ctx.today.wellness?.mood ?? "?"}/5, steps=${ctx.today.wellness?.steps ?? "?"}.`,
    `7-DAY AVG: calories=${ctx.week.avg_calories}kcal, sleep=${ctx.week.avg_sleep}h, steps=${ctx.week.avg_steps}, mood=${ctx.week.avg_mood}/5. Workouts this week=${ctx.week.workouts.length}.`,
    ctx.plan?.budget ? `Active diet plan budget: ${ctx.plan.budget}.` : "",
    `Reply in ${lang === "bn" ? "Bengali (বাংলা)" : "English"}.`,
  ].filter(Boolean).join("\n");
}

// === Daily AI insight (cached for ~3h) ===
export const getDailyInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lang: z.enum(["en", "bn"]), force: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    if (!data.force) {
      const { data: cached } = await supabase.from("ai_insights").select("content, created_at").eq("user_id", userId).eq("kind", `daily_${data.lang}`).gte("created_at", threeHoursAgo).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (cached) return { content: cached.content, cached: true };
    }
    const ctx = await gatherUserContext(supabase, userId);
    const sys = data.lang === "bn"
      ? "আপনি NutriFit এর AI কোচ। ব্যবহারকারীর আজকের ও সপ্তাহের ডেটা দেখে ৩-৪ লাইনে বাংলায় ব্যক্তিগত পরামর্শ দিন। কী ভালো হচ্ছে, কী উন্নত করতে হবে, আজকের একটি ছোট লক্ষ্য — সবই markdown bullet আকারে। বাংলাদেশি খাবার ও জীবনধারা মাথায় রাখুন। কোনো disclaimer দেবেন না।"
      : "You are NutriFit's AI coach. Based on the user's today + 7-day data, give 3-4 line personalised advice as a markdown bullet list: what's going well, what to improve, one small goal for today. Reference Bangladeshi food/lifestyle. No disclaimers.";
    const reply = await callAI("google/gemini-3.1-flash-lite", [
      { role: "system", content: sys },
      { role: "user", content: contextLines(ctx, data.lang) },
    ], { temperature: 0.5 });
    await supabase.from("ai_insights").insert({ user_id: userId, kind: `daily_${data.lang}`, content: reply });
    return { content: reply, cached: false };
  });

// === Weekly AI report ===
export const getWeeklyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lang: z.enum(["en", "bn"]), force: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    if (!data.force) {
      const { data: cached } = await supabase.from("ai_insights").select("content, created_at").eq("user_id", userId).eq("kind", `weekly_${data.lang}`).gte("created_at", dayAgo).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (cached) return { content: cached.content, cached: true };
    }
    const ctx = await gatherUserContext(supabase, userId);
    const sys = data.lang === "bn"
      ? "আপনি NutriFit এর AI কোচ। গত ৭ দিনের সম্পূর্ণ ডেটা (ওজন, খাবার, পানি, ঘুম, স্টেপ, mood, ওয়ার্কআউট) বিশ্লেষণ করে বাংলায় একটি সাপ্তাহিক রিপোর্ট দিন। অংশগুলো: 'সারসংক্ষেপ', 'ভালো দিকগুলো', 'যা উন্নত করতে হবে', 'আগামী সপ্তাহের ৩টি পরিষ্কার লক্ষ্য'। Markdown headings ব্যবহার করুন। সংখ্যা উল্লেখ করুন।"
      : "You are NutriFit's AI coach. Analyse the user's last 7 days (weight, meals, water, sleep, steps, mood, workouts) and write a weekly report with sections: 'Summary', 'What's working', 'What to improve', 'Next week — 3 clear goals'. Use markdown headings. Reference specific numbers.";
    const reply = await callAI("google/gemini-3.1-flash-lite", [
      { role: "system", content: sys },
      { role: "user", content: contextLines(ctx, data.lang) + "\n\nDETAILED 7-DAY DATA:\n" + JSON.stringify(ctx.week).slice(0, 4000) },
    ], { temperature: 0.5 });
    await supabase.from("ai_insights").insert({ user_id: userId, kind: `weekly_${data.lang}`, content: reply });
    return { content: reply, cached: false };
  });

// === Recipe generator from ingredients ===
export const generateRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    ingredients: z.string().min(2).max(500),
    budget: z.enum(["low", "mid", "high"]).optional(),
    lang: z.enum(["en", "bn"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = await gatherUserContext(context.supabase, context.userId);
    const sys = data.lang === "bn"
      ? "আপনি একজন বাংলাদেশি শেফ ও পুষ্টিবিদ। সম্পূর্ণ উত্তর শুধুমাত্র বাংলা ভাষায় দিন (কোনো ইংরেজি শব্দ নয়, সংখ্যাও বাংলায়)। উপকরণ ইংরেজিতে দেওয়া থাকলেও বাংলায় অনুবাদ করে লিখুন। কাঠামো: '🍳 নাম', '⏱️ সময়', '🔥 আনুমানিক ক্যালরি/সার্ভিং', '🛒 উপকরণ' (গৃহস্থালী পরিমাপ), '👨‍🍳 ধাপ' (১-৬ ধাপ), '💡 টিপ'। বাজেট ও diet goal মাথায় রাখুন। Markdown।"
      : "You are a Bangladeshi chef + nutritionist. Respond ONLY in English. Create a healthy recipe from the user's ingredients. Structure: '🍳 Name', '⏱️ Time', '🔥 Estimated kcal/serving', '🛒 Ingredients' (household units), '👨‍🍳 Steps' (1-6), '💡 Tip'. Respect their budget and diet goal. Markdown.";
    const reply = await callAI("google/gemini-3.1-flash-lite", [
      { role: "system", content: sys },
      { role: "user", content: `${contextLines(ctx, data.lang)}\nBudget: ${data.budget ?? "mid"}\nIngredients: ${data.ingredients}\n\n${data.lang === "bn" ? "অনুগ্রহ করে সম্পূর্ণ রেসিপি বাংলায় লিখুন।" : "Please write the full recipe in English."}` },
    ], { temperature: 0.7 });
    await context.supabase.from("ai_insights").insert({ user_id: context.userId, kind: "recipe", content: reply, meta: { ingredients: data.ingredients } });
    return { content: reply };
  });

// === Analyze meal photo (vision) ===
export const analyzeMealPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    imageDataUrl: z.string().startsWith("data:image/"),
    lang: z.enum(["en", "bn"]),
    logIt: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured.");
    const sys = data.lang === "bn"
      ? "আপনি একজন পুষ্টিবিদ। ছবিতে যা খাবার দেখছেন তা চিনুন (বাংলাদেশি খাবার বেশি)। JSON-ই দিন, অন্য কিছু না: {\"name\":\"...\",\"meal_type\":\"breakfast|lunch|dinner|snack\",\"calories\":number,\"protein_g\":number,\"summary\":\"১ লাইন বাংলায়\"}"
      : "You are a nutritionist. Identify the foods in the image (often Bangladeshi). Reply with JSON ONLY: {\"name\":\"...\",\"meal_type\":\"breakfast|lunch|dinner|snack\",\"calories\":number,\"protein_g\":number,\"summary\":\"1 line\"}";
    const res = await fetch(LOVABLE_AI, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: [
            { type: "text", text: data.lang === "bn" ? "এই খাবারের ছবি বিশ্লেষণ করুন।" : "Analyze this meal photo." },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ] },
        ],
        temperature: 0.3,
      }),
    });
    if (!res.ok) throw new Error(`AI error (${res.status})`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").replace(/^```\s*|\s*```$/g, "");
    let parsed: { name: string; meal_type: string; calories: number; protein_g: number; summary: string };
    try { parsed = JSON.parse(cleaned); } catch { throw new Error("Could not read AI response."); }

    if (data.logIt) {
      await context.supabase.from("meal_logs").insert({
        user_id: context.userId,
        meal_type: parsed.meal_type,
        name: parsed.name,
        calories: Math.round(parsed.calories ?? 0),
        protein_g: parsed.protein_g ?? null,
      });
    }
    return parsed;
  });

// === Wellness log upsert ===
export const upsertWellness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    day: z.string().optional(),
    sleep_hours: z.number().min(0).max(24).nullable().optional(),
    mood: z.number().int().min(1).max(5).nullable().optional(),
    steps: z.number().int().min(0).max(200000).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const day = data.day ?? new Date().toISOString().slice(0, 10);
    const { error } = await context.supabase
      .from("wellness_logs")
      .upsert({
        user_id: context.userId,
        day,
        sleep_hours: data.sleep_hours ?? null,
        mood: data.mood ?? null,
        steps: data.steps ?? null,
        notes: data.notes ?? null,
      }, { onConflict: "user_id,day" });
    if (error) throw new Error((error as any).message);
    return { ok: true };
    if (error) throw new Error((error as any).message);
    return { ok: true };
  });

export const loadWellnessWeek = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    const { data } = await context.supabase
      .from("wellness_logs")
      .select("day, sleep_hours, mood, steps, notes")
      .eq("user_id", context.userId)
      .gte("day", since)
      .order("day", { ascending: true });
    return data ?? [];
  });
