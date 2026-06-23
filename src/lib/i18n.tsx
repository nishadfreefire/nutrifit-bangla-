import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "bn";

type Dict = Record<string, { en: string; bn: string }>;

const DICT: Dict = {
  dashboard: { en: "Dashboard", bn: "ড্যাশবোর্ড" },
  diet_plan: { en: "Diet Plan", bn: "ডায়েট প্ল্যান" },
  workouts: { en: "Workouts", bn: "ওয়ার্কআউট" },
  meals: { en: "Meals", bn: "খাবার লগ" },
  water: { en: "Water", bn: "পানি" },
  ai_coach: { en: "AI Coach", bn: "এআই কোচ" },
  profile: { en: "Profile", bn: "প্রোফাইল" },
  sign_out: { en: "Sign out", bn: "লগ আউট" },

  welcome_back: { en: "Welcome back", bn: "স্বাগতম" },
  current_weight: { en: "Current weight", bn: "বর্তমান ওজন" },
  bmi: { en: "BMI", bn: "বিএমআই" },
  daily_calories: { en: "Daily calories", bn: "দৈনিক ক্যালরি" },
  goal: { en: "Goal", bn: "লক্ষ্য" },
  weight_progress: { en: "Weight progress", bn: "ওজনের অগ্রগতি" },
  log: { en: "Log", bn: "যোগ করুন" },
  body_status: { en: "Body status", bn: "শরীরের অবস্থা" },
  ideal_weight: { en: "Ideal weight", bn: "আদর্শ ওজন" },
  status: { en: "Status", bn: "অবস্থা" },
  goal_calories: { en: "Goal calories", bn: "ক্যালরি লক্ষ্য" },
  update_profile: { en: "Update profile", bn: "প্রোফাইল আপডেট" },

  todays_water: { en: "Today's water", bn: "আজকের পানি" },
  todays_meals: { en: "Today's meals", bn: "আজকের খাবার" },
  consumed: { en: "Consumed", bn: "গ্রহণ" },
  remaining: { en: "Remaining", bn: "বাকি" },
  add_meal: { en: "Add meal", bn: "খাবার যোগ" },
  add_water: { en: "Add water", bn: "পানি যোগ" },

  generate_plan: { en: "Generate plan", bn: "প্ল্যান তৈরি করুন" },
  generate_workout: { en: "Generate workout plan", bn: "ওয়ার্কআউট তৈরি" },
  no_plan_yet: { en: "No plan yet — generate one to get started.", bn: "এখনো কোনো প্ল্যান নেই — শুরু করতে একটি তৈরি করুন।" },

  ask_anything: { en: "Ask anything about diet, fitness, or your plan…", bn: "ডায়েট, ফিটনেস বা প্ল্যান নিয়ে যেকোনো প্রশ্ন করুন…" },
  send: { en: "Send", bn: "পাঠান" },
  ai_greeting: {
    en: "Hi! I'm your NutriFit coach. Ask me about Bangladeshi diet, calories, recipes, or workouts.",
    bn: "হাই! আমি আপনার NutriFit কোচ। বাংলাদেশি ডায়েট, ক্যালরি, রেসিপি বা ওয়ার্কআউট নিয়ে জিজ্ঞেস করুন।",
  },
  clear_chat: { en: "Clear chat", bn: "চ্যাট মুছুন" },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: keyof typeof DICT) => string };
const I18nCtx = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => DICT[k]?.en ?? String(k) });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("lang") as Lang | null;
    if (stored === "en" || stored === "bn") setLangState(stored);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem("lang", l);
  };
  const t = (key: keyof typeof DICT) => DICT[key]?.[lang] ?? String(key);
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);
