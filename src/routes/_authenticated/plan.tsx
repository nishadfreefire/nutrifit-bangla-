import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { HeroButton } from "@/components/hero-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { generateDietPlan, type DietPlan, type Meal } from "@/lib/diet.functions";
import { useI18n } from "@/lib/i18n";
import {
  Check,
  Coffee,
  Cookie,
  Droplet,
  Flame,
  Moon,
  Printer,
  RefreshCw,
  ShoppingBasket,
  Sparkles,
  Sun,
  Sunset,
  Timer,
  Utensils,
  Wheat,
  Lightbulb,
} from "lucide-react";
import { AiSmartPlanTools } from "@/components/ai-plan-tools";

function useMealDone(planId: string | null, day: number, slot: string) {
  const key = planId ? `meal-done:${planId}:${day}:${slot}` : "";
  const [done, setDone] = useState<boolean>(() => {
    if (!key || typeof window === "undefined") return false;
    return window.localStorage.getItem(key) === "1";
  });
  useEffect(() => {
    if (!key || typeof window === "undefined") return;
    setDone(window.localStorage.getItem(key) === "1");
  }, [key]);
  const toggle = () => {
    if (!key) return;
    const next = !done;
    setDone(next);
    if (next) window.localStorage.setItem(key, "1");
    else window.localStorage.removeItem(key);
  };
  return { done, toggle };
}

function useDayProgress(planId: string | null, day: number, slots: string[]) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onStorage = () => setTick((t) => t + 1);
    window.addEventListener("storage", onStorage);
    const id = window.setInterval(onStorage, 600);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
    };
  }, []);
  if (!planId) return { done: 0, total: slots.length };
  let done = 0;
  for (const s of slots) {
    if (window.localStorage.getItem(`meal-done:${planId}:${day}:${s}`) === "1") done++;
  }
  return { done, total: slots.length, tick };
}


export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({ meta: [{ title: "Diet Plan · NutriFit" }] }),
  component: PlanPage,
});

type Budget = "low" | "medium" | "high";

function PlanPage() {
  const { lang } = useI18n();
  const [budget, setBudget] = useState<Budget>("medium");
  const [duration, setDuration] = useState<number>(7);
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState(true);
  const generate = useServerFn(generateDietPlan);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return;
      const { data } = await supabase
        .from("diet_plans")
        .select("id, title, plan, budget, duration_days")
        .eq("user_id", userRes.user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setPlan(data.plan as unknown as DietPlan);
        setPlanId(data.id as string);
        setTitle(data.title);
        setBudget(data.budget as Budget);
        setDuration(data.duration_days);
      }
      setInitial(false);
    })();
  }, []);

  async function onGenerate() {
    setLoading(true);
    try {
      const res = await generate({ data: { budget, durationDays: duration, language: lang } });
      setPlan(res.plan);
      setPlanId(res.id as string);
      setTitle(`${duration}-day ${budget} budget plan`);
      toast.success("Your fresh plan is ready 🌿");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  }



  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        {/* Header */}
        <div className="mesh-hero rounded-3xl border border-border/60 p-6 shadow-sm sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {lang === "bn" ? "AI কোচ · দেশি খাবার" : "AI Coach · Local food"}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {lang === "bn" ? "আপনার ডায়েট প্ল্যান" : "Your diet plan"}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            {lang === "bn"
              ? "সহজ ভাষায়, ঘরের পরিমাপে — কখন কী খাবেন সব বলে দিচ্ছি। বাজেট আর সময় বাছুন, বাকিটা AI করে দিবে।"
              : "Simple language, household portions — we tell you what to eat and when. Pick a budget and duration, the AI handles the rest."}
          </p>
        </div>

        {/* Controls */}
        <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label={lang === "bn" ? "বাজেট" : "Budget"}>
              <Select value={budget} onValueChange={(v) => setBudget(v as Budget)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">💸 {lang === "bn" ? "কম বাজেট — ~৳150/দিন" : "Low — ~৳150/day"}</SelectItem>
                  <SelectItem value="medium">🍱 {lang === "bn" ? "মাঝারি — ~৳300/দিন" : "Medium — ~৳300/day"}</SelectItem>
                  <SelectItem value="high">🥗 {lang === "bn" ? "বেশি — ~৳500+/দিন" : "High — ~৳500+/day"}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={lang === "bn" ? "সময়কাল" : "Duration"}>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">{lang === "bn" ? "৭ দিন" : "7 days"}</SelectItem>
                  <SelectItem value="15">{lang === "bn" ? "১৫ দিন" : "15 days"}</SelectItem>
                  <SelectItem value="30">{lang === "bn" ? "৩০ দিন" : "30 days"}</SelectItem>
                  <SelectItem value="60">{lang === "bn" ? "৬০ দিন" : "60 days"}</SelectItem>
                  <SelectItem value="90">{lang === "bn" ? "৯০ দিন" : "90 days"}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <HeroButton onClick={onGenerate} disabled={loading} className="h-11 w-full rounded-xl sm:w-auto">
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {lang === "bn" ? "রান্না হচ্ছে…" : "Cooking…"}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {plan
                    ? lang === "bn" ? "নতুন বানাও" : "Regenerate"
                    : lang === "bn" ? "প্ল্যান বানাও" : "Generate plan"}
                </>
              )}
            </HeroButton>
          </div>
        </div>



        {/* Loading skeleton during generation */}
        {loading && <PlanSkeleton />}

        {initial && !plan && !loading && (
          <div className="text-center text-sm text-muted-foreground">Loading…</div>
        )}

        {!initial && !plan && !loading && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Utensils className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-semibold">No plan yet</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Make sure your{" "}
              <Link to="/onboarding" className="font-medium text-primary underline">
                profile
              </Link>{" "}
              is complete, then tap Generate to get your first plan.
            </p>
          </div>
        )}

        {plan && !loading && <PlanView title={title} plan={plan} planId={planId} />}
      </div>
    </AppShell>
  );
}

function PlanView({ title, plan, planId }: { title: string; plan: DietPlan; planId: string | null }) {
  const { lang } = useI18n();
  const days = plan.days ?? [];
  const [activeDay, setActiveDay] = useState<string>(String(days[0]?.day ?? 1));

  return (
    <div className="space-y-6">
      {/* Summary hero */}
      <div className="mesh-hero relative overflow-hidden rounded-3xl border border-border/60 p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {lang === "bn" ? "আপনার ব্যক্তিগত প্ল্যান" : "Your personal plan"}
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {plan.summary}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <Stat
            tint="primary"
            label={lang === "bn" ? "দৈনিক ক্যালরি" : "Daily kcal"}
            value={plan.daily_calories?.toLocaleString() ?? "—"}
            icon={<Flame className="h-4 w-4" />}
          />
          <Stat label={lang === "bn" ? "প্রোটিন" : "Protein"} value={`${plan.macros?.protein_g ?? "—"} g`} icon={<Wheat className="h-4 w-4" />} />
          <Stat label={lang === "bn" ? "পানি" : "Water"} value={`${plan.hydration_liters ?? "—"} L`} icon={<Droplet className="h-4 w-4" />} />
          <Stat label={lang === "bn" ? "ব্যায়াম" : "Exercise"} value={plan.routine?.exercise ?? "—"} />
        </div>

        {plan.routine && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="chip"><Sun className="h-3 w-3" /> {lang === "bn" ? "ঘুম থেকে" : "Wake"} {plan.routine.wake_up}</span>
            <span className="chip"><Moon className="h-3 w-3" /> {lang === "bn" ? "ঘুম" : "Sleep"} {plan.routine.sleep}</span>
          </div>
        )}
      </div>

      {/* Tips + Grocery */}
      <div className="grid gap-4 md:grid-cols-2">
        {plan.tips && plan.tips.length > 0 && (
          <Panel icon={<Lightbulb className="h-4 w-4" />} title={lang === "bn" ? "সহজ টিপস" : "Simple tips"} tint="amber">
            <ul className="space-y-2 text-sm">
              {plan.tips.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="text-muted-foreground">{t}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {plan.grocery_list && plan.grocery_list.length > 0 && (
          <Panel icon={<ShoppingBasket className="h-4 w-4" />} title={lang === "bn" ? "বাজার তালিকা" : "Grocery list"} tint="primary">
            <div className="flex flex-wrap gap-2">
              {plan.grocery_list.map((g, i) => (
                <Badge key={i} variant="secondary" className="rounded-full font-normal">
                  {g}
                </Badge>
              ))}
            </div>
          </Panel>
        )}
      </div>

      {/* AI Smart tools: grocery list with prices + meal swap */}
      <AiSmartPlanTools dailyCalories={plan.daily_calories} />


      {/* Day tabs */}
      <div className="rounded-3xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur sm:p-5">
        <Tabs value={activeDay} onValueChange={setActiveDay} className="w-full">
          <div className="-mx-1 overflow-x-auto pb-2">
            <TabsList className="inline-flex w-auto gap-1 bg-muted/60 p-1">
              {days.map((d) => (
                <TabsTrigger
                  key={d.day}
                  value={String(d.day)}
                  className="rounded-lg px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Day {d.day}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {days.map((d) => (
            <TabsContent key={d.day} value={String(d.day)} className="mt-5 animate-fade-in">
              <DayView day={d} planId={planId} />
            </TabsContent>
          ))}

        </Tabs>
      </div>

      <div className="flex justify-center pt-2">
        <Button variant="outline" onClick={() => window.print()} className="gap-2 rounded-full">
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </Button>
      </div>
    </div>
  );
}

function DayView({ day, planId }: { day: DietPlan["days"][number]; planId: string | null }) {
  const { lang } = useI18n();
  const meals = useMemo(
    () => [
      { key: "breakfast", labelBn: "নাস্তা", labelEn: "Breakfast", defaultTime: "8:00 AM", icon: <Coffee className="h-4 w-4" />, meal: day.breakfast },
      { key: "mid_morning", labelBn: "হালকা খাবার", labelEn: "Snack", defaultTime: "11:00 AM", icon: <Cookie className="h-4 w-4" />, meal: day.mid_morning },
      { key: "lunch", labelBn: "দুপুরের খাবার", labelEn: "Lunch", defaultTime: "1:30 PM", icon: <Utensils className="h-4 w-4" />, meal: day.lunch },
      { key: "evening_snack", labelBn: "বিকেলের নাস্তা", labelEn: "Evening", defaultTime: "5:00 PM", icon: <Sunset className="h-4 w-4" />, meal: day.evening_snack },
      { key: "dinner", labelBn: "রাতের খাবার", labelEn: "Dinner", defaultTime: "8:30 PM", icon: <Moon className="h-4 w-4" />, meal: day.dinner },
    ],
    [day],
  );

  const totalKcal = meals.reduce((s, m) => s + (m.meal?.kcal ?? 0), 0);
  const totalProtein = meals.reduce((s, m) => s + (m.meal?.protein_g ?? 0), 0);
  const slots = meals.filter((m) => m.meal).map((m) => m.key);
  const { done, total } = useDayProgress(planId, day.day, slots);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 font-display font-bold text-primary-foreground shadow-sm">
            {day.day}
          </div>
          <div>
            <div className="font-display text-lg font-semibold">{lang === "bn" ? "দিন" : "Day"} {day.day}</div>
            {day.theme && <div className="text-xs text-muted-foreground">{day.theme}</div>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip"><Flame className="h-3 w-3" /> {totalKcal} kcal</span>
          <span className="chip"><Wheat className="h-3 w-3" /> {totalProtein} g {lang === "bn" ? "প্রোটিন" : "protein"}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-2xl border border-border/60 bg-card/70 p-3 sm:p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">{lang === "bn" ? "আজকের অগ্রগতি" : "Today's progress"}</span>
          <span className="font-semibold text-primary">{done}/{total} ✓ · {pct}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {day.notes && (
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/70 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          💡 {day.notes}
        </div>
      )}

      {/* Timeline */}
      <ol className="relative space-y-3 pl-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-primary/30 before:via-border before:to-transparent">
        {meals.map((m) => (
          <MealRow
            key={m.key}
            slot={m.key}
            planId={planId}
            dayNum={day.day}
            label={lang === "bn" ? m.labelBn : m.labelEn}
            labelEn={lang === "bn" ? m.labelEn : m.labelBn}
            time={m.meal?.time ?? m.defaultTime}
            icon={m.icon}
            meal={m.meal}
            emoji={mealEmoji(m.key, m.meal)}
          />
        ))}
      </ol>
    </div>
  );
}



function MealRow({
  slot,
  planId,
  dayNum,
  label,
  labelEn,
  time,
  icon,
  meal,
  emoji,
}: {
  slot: string;
  planId: string | null;
  dayNum: number;
  label: string;
  labelEn: string;
  time: string;
  icon: React.ReactNode;
  meal: Meal | undefined;
  emoji: string;
}) {
  const { lang } = useI18n();
  const { done, toggle } = useMealDone(planId, dayNum, slot);
  if (!meal) return null;
  return (
    <li className="relative">
      {/* timeline dot */}
      <span
        className={`absolute -left-[15px] top-5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background ring-2 transition ${
          done ? "ring-emerald-500" : "ring-primary/40"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${done ? "bg-emerald-500" : "bg-primary"}`} />
      </span>

      <div
        className={`hover-lift group rounded-2xl border bg-card p-4 sm:p-5 transition ${
          done ? "border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20" : "border-border/60"
        }`}
      >
        <div className="flex items-start gap-4">
          {/* Emoji avatar */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent text-3xl transition-transform group-hover:scale-105 sm:h-16 sm:w-16 sm:text-4xl">
            {emoji}
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                <span className="opacity-80">{icon}</span>
                {label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Timer className="h-3 w-3" />
                {time}
              </span>
              <span className="text-[11px] text-muted-foreground/70">· {labelEn}</span>
            </div>

            <div className={`font-semibold leading-snug ${done ? "line-through opacity-70" : ""}`}>
              {meal.name}
            </div>
            <p className={`text-[13px] leading-relaxed sm:text-sm ${done ? "text-muted-foreground/70 line-through" : "text-muted-foreground"}`}>
              {meal.description}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Flame className="h-3 w-3" />
                {meal.kcal} kcal
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Wheat className="h-3 w-3" />
                {meal.protein_g} g
              </span>
              {meal.prep_minutes ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Timer className="h-3 w-3" />
                  {meal.prep_minutes} min
                </span>
              ) : null}
            </div>

            {meal.ingredients && meal.ingredients.length > 0 && (
              <details className="pt-1 text-xs">
                <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
                  {lang === "bn" ? "উপকরণ দেখুন" : "View ingredients"} ({meal.ingredients.length})
                </summary>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {meal.ingredients.map((ing, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </details>
            )}

            {/* Done toggle */}
            <button
              type="button"
              onClick={toggle}
              className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                done
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "border border-border bg-background hover:border-primary hover:text-primary"
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              {done
                ? lang === "bn" ? "খেয়েছি ✓" : "Done ✓"
                : lang === "bn" ? "খেয়েছি? টিক দিন" : "Mark as eaten"}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}



function mealEmoji(slot: string, meal: Meal | undefined): string {
  const text = `${meal?.name ?? ""} ${meal?.description ?? ""}`.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => text.includes(k));
  if (has("ilish", "rui", "fish", "মাছ")) return "🐟";
  if (has("chicken", "মুরগি", "মুরগী")) return "🍗";
  if (has("egg", "ডিম")) return "🍳";
  if (has("roti", "ruti", "রুটি", "paratha", "bread")) return "🫓";
  if (has("daal", "dal", "lentil", "ডাল")) return "🥣";
  if (has("rice", "bhaat", "ভাত", "khichuri", "polao", "biriyani")) return "🍚";
  if (has("yogurt", "doi", "দই", "milk", "দুধ")) return "🥛";
  if (has("fruit", "banana", "mango", "papaya", "apple", "কলা", "আম", "পেপে")) return "🍎";
  if (has("salad", "শাক", "vegetable", "veg", "শসা", "tomato")) return "🥗";
  if (has("oats", "muri", "cereal", "মুড়ি")) return "🥣";
  if (has("tea", "চা", "coffee")) return "☕";
  if (has("nut", "peanut", "almond", "বাদাম")) return "🥜";
  if (slot === "breakfast") return "🌅";
  if (slot === "mid_morning") return "🍌";
  if (slot === "lunch") return "🍛";
  if (slot === "evening_snack") return "🍵";
  if (slot === "dinner") return "🍽️";
  return "🍽️";
}

function PlanSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tint?: "primary";
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        tint === "primary"
          ? "border-primary/30 bg-primary/5"
          : "border-border/60 bg-background/50"
      }`}
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function Panel({
  title,
  icon,
  tint,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tint: "primary" | "amber";
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            tint === "amber"
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </div>
        <div className="font-display font-semibold">{title}</div>
      </div>
      {children}
    </div>
  );
}
