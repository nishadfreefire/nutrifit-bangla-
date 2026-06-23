import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { HeroButton } from "@/components/hero-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Activity, Gender, Goal } from "@/lib/health";
import { ACTIVITY_LABEL, GOAL_LABEL } from "@/lib/health";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Your profile · NutriFit" }] }),
  component: Onboarding,
});

function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  if (inch === 12) return { ft: ft + 1, inch: 0 };
  return { ft, inch };
}
function ftInToCm(ft: number, inch: number): number {
  return Math.round(ft * 30.48 + inch * 2.54);
}

function Onboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState<Gender>("male");
  const [feet, setFeet] = useState<number | "">("");
  const [inch, setInch] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");
  const [activity, setActivity] = useState<Activity>("moderate");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [targetWeight, setTargetWeight] = useState<number | "">("");
  const [weeklyPace, setWeeklyPace] = useState<number | "">(0.5);


  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userRes.user.id)
        .maybeSingle();
      if (data) {
        setName(data.name ?? "");
        setAge(data.age ?? "");
        setGender((data.gender as Gender) ?? "male");
        if (data.height_cm) {
          const { ft, inch: i } = cmToFtIn(Number(data.height_cm));
          setFeet(ft);
          setInch(i);
        }
        setWeight(data.weight_kg ?? "");
        setActivity((data.activity_level as Activity) ?? "moderate");
        setGoal((data.goal as Goal) ?? "maintain");
        setTargetWeight(data.target_weight_kg ?? "");
        setWeeklyPace(data.weekly_change_kg ?? 0.5);
      }
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!age || feet === "" || inch === "" || !weight) {
      toast.error("Please fill in age, height, and weight.");
      return;
    }
    const heightCm = ftInToCm(Number(feet), Number(inch));
    if (heightCm < 100 || heightCm > 230) {
      toast.error("Please enter a realistic height.");
      return;
    }
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Not signed in");
      const needsTarget = goal === "weight_loss" || goal === "weight_gain";
      const { error } = await supabase
        .from("profiles")
        .update({
          name,
          age: Number(age),
          gender,
          height_cm: heightCm,
          weight_kg: Number(weight),
          activity_level: activity,
          goal,
          target_weight_kg: needsTarget && targetWeight !== "" ? Number(targetWeight) : null,
          weekly_change_kg: needsTarget && weeklyPace !== "" ? Number(weeklyPace) : null,
          onboarded: true,
        })
        .eq("id", userRes.user.id);
      if (error) throw error;
      // First weight log
      await supabase.from("weight_logs").insert({
        user_id: userRes.user.id,
        weight_kg: Number(weight),
      });
      toast.success("Profile saved");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }


  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-bold">Tell us about you</h1>
        <p className="mt-1 text-muted-foreground">
          We'll calculate your BMI and craft a plan around your goal.
        </p>

        {loading ? (
          <div className="mt-10 text-center text-muted-foreground">Loading…</div>
        ) : (
          <form onSubmit={save} className="glass-card mt-8 space-y-5 p-6 md:p-8">
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Age">
                <Input
                  type="number"
                  min={10}
                  max={100}
                  value={age}
                  onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")}
                  required
                />
              </Field>
              <Field label="Gender">
                <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Height">
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Input
                      type="number"
                      min={3}
                      max={7}
                      placeholder="Feet"
                      value={feet}
                      onChange={(e) => setFeet(e.target.value ? Number(e.target.value) : "")}
                      required
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ft</span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={11}
                      placeholder="Inch"
                      value={inch}
                      onChange={(e) => setInch(e.target.value ? Number(e.target.value) : "")}
                      required
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">in</span>
                  </div>
                </div>
              </Field>
              <Field label="Weight (kg)">
                <Input
                  type="number"
                  min={30}
                  max={250}
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : "")}
                  required
                />
              </Field>
            </div>
            <Field label="Activity level">
              <Select value={activity} onValueChange={(v) => setActivity(v as Activity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {ACTIVITY_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Goal">
              <Select value={goal} onValueChange={(v) => setGoal(v as Goal)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(GOAL_LABEL) as Goal[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {GOAL_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {(goal === "weight_loss" || goal === "weight_gain") && (
              <div className="grid gap-5 sm:grid-cols-2 rounded-xl border border-border/60 bg-muted/30 p-4">
                <Field label={goal === "weight_loss" ? "Target weight (kg) — কত কেজি হতে চান" : "Target weight (kg) — কত কেজি চান"}>
                  <Input
                    type="number"
                    min={30}
                    max={250}
                    step="0.1"
                    placeholder={weight ? String(weight) : "e.g. 65"}
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value ? Number(e.target.value) : "")}
                  />
                  {weight && targetWeight !== "" && weeklyPace !== "" && Number(weeklyPace) > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      ≈ {Math.ceil(Math.abs(Number(weight) - Number(targetWeight)) / Number(weeklyPace))} weeks to reach goal
                    </p>
                  ) : null}
                </Field>
                <Field label="Weekly pace (kg/week) — প্রতি সপ্তাহে">
                  <Select
                    value={String(weeklyPace)}
                    onValueChange={(v) => setWeeklyPace(Number(v))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.25">0.25 kg — slow & safe</SelectItem>
                      <SelectItem value="0.5">0.5 kg — recommended</SelectItem>
                      <SelectItem value="0.75">0.75 kg — aggressive</SelectItem>
                      <SelectItem value="1">1 kg — very aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <HeroButton type="submit" disabled={saving} className="flex-1">
                {saving ? "Saving…" : "Save & continue"}
              </HeroButton>
              <Button type="button" variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
