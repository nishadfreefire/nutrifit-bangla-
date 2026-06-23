import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const InputSchema = z.object({
  budget: z.enum(["low", "medium", "high"]),
  durationDays: z.number().int().min(1).max(180),
  language: z.enum(["en", "bn"]).optional().default("en"),
});

export type Meal = {
  name: string;
  description: string;
  time?: string;
  kcal: number;
  protein_g: number;
  prep_minutes?: number;
  ingredients?: string[];
};


export type DayPlan = {
  day: number;
  theme?: string;
  breakfast: Meal;
  mid_morning: Meal;
  lunch: Meal;
  evening_snack: Meal;
  dinner: Meal;
  notes?: string;
};

export type DietPlan = {
  summary: string;
  daily_calories: number;
  macros: { protein_g: number; carbs_g: number; fat_g: number };
  hydration_liters: number;
  routine: { wake_up: string; sleep: string; exercise: string };
  grocery_list?: string[];
  tips?: string[];
  days: DayPlan[];
};

export const generateDietPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("name, age, gender, height_cm, weight_kg, activity_level, goal, target_weight_kg, weekly_change_kg")
      .eq("id", userId)
      .maybeSingle();
    if (profileErr) throw new Error(profileErr.message);
    if (!profile || !profile.age || !profile.height_cm || !profile.weight_kg) {
      throw new Error("Please complete onboarding first.");
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");

    const aiDays = Math.min(data.durationDays, 14);
    const lang = data.language === "bn" ? "Bangla (বাংলা)" : "English";

    const budgetRules = {
      low: `LOW BUDGET (~৳150/day total). Cheap staples ONLY: rice, atta roti, masoor/mug daal, eggs (max 2/day), seasonal cheap veg (potol, lau, kumra, dharosh, palong shak), banana, papaya, muri, chola, peanuts, milk tea. Protein mostly from daal + eggs + occasional small tilapia/pangash fish (max 1-2 times/week). NO chicken, NO beef/mutton, NO ilish, NO rui, NO imported fruits, NO yogurt drinks, NO oats, NO nuts beyond peanuts.`,
      medium: `MEDIUM BUDGET (~৳300/day total). Add: chicken 2-3 times/week, rui/tilapia 2-3 times/week, eggs daily, plain doi (yogurt), seasonal fruits (guava, mango, jackfruit), oats sometimes, mixed veg. Still avoid expensive items: ilish, beef, almonds, salmon, imported berries.`,
      high: `HIGH BUDGET (~৳500+/day total). Include: chicken/fish daily, ilish 1-2 times/week, occasional beef, eggs, paneer, oats, almonds/cashews, mixed seasonal + imported fruits (apple, grapes), Greek-style doi, olive oil cooking, salad with cucumber/tomato/carrot daily.`,
    }[data.budget];

    const system = `You are a friendly Bangladeshi diet coach (didi/bhaiya style). Write like you are explaining to a regular village/town person who has NEVER counted calories. Use SHORT, SIMPLE, EVERYDAY language.
${budgetRules}

LANGUAGE RULES — VERY IMPORTANT:
- Write meal "name" SHORT (2-4 words max). Example: "ডিম-রুটি নাস্তা" or "Egg & Roti".
- Write meal "description" as ONE friendly sentence (max 15-18 words) telling exactly what to eat, using HOUSEHOLD measures everyone understands: "১ মুঠো ভাত", "১ গ্লাস দুধ", "২ পিস রুটি", "১ বাটি ডাল", "অর্ধেক প্লেট সবজি". NO grams, NO "approximately", NO English words mixed in Bangla.
- Bangla example (good): "সকাল ৮টায় ২টা সিদ্ধ ডিম, ২টা আটার রুটি আর ১ কাপ দুধ চা খান।"
- English example (good): "At 8 AM eat 2 boiled eggs, 2 atta rotis and 1 cup of milk tea."
- AVOID jargon: don't say "macros", "complex carbs", "lean protein". Just say the food.
- "tips" must be ULTRA simple — like advice from a mother. Max 10 words each.
- "notes" max 1 short line.

Write all user-facing text in ${lang}. STRICTLY respect the budget tier. Return STRICT JSON only — no markdown, no commentary.`;


    const totalIn = (profile.height_cm ?? 0) / 2.54;
    const ft = Math.floor(totalIn / 12);
    const inch = Math.round(totalIn - ft * 12);
    const heightFtIn = `${ft}'${inch}"`;

    // Compute calorie target from goal + weekly pace (1 kg ≈ 7700 kcal).
    const { calcDailyCalories, weeksToGoal } = await import("@/lib/health");
    const curW = Number(profile.weight_kg);
    const targetW = profile.target_weight_kg != null ? Number(profile.target_weight_kg) : null;
    const weeklyKg = profile.weekly_change_kg != null ? Number(profile.weekly_change_kg) : null;
    const targetCalories = calcDailyCalories(
      curW,
      Number(profile.height_cm),
      Number(profile.age),
      profile.gender as "male" | "female",
      profile.activity_level as "low" | "moderate" | "high",
      profile.goal as "weight_loss" | "weight_gain" | "maintain" | "muscle_gain",
      weeklyKg,
    );
    const weeksETA = targetW != null && weeklyKg ? weeksToGoal(curW, targetW, weeklyKg) : null;
    const goalLine = targetW != null && weeklyKg
      ? `- Target weight: ${targetW} kg (currently ${curW} kg) at ${weeklyKg} kg/week → ETA ~${weeksETA ?? "?"} weeks`
      : "";

    const user = `Create a personalized ${aiDays}-day diet plan for this user:
- Name: ${profile.name ?? "User"}
- Age: ${profile.age}, Gender: ${profile.gender}
- Height: ${heightFtIn} (${profile.height_cm} cm), Weight: ${profile.weight_kg} kg
- Activity level: ${profile.activity_level}
- Goal: ${profile.goal}
${goalLine}
- TARGET daily calories: ${targetCalories} kcal — set "daily_calories" to this exact number and make every day's meal kcal sum within ±50 of it.
- Budget: ${data.budget}

VERY IMPORTANT — every single day must be FULLY described. Do NOT shorten or repeat "same as day 1". Each day must have all 5 meals with clear what/when/how-much instructions a beginner can follow without thinking. Vary the meals across days so the week feels fresh.

Each meal "description" MUST tell:
  1) the exact time ("সকাল ৮টায়" / "at 8 AM")
  2) every food item with HOUSEHOLD quantity ("২টা রুটি", "১ মুঠো ভাত", "১ বাটি ডাল", "১ গ্লাস দুধ", "১ কাপ চা")
  3) one tiny cooking/eating tip if helpful ("চিনি ছাড়া", "তেল কম দিয়ে", "ভালো করে চিবিয়ে খান")
Keep it ONE friendly sentence, max ~20 words. No grams, no jargon.

Output JSON with this EXACT shape (every meal object MUST include time, kcal and protein_g):
{
  "summary": "2-3 sentences in ${lang} explaining who this plan is for and what to expect",
  "daily_calories": number,
  "macros": { "protein_g": number, "carbs_g": number, "fat_g": number },
  "hydration_liters": number,
  "routine": { "wake_up": "HH:MM", "sleep": "HH:MM", "exercise": "short description with time" },
  "grocery_list": ["6-10 staple items for the week"],
  "tips": ["4-6 ultra-simple tips, mother-style, max 10 words each"],
  "days": [
    {
      "day": 1,
      "theme": "short label in ${lang} (e.g. 'হালকা শুরু' / 'Light start')",
      "breakfast":    { "name": "2-4 word name", "time": "8:00 AM",  "description": "full friendly instruction with portions", "kcal": 0, "protein_g": 0, "prep_minutes": 10, "ingredients": ["..."] },
      "mid_morning":  { "name": "...", "time": "11:00 AM", "description": "...", "kcal": 0, "protein_g": 0, "ingredients": ["..."] },
      "lunch":        { "name": "...", "time": "1:30 PM",  "description": "...", "kcal": 0, "protein_g": 0, "prep_minutes": 25, "ingredients": ["..."] },
      "evening_snack":{ "name": "...", "time": "5:00 PM",  "description": "...", "kcal": 0, "protein_g": 0, "ingredients": ["..."] },
      "dinner":       { "name": "...", "time": "8:30 PM",  "description": "...", "kcal": 0, "protein_g": 0, "prep_minutes": 25, "ingredients": ["..."] },
      "notes": "one short helpful line in ${lang} for THIS day"
    }
  ]
}
Provide exactly ${aiDays} day entries — fully filled, never empty, never duplicated. Daily kcal across meals should sum close to daily_calories. Times must align with the user's wake/sleep routine.`;




    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Please add credits in workspace settings.");
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI error (${res.status}): ${txt.slice(0, 200)}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response.");

    let plan: DietPlan;
    try {
      plan = JSON.parse(content) as DietPlan;
    } catch {
      throw new Error("AI returned malformed JSON.");
    }

    const title = `${data.durationDays}-day ${data.budget} budget plan`;

    await supabase.from("diet_plans").update({ is_active: false }).eq("user_id", userId);

    const { data: inserted, error: insertErr } = await supabase
      .from("diet_plans")
      .insert({
        user_id: userId,
        title,
        budget: data.budget,
        duration_days: data.durationDays,
        daily_calories: plan.daily_calories ?? null,
        plan: plan as never,
        is_active: true,
      })
      .select("id")
      .single();
    if (insertErr) throw new Error(insertErr.message);

    return { id: inserted.id, plan };
  });
