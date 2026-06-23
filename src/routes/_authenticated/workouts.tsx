import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { HeroButton } from "@/components/hero-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Dumbbell, Flame, Home, Sparkles, Timer } from "lucide-react";
import { generateWorkoutPlan, type WorkoutPlan } from "@/lib/workout.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/workouts")({
  head: () => ({ meta: [{ title: "Workouts · NutriFit" }] }),
  component: WorkoutsPage,
});

function WorkoutsPage() {
  const { lang, t } = useI18n();
  const [location, setLocation] = useState<"home" | "gym">("home");
  const [days, setDays] = useState(4);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState(true);
  const generate = useServerFn(generateWorkoutPlan);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("workout_plans")
        .select("title, plan, location, days_per_week")
        .eq("user_id", u.user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setPlan(data.plan as unknown as WorkoutPlan);
        setTitle(data.title);
        setLocation(data.location as "home" | "gym");
        setDays(data.days_per_week);
      }
      setInitial(false);
    })();
  }, []);

  async function onGenerate() {
    setLoading(true);
    try {
      const res = await generate({ data: { location, daysPerWeek: days } });
      setPlan(res.plan);
      setTitle(`${days}-day ${location} routine`);
      toast.success(lang === "bn" ? "প্ল্যান তৈরি!" : "Plan generated!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  }

  async function logComplete(day: string, est: number) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("workout_logs").insert({ user_id: u.user.id, day_label: day, calories_burned: est, duration_min: 45 });
    toast.success(lang === "bn" ? "✓ লগ করা হয়েছে" : "✓ Logged");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="mesh-hero rounded-3xl border border-border/60 p-6 shadow-sm sm:p-7">
          <p className="text-sm text-muted-foreground">{t("workouts")}</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">{lang === "bn" ? "ওয়ার্কআউট রুটিন" : "Workout routine"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{lang === "bn" ? "বাসায় বা জিমে — আপনার সময় ও লক্ষ্য অনুযায়ী রুটিন।" : "Home or gym — a plan that matches your time and goal."}</p>
        </div>

        <div className="surface-card p-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <Label className="text-xs">{lang === "bn" ? "অবস্থান" : "Location"}</Label>
              <Select value={location} onValueChange={(v) => setLocation(v as "home" | "gym")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">🏠 {lang === "bn" ? "বাড়িতে" : "Home"}</SelectItem>
                  <SelectItem value="gym">🏋️ {lang === "bn" ? "জিমে" : "Gym"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{lang === "bn" ? "সপ্তাহে দিন" : "Days/week"}</Label>
              <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6].map((d) => <SelectItem key={d} value={String(d)}>{d} days</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <HeroButton onClick={onGenerate} disabled={loading}>
              <Sparkles className="h-4 w-4" /> {loading ? "…" : t("generate_workout")}
            </HeroButton>
          </div>
        </div>

        {initial ? null : !plan ? (
          <div className="surface-card p-10 text-center">
            <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">{t("no_plan_yet")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="surface-card p-5">
              <p className="text-sm uppercase tracking-wider text-muted-foreground">{title}</p>
              <p className="mt-2 text-foreground">{plan.summary}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {plan.days.map((d, i) => (
                <div key={i} className="surface-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-lg font-semibold">{d.day}</h3>
                      <p className="text-xs text-muted-foreground">{d.focus}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary inline-flex items-center gap-1">
                      <Flame className="h-3 w-3" /> {d.est_calories} kcal
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Timer className="h-3.5 w-3.5" /> {d.warmup}
                  </div>
                  <ul className="mt-3 space-y-2">
                    {d.exercises.map((ex, j) => (
                      <li key={j} className="rounded-lg border border-border bg-secondary p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{ex.name}</span>
                          <span className="text-xs text-muted-foreground">{ex.sets} × {ex.reps}</span>
                        </div>
                        {ex.notes && <p className="mt-1 text-xs text-muted-foreground">{ex.notes}</p>}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">🧘 {d.cooldown}</p>
                  <Button size="sm" className="mt-4 w-full" variant="outline" onClick={() => logComplete(d.day, d.est_calories)}>
                    {lang === "bn" ? "✓ সম্পন্ন হিসেবে লগ করুন" : "✓ Mark complete"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
