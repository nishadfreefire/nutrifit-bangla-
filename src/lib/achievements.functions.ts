import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Badge = {
  key: string;
  name_en: string;
  name_bn: string;
  desc_en: string;
  desc_bn: string;
  emoji: string;
};

export const ALL_BADGES: Badge[] = [
  { key: "first_step", emoji: "👣", name_en: "First Step", name_bn: "প্রথম পদক্ষেপ", desc_en: "Started your journey", desc_bn: "যাত্রা শুরু করেছেন" },
  { key: "streak_3", emoji: "🔥", name_en: "On Fire", name_bn: "জ্বলছে আগুন", desc_en: "3-day streak", desc_bn: "৩ দিনের streak" },
  { key: "streak_7", emoji: "⚡", name_en: "Week Warrior", name_bn: "সপ্তাহ বিজয়ী", desc_en: "7-day streak", desc_bn: "৭ দিনের streak" },
  { key: "streak_30", emoji: "🏆", name_en: "Monthly Master", name_bn: "মাসিক চ্যাম্পিয়ন", desc_en: "30-day streak", desc_bn: "৩০ দিনের streak" },
  { key: "streak_100", emoji: "💎", name_en: "Diamond Discipline", name_bn: "হীরের অধ্যবসায়", desc_en: "100-day streak", desc_bn: "১০০ দিনের streak" },
  { key: "hydration_hero", emoji: "💧", name_en: "Hydration Hero", name_bn: "পানি বীর", desc_en: "Hit water goal 7 days", desc_bn: "৭ দিন পানির লক্ষ্য পূরণ" },
  { key: "meal_master", emoji: "🍱", name_en: "Meal Master", name_bn: "খাবার মাস্টার", desc_en: "Logged 30 meals", desc_bn: "৩০টি খাবার লগ" },
  { key: "weight_warrior_1", emoji: "📉", name_en: "First Kilo", name_bn: "প্রথম কেজি", desc_en: "Lost 1kg", desc_bn: "১ কেজি কমেছেন" },
  { key: "weight_warrior_5", emoji: "🎯", name_en: "5kg Down", name_bn: "৫ কেজি কম", desc_en: "Lost 5kg", desc_bn: "৫ কেজি কমেছেন" },
  { key: "weight_warrior_10", emoji: "👑", name_en: "Transformation", name_bn: "রূপান্তর", desc_en: "Lost 10kg", desc_bn: "১০ কেজি কমেছেন" },
  { key: "workout_starter", emoji: "💪", name_en: "Workout Starter", name_bn: "ব্যায়াম শুরু", desc_en: "Completed 5 workouts", desc_bn: "৫টি ব্যায়াম সম্পন্ন" },
  { key: "wellness_seeker", emoji: "🧘", name_en: "Wellness Seeker", name_bn: "সুস্থতা খোঁজে", desc_en: "Logged sleep + mood 7 days", desc_bn: "৭ দিন ঘুম+মেজাজ লগ" },
];

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const getStreaksAndBadges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date();
    const since = new Date(today);
    since.setDate(since.getDate() - 120);
    const sinceIso = since.toISOString();

    const [profile, water, meals, weights, workouts, wellness, owned] = await Promise.all([
      supabase.from("profiles").select("weight_kg, water_goal_ml, current_streak, longest_streak, last_active_date").eq("id", userId).maybeSingle(),
      supabase.from("water_logs").select("amount_ml, logged_at").eq("user_id", userId).gte("logged_at", sinceIso),
      supabase.from("meal_logs").select("logged_at").eq("user_id", userId).gte("logged_at", sinceIso),
      supabase.from("weight_logs").select("weight_kg, logged_at").eq("user_id", userId).order("logged_at", { ascending: true }),
      supabase.from("workout_logs").select("logged_at").eq("user_id", userId).gte("logged_at", sinceIso),
      supabase.from("wellness_logs").select("day, sleep_hours, mood").eq("user_id", userId).gte("day", isoDate(since)),
      supabase.from("user_achievements").select("badge_key").eq("user_id", userId),
    ]);

    // Build set of active days (any log counts)
    const activeDays = new Set<string>();
    (water.data ?? []).forEach((r: any) => activeDays.add(r.logged_at.slice(0, 10)));
    (meals.data ?? []).forEach((r: any) => activeDays.add(r.logged_at.slice(0, 10)));
    (workouts.data ?? []).forEach((r: any) => activeDays.add(r.logged_at.slice(0, 10)));
    (wellness.data ?? []).forEach((r: any) => activeDays.add(r.day));

    // Streak: count consecutive days ending today (or yesterday if not logged today yet)
    let streak = 0;
    const cursor = new Date(today);
    if (!activeDays.has(isoDate(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (activeDays.has(isoDate(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const prevLongest = profile.data?.longest_streak ?? 0;
    const longest = Math.max(prevLongest, streak);

    await supabase.from("profiles").update({
      current_streak: streak,
      longest_streak: longest,
      last_active_date: activeDays.size > 0 ? isoDate(today) : null,
    }).eq("id", userId);

    // Water goal hit days
    const waterGoal = profile.data?.water_goal_ml ?? 2500;
    const waterByDay: Record<string, number> = {};
    (water.data ?? []).forEach((r: any) => {
      const d = r.logged_at.slice(0, 10);
      waterByDay[d] = (waterByDay[d] ?? 0) + (r.amount_ml ?? 0);
    });
    const waterGoalDays = Object.values(waterByDay).filter((v) => v >= waterGoal).length;

    // Wellness days with both sleep + mood
    const wellnessFull = (wellness.data ?? []).filter((r: any) => r.sleep_hours != null && r.mood != null).length;

    // Weight loss
    const sortedWeights = (weights.data ?? []).map((r: any) => Number(r.weight_kg));
    const startWeight = sortedWeights[0] ?? null;
    const nowWeight = profile.data?.weight_kg ?? sortedWeights[sortedWeights.length - 1] ?? null;
    const weightLost = startWeight && nowWeight ? Math.max(0, startWeight - Number(nowWeight)) : 0;

    const ownedKeys = new Set((owned.data ?? []).map((r: any) => r.badge_key));
    const toUnlock: string[] = [];

    const check = (key: string, cond: boolean) => {
      if (cond && !ownedKeys.has(key)) toUnlock.push(key);
    };

    check("first_step", activeDays.size >= 1);
    check("streak_3", streak >= 3);
    check("streak_7", streak >= 7 || longest >= 7);
    check("streak_30", longest >= 30);
    check("streak_100", longest >= 100);
    check("hydration_hero", waterGoalDays >= 7);
    check("meal_master", (meals.data ?? []).length >= 30);
    check("weight_warrior_1", weightLost >= 1);
    check("weight_warrior_5", weightLost >= 5);
    check("weight_warrior_10", weightLost >= 10);
    check("workout_starter", (workouts.data ?? []).length >= 5);
    check("wellness_seeker", wellnessFull >= 7);

    if (toUnlock.length > 0) {
      await supabase.from("user_achievements").insert(
        toUnlock.map((k) => ({ user_id: userId, badge_key: k })),
      );
    }

    const allOwned = new Set([...ownedKeys, ...toUnlock]);

    return {
      streak,
      longest,
      unlocked: Array.from(allOwned),
      newlyUnlocked: toUnlock,
      totalBadges: ALL_BADGES.length,
    };
  });
