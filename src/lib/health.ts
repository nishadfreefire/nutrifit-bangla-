export type Gender = "male" | "female";
export type Activity = "low" | "moderate" | "high";
export type Goal = "weight_loss" | "weight_gain" | "maintain" | "muscle_gain";

export function calcBMI(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  if (!m) return 0;
  return +(weightKg / (m * m)).toFixed(1);
}

export function bmiCategory(bmi: number): {
  label: string;
  tone: "warning" | "success" | "destructive" | "muted";
} {
  if (bmi < 18.5) return { label: "Underweight", tone: "warning" };
  if (bmi < 25) return { label: "Normal weight", tone: "success" };
  if (bmi < 30) return { label: "Overweight", tone: "warning" };
  return { label: "Obese", tone: "destructive" };
}

export function idealWeightRange(heightCm: number): [number, number] {
  const m = heightCm / 100;
  return [+(18.5 * m * m).toFixed(1), +(24.9 * m * m).toFixed(1)];
}

/** Mifflin–St Jeor BMR */
export function calcBMR(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === "male" ? base + 5 : base - 161);
}

const ACTIVITY_FACTOR: Record<Activity, number> = {
  low: 1.375,
  moderate: 1.55,
  high: 1.725,
};

const GOAL_ADJUST: Record<Goal, number> = {
  weight_loss: -500,
  weight_gain: 400,
  muscle_gain: 300,
  maintain: 0,
};

export function calcDailyCalories(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
  activity: Activity,
  goal: Goal,
  weeklyChangeKg?: number | null,
): number {
  const bmr = calcBMR(weightKg, heightCm, age, gender);
  const tdee = Math.round(bmr * ACTIVITY_FACTOR[activity]);
  // If user gave a weekly pace, derive deficit/surplus dynamically (1 kg ≈ 7700 kcal).
  if (weeklyChangeKg && weeklyChangeKg !== 0) {
    const sign = goal === "weight_loss" ? -1 : 1;
    const delta = Math.round((Math.abs(weeklyChangeKg) * 7700) / 7) * sign;
    // Safe bounds: max 1000 kcal deficit, 700 kcal surplus
    const clamped = Math.max(-1000, Math.min(700, delta));
    return Math.max(1200, tdee + clamped);
  }
  return Math.max(1200, tdee + GOAL_ADJUST[goal]);
}

/** Estimated weeks to reach the target weight at the given weekly pace. */
export function weeksToGoal(currentKg: number, targetKg: number, weeklyKg: number): number | null {
  if (!weeklyKg || weeklyKg <= 0) return null;
  const diff = Math.abs(currentKg - targetKg);
  if (diff < 0.1) return 0;
  return Math.ceil(diff / weeklyKg);
}


export const GOAL_LABEL: Record<Goal, string> = {
  weight_loss: "Weight Loss",
  weight_gain: "Weight Gain",
  maintain: "Maintain Weight",
  muscle_gain: "Muscle Gain",
};

export const ACTIVITY_LABEL: Record<Activity, string> = {
  low: "Low — desk job, little exercise",
  moderate: "Moderate — light activity 3–5×/week",
  high: "High — intense training 6–7×/week",
};
