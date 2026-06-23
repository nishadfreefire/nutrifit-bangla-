import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { HeroButton } from "@/components/hero-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Droplet, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/water")({
  head: () => ({ meta: [{ title: "Water · NutriFit" }] }),
  component: WaterPage,
});

type Log = { id: string; amount_ml: number; logged_at: string };

function WaterPage() {
  const { t, lang } = useI18n();
  const [logs, setLogs] = useState<Log[]>([]);
  const [goal, setGoal] = useState<number>(2500);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { void refresh(); }, []);

  async function refresh() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const [{ data: p }, { data: ws }] = await Promise.all([
      supabase.from("profiles").select("water_goal_ml").eq("id", u.user.id).maybeSingle(),
      supabase.from("water_logs").select("id, amount_ml, logged_at").eq("user_id", u.user.id).gte("logged_at", start.toISOString()).order("logged_at", { ascending: false }),
    ]);
    setGoal(p?.water_goal_ml ?? 2500);
    setLogs((ws ?? []) as Log[]);
    setLoading(false);
  }

  async function addAmount(ml: number) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("water_logs").insert({ user_id: u.user.id, amount_ml: ml });
    if (error) return toast.error(error.message);
    toast.success(`+${ml} ml`);
    void refresh();
  }

  async function remove(id: string) {
    await supabase.from("water_logs").delete().eq("id", id);
    void refresh();
  }

  async function updateGoal(v: number) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("profiles").update({ water_goal_ml: v }).eq("id", u.user.id);
    setGoal(v);
    toast.success("Goal updated");
  }

  const consumed = logs.reduce((sum, l) => sum + l.amount_ml, 0);
  const pct = Math.min(100, Math.round((consumed / goal) * 100));
  const remaining = Math.max(0, goal - consumed);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="mesh-hero rounded-3xl border border-border/60 p-6 shadow-sm sm:p-7">
          <p className="text-sm text-muted-foreground">{t("water")}</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">{lang === "bn" ? "পানি পান ট্র্যাকার" : "Hydration tracker"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{lang === "bn" ? "দিনে কতটুকু পানি পান করলেন দেখুন।" : "Track your daily hydration in glasses & litres."}</p>
        </div>

        <div className="surface-card grid gap-6 p-6 sm:grid-cols-[200px_1fr] sm:items-center">
          <WaterRing pct={pct} consumed={consumed} goal={goal} />
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 text-sm">
              <Stat label={t("consumed")} value={`${consumed} ml`} accent />
              <Stat label={t("remaining")} value={`${remaining} ml`} />
              <Stat label={lang === "bn" ? "লক্ষ্য" : "Goal"} value={`${goal} ml`} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[250, 500, 750].map((ml) => (
                <HeroButton key={ml} variant="outline" onClick={() => addAmount(ml)}>
                  <Plus className="h-4 w-4" /> {ml} ml
                </HeroButton>
              ))}
            </div>
            <div className="flex gap-2">
              <Input type="number" placeholder="Custom ml" value={custom} onChange={(e) => setCustom(e.target.value)} />
              <Button onClick={() => { const v = Number(custom); if (v > 0 && v < 3000) { void addAmount(v); setCustom(""); } }}>Add</Button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{lang === "bn" ? "দৈনিক লক্ষ্য" : "Daily goal"}:</span>
              <Input type="number" defaultValue={goal} onBlur={(e) => { const v = Number(e.target.value); if (v >= 500 && v <= 6000) void updateGoal(v); }} className="h-9 w-28" />
              <span className="text-xs text-muted-foreground">ml</span>
            </div>
          </div>
        </div>

        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">{lang === "bn" ? "আজকের লগ" : "Today's log"}</h2>
          {loading ? (
            <p className="mt-2 text-sm text-muted-foreground">…</p>
          ) : logs.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{lang === "bn" ? "এখনো কিছু লগ করা হয়নি।" : "Nothing logged yet."}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2 text-sm">
                  <span className="flex items-center gap-2"><Droplet className="h-4 w-4 text-primary" />{l.amount_ml} ml</span>
                  <span className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-xs">{new Date(l.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <button onClick={() => remove(l.id)} className="rounded p-1 hover:bg-card hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-lg font-bold ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function WaterRing({ pct, consumed, goal }: { pct: number; consumed: number; goal: number }) {
  const r = 76, c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-44 w-44">
      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--color-secondary)" strokeWidth="14" />
        <circle
          cx="90" cy="90" r={r} fill="none" stroke="var(--color-primary)" strokeWidth="14"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: "stroke-dashoffset 500ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <Droplet className="h-5 w-5 text-primary" />
        <div className="font-display text-3xl font-bold">{pct}%</div>
        <div className="text-xs text-muted-foreground">{consumed} / {goal} ml</div>
      </div>
    </div>
  );
}
