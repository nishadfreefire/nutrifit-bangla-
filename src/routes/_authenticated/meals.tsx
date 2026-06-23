import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Apple, Coffee, Cookie, Moon, Plus, Trash2, Utensils } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/meals")({
  head: () => ({ meta: [{ title: "Meal log · NutriFit" }] }),
  component: MealsPage,
});

type MealType = "breakfast" | "lunch" | "snack" | "dinner";
type Meal = { id: string; meal_type: MealType; name: string; calories: number; logged_at: string };

const ICONS: Record<MealType, React.ReactNode> = {
  breakfast: <Coffee className="h-4 w-4" />,
  lunch: <Utensils className="h-4 w-4" />,
  snack: <Cookie className="h-4 w-4" />,
  dinner: <Moon className="h-4 w-4" />,
};

function MealsPage() {
  const { t, lang } = useI18n();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [name, setName] = useState("");
  const [cals, setCals] = useState("");
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState<number | null>(null);

  useEffect(() => { void refresh(); }, []);

  async function refresh() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const [{ data: ml }, { data: dp }] = await Promise.all([
      supabase.from("meal_logs").select("id, meal_type, name, calories, logged_at").eq("user_id", u.user.id).gte("logged_at", start.toISOString()).order("logged_at", { ascending: true }),
      supabase.from("diet_plans").select("daily_calories").eq("user_id", u.user.id).eq("is_active", true).maybeSingle(),
    ]);
    setMeals((ml ?? []) as Meal[]);
    setGoal(dp?.daily_calories ?? null);
    setLoading(false);
  }

  async function add() {
    if (!name.trim() || !cals) return toast.error(lang === "bn" ? "খাবার ও ক্যালরি লিখুন" : "Enter name & calories");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("meal_logs").insert({ user_id: u.user.id, meal_type: mealType, name: name.trim(), calories: Number(cals) });
    if (error) return toast.error(error.message);
    setName(""); setCals("");
    toast.success(lang === "bn" ? "যোগ করা হয়েছে" : "Logged");
    void refresh();
  }

  async function remove(id: string) {
    await supabase.from("meal_logs").delete().eq("id", id);
    void refresh();
  }

  const total = meals.reduce((s, m) => s + (m.calories ?? 0), 0);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="mesh-hero rounded-3xl border border-border/60 p-6 shadow-sm sm:p-7">
          <p className="text-sm text-muted-foreground">{t("meals")}</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">{lang === "bn" ? "আজকের খাবার" : "Today's meals"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{lang === "bn" ? "যা খেয়েছেন লিখে রাখুন — ক্যালরি হিসাব হবে নিজে নিজেই।" : "Log what you eat — we'll handle the calorie math."}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <KPI label={lang === "bn" ? "গ্রহণ করা" : "Consumed"} value={`${total} kcal`} primary />
          <KPI label={lang === "bn" ? "লক্ষ্য" : "Target"} value={goal ? `${goal} kcal` : "—"} />
          <KPI label={lang === "bn" ? "বাকি" : "Remaining"} value={goal ? `${Math.max(0, goal - total)} kcal` : "—"} />
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">{t("add_meal")}</h2>
          <div className="grid gap-3 sm:grid-cols-[160px_1fr_120px_auto]">
            <div>
              <Label className="text-xs">{lang === "bn" ? "ধরন" : "Type"}</Label>
              <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">{lang === "bn" ? "সকালের নাস্তা" : "Breakfast"}</SelectItem>
                  <SelectItem value="lunch">{lang === "bn" ? "দুপুরের খাবার" : "Lunch"}</SelectItem>
                  <SelectItem value="snack">{lang === "bn" ? "স্ন্যাক" : "Snack"}</SelectItem>
                  <SelectItem value="dinner">{lang === "bn" ? "রাতের খাবার" : "Dinner"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{lang === "bn" ? "খাবার" : "Food"}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === "bn" ? "যেমন ভাত + ডাল" : "e.g. Bhaat + daal"} />
            </div>
            <div>
              <Label className="text-xs">kcal</Label>
              <Input type="number" value={cals} onChange={(e) => setCals(e.target.value)} placeholder="350" />
            </div>
            <div className="flex items-end">
              <Button className="w-full gap-2" onClick={add}><Plus className="h-4 w-4" /> {t("log")}</Button>
            </div>
          </div>
        </div>

        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">{lang === "bn" ? "লগ" : "History (today)"}</h2>
          {loading ? <p className="mt-2 text-sm text-muted-foreground">…</p> : meals.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground"><Apple className="inline h-4 w-4" /> {lang === "bn" ? "কিছু লগ করেননি" : "Nothing yet"}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {meals.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary px-3 py-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-card text-primary">{ICONS[m.meal_type]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{m.meal_type} · {new Date(m.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <div className="text-sm font-semibold">{m.calories} kcal</div>
                  <button onClick={() => remove(m.id)} className="rounded p-1.5 text-muted-foreground hover:bg-card hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function KPI({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return (
    <div className="surface-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-2xl font-bold ${primary ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
