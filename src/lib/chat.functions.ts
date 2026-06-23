import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SendInput = z.object({ message: z.string().min(1).max(2000), lang: z.enum(["en", "bn"]) });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");

    // Persist user msg first
    await supabase.from("chat_messages").insert({ user_id: userId, role: "user", content: data.message });

    // Get profile context
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, age, gender, height_cm, weight_kg, activity_level, goal, water_goal_ml")
      .eq("id", userId)
      .maybeSingle();

    // Today + 7d logs for personalized advice (Full Auto-Coach)
    const now = new Date();
    const todayISO = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const todayDate = todayISO.slice(0, 10);

    const [waterRes, mealRes, weightRes, planRes, workoutsRes, wellnessRes] = await Promise.all([
      supabase.from("water_logs").select("amount_ml, logged_at").eq("user_id", userId).gte("logged_at", weekAgo),
      supabase.from("meal_logs").select("meal_type, name, calories, logged_at").eq("user_id", userId).gte("logged_at", weekAgo),
      supabase.from("weight_logs").select("weight_kg, logged_at").eq("user_id", userId).order("logged_at", { ascending: false }).limit(7),
      supabase.from("diet_plans").select("daily_calories, budget").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("workout_logs").select("day_label, duration_min, calories_burned, logged_at").eq("user_id", userId).gte("logged_at", weekAgo),
      supabase.from("wellness_logs").select("day, sleep_hours, mood, steps").eq("user_id", userId).gte("day", weekAgo.slice(0, 10)).order("day", { ascending: true }),
    ]);
    const waterToday = (waterRes.data ?? []).filter((r) => r.logged_at >= todayISO).reduce((s, r) => s + (r.amount_ml ?? 0), 0);
    const mealsToday = (mealRes.data ?? []).filter((r) => r.logged_at >= todayISO);
    const caloriesToday = mealsToday.reduce((s, r) => s + (r.calories ?? 0), 0);
    const workoutsToday = (workoutsRes.data ?? []).filter((r) => r.logged_at >= todayISO);
    const wellnessToday = (wellnessRes.data ?? []).find((r) => r.day === todayDate);
    const latestWeight = weightRes.data?.[0]?.weight_kg ?? profile?.weight_kg;

    const weekKcalAvg = Math.round(((mealRes.data ?? []).reduce((s, r) => s + (r.calories ?? 0), 0)) / 7);
    const sleepArr = (wellnessRes.data ?? []).filter((r) => r.sleep_hours != null);
    const stepsArr = (wellnessRes.data ?? []).filter((r) => r.steps != null);
    const moodArr = (wellnessRes.data ?? []).filter((r) => r.mood != null);
    const avgSleep = sleepArr.length ? (sleepArr.reduce((s, r) => s + Number(r.sleep_hours), 0) / sleepArr.length).toFixed(1) : "?";
    const avgSteps = stepsArr.length ? Math.round(stepsArr.reduce((s, r) => s + Number(r.steps), 0) / stepsArr.length) : "?";
    const avgMood = moodArr.length ? (moodArr.reduce((s, r) => s + Number(r.mood), 0) / moodArr.length).toFixed(1) : "?";

    const bmi = profile?.height_cm && latestWeight
      ? (Number(latestWeight) / Math.pow(Number(profile.height_cm) / 100, 2)).toFixed(1)
      : null;

    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    const recent = (history ?? []).reverse();

    const sys = data.lang === "bn"
      ? `আপনি NutriFit এর একজন বিশেষজ্ঞ AI কোচ। ব্যবহারকারীর আজকের ও গত ৭ দিনের সব ডেটা (ওজন, খাবার, পানি, ঘুম, স্টেপ, mood, ওয়ার্কআউট) আপনার কাছে আছে। সবসময় বাংলায় সংক্ষিপ্ত personalised পরামর্শ দিন; বাংলাদেশি খাবার (ভাত, ডাল, মাছ, রুটি, শাক) ব্যবহার করুন। নির্দিষ্ট সংখ্যা উল্লেখ করুন। সমস্যা proactively ধরিয়ে দিন (কম ঘুম, কম পানি, missed workout)। Markdown list। কখনই disclaimer দেবেন না।`
      : `You are NutriFit's expert AI coach with full access to the user's today + 7-day data (weight, meals, water, sleep, steps, mood, workouts). Reply concisely with personalised advice referencing Bangladeshi foods (bhaat, daal, rui, roti, shak). Cite specific numbers and proactively flag issues (low sleep, low water, missed workouts). Markdown lists. No repetitive disclaimers.`;

    const profileLine = profile
      ? `PROFILE: name=${profile.name ?? "?"}, age=${profile.age ?? "?"}, gender=${profile.gender ?? "?"}, height=${profile.height_cm ?? "?"}cm, weight=${latestWeight ?? "?"}kg, BMI=${bmi ?? "?"}, activity=${profile.activity_level ?? "?"}, goal=${profile.goal ?? "?"}.`
      : "Profile not completed.";
    const todayLine = `TODAY: water=${waterToday}/${profile?.water_goal_ml ?? 2500}ml, calories=${caloriesToday}${planRes.data?.daily_calories ? `/${planRes.data.daily_calories}` : ""}kcal, meals=${mealsToday.length}, workouts=${workoutsToday.length}, sleep=${wellnessToday?.sleep_hours ?? "?"}h, mood=${wellnessToday?.mood ?? "?"}/5, steps=${wellnessToday?.steps ?? "?"}.`;
    const weekLine = `7-DAY AVG: calories=${weekKcalAvg}kcal, sleep=${avgSleep}h, steps=${avgSteps}, mood=${avgMood}/5, total_workouts=${(workoutsRes.data ?? []).length}.${planRes.data?.budget ? ` Plan budget: ${planRes.data.budget}.` : ""}`;

    const tools = [
      {
        type: "function",
        function: {
          name: "update_profile",
          description: "Update the user's profile fields. Call this whenever the user asks to change anything about themselves (weight, target weight, goal, activity, weekly pace, name, age, height, water goal, language).",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "integer", minimum: 10, maximum: 100 },
              gender: { type: "string", enum: ["male", "female"] },
              height_cm: { type: "number", minimum: 100, maximum: 230 },
              weight_kg: { type: "number", minimum: 30, maximum: 250, description: "Current weight in kg. Also logs a new weight entry." },
              target_weight_kg: { type: "number", minimum: 30, maximum: 250 },
              weekly_change_kg: { type: "number", minimum: 0.1, maximum: 1, description: "Target weekly weight change in kg (e.g. 0.5)." },
              activity_level: { type: "string", enum: ["low", "moderate", "high"] },
              goal: { type: "string", enum: ["weight_loss", "weight_gain", "maintain", "muscle_gain"] },
              water_goal_ml: { type: "integer", minimum: 1000, maximum: 6000 },
              language: { type: "string", enum: ["en", "bn"] },
            },
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "regenerate_diet_plan",
          description: "Generate a fresh diet plan for the user based on their current profile (target weight, goal, weekly pace). Call this after updating profile fields that affect the plan, OR when the user asks for a new/updated diet plan.",
          parameters: {
            type: "object",
            properties: {
              budget: { type: "string", enum: ["low", "medium", "high"] },
              duration_days: { type: "integer", minimum: 1, maximum: 30, default: 7 },
            },
            required: ["budget"],
            additionalProperties: false,
          },
        },
      },
    ];

    type ChatMsg = { role: string; content: string | null; tool_call_id?: string; tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> };
    const messages: ChatMsg[] = [
      { role: "system", content: `${sys}\n${profileLine}\n${todayLine}\n${weekLine}\n\nIMPORTANT: When the user asks to change anything about their profile (e.g. "ami ekhon 70kg", "target 65 kg koro", "amar goal change koro to weight loss", "diet plan abar banao"), call the appropriate tool. Don't just say you've done it — actually call the tool. After a tool call succeeds, briefly confirm in the user's language what changed.` },
      ...recent.map((m) => ({ role: m.role, content: m.content })),
    ];

    let reply = "";
    for (let step = 0; step < 4; step++) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: "google/gemini-3.1-flash-lite", messages, temperature: 0.5, tools, tool_choice: "auto" }),
      });
      if (res.status === 429) throw new Error("Rate limit. Try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      if (!res.ok) throw new Error(`AI error (${res.status})`);
      const json = (await res.json()) as { choices?: Array<{ message?: ChatMsg & { tool_calls?: ChatMsg["tool_calls"] } }> };
      const msg = json.choices?.[0]?.message;
      if (!msg) throw new Error("Empty AI response.");

      const toolCalls = msg.tool_calls ?? [];
      if (toolCalls.length === 0) {
        reply = (msg.content ?? "").trim();
        break;
      }

      messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: toolCalls });

      for (const call of toolCalls) {
        let result: unknown;
        try {
          const args = JSON.parse(call.function.arguments || "{}");
          if (call.function.name === "update_profile") {
            const allowed = ["name", "age", "gender", "height_cm", "weight_kg", "target_weight_kg", "weekly_change_kg", "activity_level", "goal", "water_goal_ml", "language"] as const;
            const patch: Record<string, unknown> = {};
            for (const k of allowed) if (args[k] !== undefined) patch[k] = args[k];
            if (Object.keys(patch).length === 0) {
              result = { ok: false, error: "No valid fields provided." };
            } else {
              const { error } = await supabase.from("profiles").update(patch as never).eq("id", userId);
              if (error) throw error;
              if (patch.weight_kg !== undefined) {
                await supabase.from("weight_logs").insert({ user_id: userId, weight_kg: Number(patch.weight_kg) });
              }
              result = { ok: true, updated: patch };
            }
          } else if (call.function.name === "regenerate_diet_plan") {
            const { generateDietPlan } = await import("./diet.functions");
            const out = await generateDietPlan({
              data: { budget: args.budget, durationDays: Number(args.duration_days ?? 7), language: data.lang },
            });
            result = { ok: true, plan_id: out.id, daily_calories: out.plan.daily_calories, days: out.plan.days.length };
          } else {
            result = { ok: false, error: `Unknown tool: ${call.function.name}` };
          }
        } catch (err) {
          result = { ok: false, error: err instanceof Error ? err.message : "Tool failed" };
        }
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }

    if (!reply) reply = data.lang === "bn" ? "✅ আপডেট করে দিয়েছি।" : "✅ Done.";

    await supabase.from("chat_messages").insert({ user_id: userId, role: "assistant", content: reply });
    return { reply };
  });

export const loadChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(100);
    return data ?? [];
  });

export const clearChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("chat_messages").delete().eq("user_id", userId);
    return { ok: true };
  });
