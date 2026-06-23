import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { HeroButton } from "@/components/hero-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bmiCategory, calcBMI, calcDailyCalories, GOAL_LABEL,
  idealWeightRange, type Activity, type Gender, type Goal,
} from "@/lib/health";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Activity as ActIcon, Apple, Droplet, Dumbbell, Flame, MessageCircle, Salad, Scale, Sparkles, Target, RefreshCw, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useServerFn } from "@tanstack/react-start";
import { getDailyInsight, getWeeklyReport } from "@/lib/coach.functions";
import ReactMarkdown from "react-markdown";
import { StreakBadges } from "@/components/streak-badges";
import { ProgressForecast } from "@/components/progress-forecast";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · NutriFit" }] }),
  component: Dashboard,
});

type Profile = {
  name: string | null; age: number | null; gender: Gender | null;
  height_cm: number | null; weight_kg: number | null;
  activity_level: Activity | null; goal: Goal | null;
  onboarded: boolean; water_goal_ml: number | null;
};
type WeightLog = { weight_kg: number; logged_at: string };

function Dashboard() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [waterToday, setWaterToday] = useState(0);
  const [caloriesToday, setCaloriesToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newWeight, setNewWeight] = useState("");

  useEffect(() => { void refresh(); }, []);

  async function refresh() {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) { setLoading(false); return; }
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const [{ data: p }, { data: ws }, { data: water }, { data: meals }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userRes.user.id).maybeSingle(),
      supabase.from("weight_logs").select("weight_kg, logged_at").eq("user_id", userRes.user.id).order("logged_at", { ascending: true }).limit(60),
      supabase.from("water_logs").select("amount_ml").eq("user_id", userRes.user.id).gte("logged_at", start.toISOString()),
      supabase.from("meal_logs").select("calories").eq("user_id", userRes.user.id).gte("logged_at", start.toISOString()),
    ]);
    setProfile(p as Profile | null);
    setLogs((ws ?? []) as WeightLog[]);
    setWaterToday((water ?? []).reduce((s, w) => s + (w.amount_ml ?? 0), 0));
    setCaloriesToday((meals ?? []).reduce((s, m) => s + (m.calories ?? 0), 0));
    setLoading(false);

    if (p && !p.onboarded) navigate({ to: "/onboarding" });
  }

  const metrics = useMemo(() => {
    if (!profile?.height_cm || !profile.weight_kg || !profile.age || !profile.gender) return null;
    const bmi = calcBMI(Number(profile.weight_kg), Number(profile.height_cm));
    const cat = bmiCategory(bmi);
    const [minIdeal, maxIdeal] = idealWeightRange(Number(profile.height_cm));
    const kcal = calcDailyCalories(
      Number(profile.weight_kg), Number(profile.height_cm), Number(profile.age),
      profile.gender, profile.activity_level ?? "moderate", profile.goal ?? "maintain",
    );
    return { bmi, cat, minIdeal, maxIdeal, kcal };
  }, [profile]);

  async function logWeight() {
    const w = Number(newWeight);
    if (!w || w < 20 || w > 300) return toast.error(lang === "bn" ? "সঠিক ওজন লিখুন" : "Enter a valid weight");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("weight_logs").insert({ user_id: u.user.id, weight_kg: w }),
      supabase.from("profiles").update({ weight_kg: w }).eq("id", u.user.id),
    ]);
    if (e1 || e2) return toast.error(e1?.message ?? e2?.message ?? "Failed");
    setNewWeight("");
    toast.success(lang === "bn" ? "ওজন সংরক্ষিত" : "Weight logged");
    void refresh();
  }

  if (loading) return <AppShell><div className="text-muted-foreground">Loading…</div></AppShell>;
  if (!profile) return <AppShell><div className="text-muted-foreground">No profile.</div></AppShell>;

  const chartData = logs.map((l) => ({
    date: new Date(l.logged_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    weight: Number(l.weight_kg),
  }));
  const bmiPosition = metrics ? Math.min(100, Math.max(0, ((metrics.bmi - 15) / 25) * 100)) : 0;
  const waterGoal = profile.water_goal_ml ?? 2500;
  const waterPct = Math.min(100, Math.round((waterToday / waterGoal) * 100));

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="mesh-hero rounded-3xl border border-border/60 p-5 shadow-sm sm:p-7">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{t("welcome_back")}</p>
              <h1 className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">{profile.name ?? "Friend"} 👋</h1>
              <p className="mt-1 text-xs text-muted-foreground">{lang === "bn" ? "আজকের লক্ষ্য পূরণে এগিয়ে যান।" : "Let's hit today's goals."}</p>
            </div>
            <Link to="/chat">
              <HeroButton><Sparkles className="h-4 w-4" /> {t("ai_coach")}</HeroButton>
            </Link>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<Scale className="h-4 w-4" />} label={t("current_weight")} value={`${profile.weight_kg ?? "—"} kg`} />
          <StatCard icon={<ActIcon className="h-4 w-4" />} label={t("bmi")} value={metrics ? `${metrics.bmi}` : "—"} sub={metrics?.cat.label} tone={metrics?.cat.tone} />
          <StatCard icon={<Flame className="h-4 w-4" />} label={t("daily_calories")} value={metrics ? `${metrics.kcal}` : "—"} sub="kcal target" />
          <StatCard icon={<Target className="h-4 w-4" />} label={t("goal")} value={profile.goal ? GOAL_LABEL[profile.goal] : "—"} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <StreakBadges />
          <ProgressForecast />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Link to="/water" className="surface-card flex items-center gap-4 p-5 transition-shadow hover:shadow-lg">
            <WaterMini pct={waterPct} />
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("todays_water")}</div>
              <div className="font-display text-xl font-bold">{(waterToday / 1000).toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ {(waterGoal / 1000).toFixed(1)} L</span></div>
              <div className="mt-1 text-xs text-primary">+ {t("add_water")} →</div>
            </div>
          </Link>
          <Link to="/meals" className="surface-card flex items-center gap-4 p-5 transition-shadow hover:shadow-lg">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Apple className="h-6 w-6" /></div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("todays_meals")}</div>
              <div className="font-display text-xl font-bold">{caloriesToday} <span className="text-sm font-normal text-muted-foreground">/ {metrics?.kcal ?? "—"} kcal</span></div>
              <div className="mt-1 text-xs text-primary">+ {t("add_meal")} →</div>
            </div>
          </Link>
          <Link to="/workouts" className="surface-card flex items-center gap-4 p-5 transition-shadow hover:shadow-lg">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Dumbbell className="h-6 w-6" /></div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("workouts")}</div>
              <div className="font-display text-xl font-bold">{lang === "bn" ? "শুরু করুন" : "Start today"}</div>
              <div className="mt-1 text-xs text-primary">{lang === "bn" ? "প্ল্যান দেখুন →" : "Open plan →"}</div>
            </div>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="surface-card p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">{t("weight_progress")}</h2>
              <span className="text-xs text-muted-foreground">{logs.length} {lang === "bn" ? "এন্ট্রি" : "entries"}</span>
            </div>
            <div className="mt-4 h-64">
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.60 0.18 255)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="oklch(0.60 0.18 255)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.20 0.04 260 / 8%)" />
                    <XAxis dataKey="date" stroke="oklch(0.50 0.02 250)" fontSize={11} />
                    <YAxis stroke="oklch(0.50 0.02 250)" fontSize={11} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, color: "var(--color-foreground)" }} />
                    <Area type="monotone" dataKey="weight" stroke="oklch(0.60 0.18 255)" fill="url(#g)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {lang === "bn" ? "ট্রেন্ড দেখতে কয়েকটি এন্ট্রি লগ করুন" : "Log a few entries to see your trend."}
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <Input type="number" step="0.1" placeholder={lang === "bn" ? "আজকের ওজন (kg)" : "Today's weight (kg)"} value={newWeight} onChange={(e) => setNewWeight(e.target.value)} />
              <Button onClick={logWeight}>{t("log")}</Button>
            </div>
          </div>

          <div className="surface-card space-y-4 p-6">
            <h2 className="font-display text-lg font-semibold">{t("body_status")}</h2>
            {metrics && (
              <>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">BMI</span>
                    <span className="font-medium">{metrics.bmi}</span>
                  </div>
                  <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${bmiPosition}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>Under</span><span>Normal</span><span>Over</span><span>Obese</span>
                  </div>
                </div>
                <Row label={t("ideal_weight")} value={`${metrics.minIdeal}–${metrics.maxIdeal} kg`} />
                <Row label={t("status")} value={metrics.cat.label} />
                <Row label={t("goal_calories")} value={`${metrics.kcal} kcal/day`} />
                <Link to="/onboarding" className="block">
                  <Button variant="outline" className="w-full">{t("update_profile")}</Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <AiInsightsRow />

        {metrics && metrics.cat.tone !== "success" && (
          <div className="surface-card flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="font-medium">{lang === "bn" ? "আপনার ব্যক্তিগত ডায়েট প্ল্যান তৈরি করুন" : "Generate your personalized diet plan"}</p>
              <p className="text-sm text-muted-foreground">BMI {metrics.bmi} · {GOAL_LABEL[profile.goal ?? "maintain"]}</p>
            </div>
            <Link to="/plan"><HeroButton><Salad className="h-4 w-4" /> {t("generate_plan")}</HeroButton></Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function AiInsightsRow() {
  const { lang } = useI18n();
  const daily = useServerFn(getDailyInsight);
  const weekly = useServerFn(getWeeklyReport);
  const [d, setD] = useState<string>("");
  const [w, setW] = useState<string>("");
  const [dBusy, setDBusy] = useState(false);
  const [wBusy, setWBusy] = useState(false);

  useEffect(() => {
    setDBusy(true);
    daily({ data: { lang } }).then((r) => setD(r.content)).catch(() => {}).finally(() => setDBusy(false));
  }, [lang]);

  async function refreshDaily() {
    setDBusy(true);
    try { const r = await daily({ data: { lang, force: true } }); setD(r.content); }
    catch (e) { toast.error((e as Error).message); }
    finally { setDBusy(false); }
  }
  async function loadWeekly() {
    setWBusy(true);
    try { const r = await weekly({ data: { lang } }); setW(r.content); }
    catch (e) { toast.error((e as Error).message); }
    finally { setWBusy(false); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="surface-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h3 className="font-display font-semibold">{lang === "bn" ? "আজকের AI পরামর্শ" : "Today's AI Insight"}</h3></div>
          <button onClick={refreshDaily} disabled={dBusy} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"><RefreshCw className={`h-4 w-4 ${dBusy ? "animate-spin" : ""}`} /></button>
        </div>
        <div className="prose prose-sm mt-3 max-w-none dark:prose-invert">
          {dBusy && !d ? <p className="text-muted-foreground">{lang === "bn" ? "বিশ্লেষণ করছে..." : "Analyzing your data..."}</p> : d ? <ReactMarkdown>{d}</ReactMarkdown> : <p className="text-muted-foreground">—</p>}
        </div>
      </div>
      <div className="surface-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h3 className="font-display font-semibold">{lang === "bn" ? "সাপ্তাহিক AI রিপোর্ট" : "Weekly AI Report"}</h3></div>
          {!w && (
            <Button size="sm" variant="outline" onClick={loadWeekly} disabled={wBusy}>
              {wBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : (lang === "bn" ? "তৈরি করুন" : "Generate")}
            </Button>
          )}
          {w && <button onClick={loadWeekly} disabled={wBusy} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"><RefreshCw className={`h-4 w-4 ${wBusy ? "animate-spin" : ""}`} /></button>}
        </div>
        <div className="prose prose-sm mt-3 max-w-none dark:prose-invert">
          {w ? <ReactMarkdown>{w}</ReactMarkdown> : <p className="text-muted-foreground">{lang === "bn" ? "শেষ ৭ দিনের পূর্ণ বিশ্লেষণ পেতে ক্লিক করুন।" : "Click Generate for a full 7-day analysis."}</p>}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, tone }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  tone?: "success" | "warning" | "destructive" | "muted";
}) {
  const toneColor = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "destructive" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      </div>
      <div className="mt-3 font-display text-2xl font-bold">{value}</div>
      {sub && <div className={`mt-1 text-xs ${toneColor}`}>{sub}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function WaterMini({ pct }: { pct: number }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-secondary)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-primary)" strokeWidth="6"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center"><Droplet className="h-5 w-5 text-primary" /></div>
    </div>
  );
}
