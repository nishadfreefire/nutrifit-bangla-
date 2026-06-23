import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useServerFn } from "@tanstack/react-start";
import { upsertWellness, loadWellnessWeek } from "@/lib/coach.functions";
import { toast } from "sonner";
import { Moon, Footprints, Smile, Bell, BellOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/wellness")({
  head: () => ({ meta: [{ title: "Wellness · NutriFit" }] }),
  component: WellnessPage,
});

type Row = { day: string; sleep_hours: number | null; mood: number | null; steps: number | null; notes: string | null };

const MOODS = [
  { v: 1, e: "😞" },
  { v: 2, e: "😕" },
  { v: 3, e: "😐" },
  { v: 4, e: "🙂" },
  { v: 5, e: "😄" },
];

function WellnessPage() {
  const { lang } = useI18n();
  const save = useServerFn(upsertWellness);
  const load = useServerFn(loadWellnessWeek);
  const [rows, setRows] = useState<Row[]>([]);
  const [sleep, setSleep] = useState("");
  const [steps, setSteps] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [remOn, setRemOn] = useState<boolean>(false);

  useEffect(() => {
    void refresh();
    setRemOn(typeof window !== "undefined" && localStorage.getItem("nf:reminders") === "on");
  }, []);

  async function refresh() {
    const data = (await load()) as Row[];
    setRows(data);
    const today = new Date().toISOString().slice(0, 10);
    const t = data.find((r) => r.day === today);
    if (t) {
      setSleep(t.sleep_hours?.toString() ?? "");
      setSteps(t.steps?.toString() ?? "");
      setMood(t.mood);
      setNotes(t.notes ?? "");
    }
  }

  async function submit() {
    setBusy(true);
    try {
      await save({ data: {
        sleep_hours: sleep ? Number(sleep) : null,
        steps: steps ? Number(steps) : null,
        mood: mood ?? null,
        notes: notes || null,
      } });
      toast.success(lang === "bn" ? "সংরক্ষিত!" : "Saved!");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  async function toggleReminders() {
    if (!("Notification" in window)) return toast.error("Notifications not supported");
    if (remOn) {
      localStorage.removeItem("nf:reminders");
      setRemOn(false);
      toast.success(lang === "bn" ? "রিমাইন্ডার বন্ধ" : "Reminders off");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return toast.error(lang === "bn" ? "অনুমতি দিতে হবে" : "Permission denied");
    localStorage.setItem("nf:reminders", "on");
    setRemOn(true);
    toast.success(lang === "bn" ? "পানি, খাবার ও ঘুমের রিমাইন্ডার চালু" : "Reminders enabled");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="mesh-hero rounded-3xl border border-border/60 p-6 shadow-sm">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {lang === "bn" ? "সুস্থতা ট্র্যাকার" : "Wellness Tracker"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "bn" ? "ঘুম, mood, স্টেপ লগ করুন — AI সবই বিবেচনা করবে।" : "Log sleep, mood, steps — your AI Coach uses all of it."}
          </p>
        </header>

        <div className="surface-card space-y-5 p-6">
          <h2 className="font-display text-lg font-semibold">{lang === "bn" ? "আজকের লগ" : "Today's log"}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field icon={<Moon className="h-4 w-4" />} label={lang === "bn" ? "ঘুম (ঘন্টা)" : "Sleep (hours)"}>
              <Input type="number" step="0.5" min="0" max="24" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="7.5" />
            </Field>
            <Field icon={<Footprints className="h-4 w-4" />} label={lang === "bn" ? "স্টেপ" : "Steps"}>
              <Input type="number" min="0" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="6000" />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Smile className="h-4 w-4" /> {lang === "bn" ? "Mood" : "Mood"}</div>
            <div className="flex gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.v}
                  onClick={() => setMood(m.v)}
                  className={`flex-1 rounded-xl border p-3 text-2xl transition-all ${mood === m.v ? "border-primary bg-primary/10 scale-110" : "border-border bg-secondary hover:border-primary/40"}`}
                >{m.e}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">{lang === "bn" ? "নোট (ঐচ্ছিক)" : "Notes (optional)"}</div>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={lang === "bn" ? "আজ কেমন বোধ করছেন?" : "How do you feel today?"} />
          </div>

          <Button onClick={submit} disabled={busy} className="w-full">{busy ? "..." : (lang === "bn" ? "সংরক্ষণ" : "Save")}</Button>
        </div>

        <div className="surface-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{lang === "bn" ? "শেষ ১৪ দিন" : "Last 14 days"}</h2>
            <span className="text-xs text-muted-foreground">{rows.length} {lang === "bn" ? "এন্ট্রি" : "entries"}</span>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{lang === "bn" ? "এখনো কোনো এন্ট্রি নেই।" : "No entries yet."}</p>
          ) : (
            <div className="space-y-2">
              {rows.slice().reverse().map((r) => (
                <div key={r.day} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm">
                  <span className="font-medium">{r.day}</span>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {r.sleep_hours != null && <span>💤 {r.sleep_hours}h</span>}
                    {r.steps != null && <span>👟 {r.steps}</span>}
                    {r.mood != null && <span>{MOODS.find((m) => m.v === r.mood)?.e}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface-card flex items-center justify-between p-5">
          <div className="min-w-0">
            <p className="font-medium">{lang === "bn" ? "রিমাইন্ডার" : "Reminders"}</p>
            <p className="text-xs text-muted-foreground">{lang === "bn" ? "পানি, খাবার, ঘুম — দিনে কয়েকবার মনে করিয়ে দেবে।" : "Water, meals, sleep — a few gentle reminders during the day."}</p>
          </div>
          <Button variant={remOn ? "outline" : "default"} onClick={toggleReminders}>
            {remOn ? <><BellOff className="mr-2 h-4 w-4" /> {lang === "bn" ? "বন্ধ" : "Off"}</> : <><Bell className="mr-2 h-4 w-4" /> {lang === "bn" ? "চালু করুন" : "Enable"}</>}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">{icon} {label}</div>
      {children}
    </div>
  );
}
