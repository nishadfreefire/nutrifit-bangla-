import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const InputSchema = z.object({
  location: z.enum(["home", "gym"]),
  daysPerWeek: z.number().int().min(2).max(6),
});

export type Exercise = { name: string; sets: number; reps: string; rest_sec?: number; notes?: string };
export type WorkoutDay = { day: string; focus: string; warmup: string; exercises: Exercise[]; cooldown: string; est_calories: number };
export type WorkoutPlan = { summary: string; days: WorkoutDay[] };

export const generateWorkoutPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("age, gender, height_cm, weight_kg, activity_level, goal")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.age) throw new Error("Complete onboarding first.");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured.");

    const system = `You are a certified fitness coach for Bangladeshi users. Generate safe, effective workout plans. Use exercises appropriate for ${data.location === "home" ? "home with minimal/no equipment (bodyweight, resistance bands, a chair)" : "a standard gym (dumbbells, barbell, machines)"}. Output STRICT JSON only.`;

    const user = `Create a ${data.daysPerWeek}-day/week workout plan.
User: age ${profile.age}, ${profile.gender}, ${profile.height_cm}cm, ${profile.weight_kg}kg, activity ${profile.activity_level}, goal ${profile.goal}.
Location: ${data.location}.

JSON shape:
{
  "summary": "2 sentences",
  "days": [
    { "day": "Day 1 — Push", "focus": "chest, shoulders, triceps", "warmup": "5 min jog + dynamic stretches", "exercises": [ { "name": "Push-ups", "sets": 3, "reps": "10-12", "rest_sec": 60, "notes": "knee push-ups if needed" } ], "cooldown": "5 min stretching", "est_calories": 250 }
  ]
}
Provide exactly ${data.daysPerWeek} days. Each day 5-7 exercises.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("Rate limit. Try again.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) throw new Error(`AI error (${res.status})`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response.");
    let plan: WorkoutPlan;
    try { plan = JSON.parse(content) as WorkoutPlan; } catch { throw new Error("Malformed JSON."); }

    await supabase.from("workout_plans").update({ is_active: false }).eq("user_id", userId);
    const title = `${data.daysPerWeek}-day ${data.location} routine`;
    const { data: inserted, error } = await supabase
      .from("workout_plans")
      .insert({ user_id: userId, title, location: data.location, days_per_week: data.daysPerWeek, plan: plan as never, is_active: true })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id, plan };
  });
