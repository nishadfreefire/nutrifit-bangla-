import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useServerFn } from "@tanstack/react-start";
import { generateRecipe, analyzeMealPhoto } from "@/lib/coach.functions";
import { toast } from "sonner";
import { ChefHat, Camera, Loader2, Wallet } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/recipe")({
  head: () => ({ meta: [{ title: "Recipe + Photo · NutriFit" }] }),
  component: RecipePage,
});

function RecipePage() {
  const { lang } = useI18n();
  const recipe = useServerFn(generateRecipe);
  const analyze = useServerFn(analyzeMealPhoto);
  const fileRef = useRef<HTMLInputElement>(null);

  const [ingredients, setIngredients] = useState("");
  const [budget, setBudget] = useState<"low" | "mid" | "high">("mid");
  const [recipeMd, setRecipeMd] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoResult, setPhotoResult] = useState<{ name: string; calories: number; protein_g: number; meal_type: string; summary: string } | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  async function makeRecipe() {
    if (ingredients.trim().length < 2) return;
    setBusy(true); setRecipeMd("");
    try {
      const r = await recipe({ data: { ingredients, budget, lang } });
      setRecipeMd(r.content);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function onPickPhoto(file: File, logIt: boolean) {
    if (file.size > 8 * 1024 * 1024) return toast.error(lang === "bn" ? "ছবি খুব বড়" : "Image too large");
    const reader = new FileReader();
    reader.onload = async () => {
      const url = String(reader.result);
      setPhotoPreview(url);
      setPhotoBusy(true); setPhotoResult(null);
      try {
        const res = await analyze({ data: { imageDataUrl: url, lang, logIt } });
        setPhotoResult(res);
        if (logIt) toast.success(lang === "bn" ? "খাবার লগ হয়েছে" : "Meal logged");
      } catch (e) { toast.error((e as Error).message); }
      finally { setPhotoBusy(false); }
    };
    reader.readAsDataURL(file);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="mesh-hero rounded-3xl border border-border/60 p-6 shadow-sm">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {lang === "bn" ? "AI রেসিপি ও ছবি স্ক্যান" : "AI Recipe & Photo Scan"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "bn" ? "ফ্রিজে যা আছে দিয়ে রেসিপি, বা খাবারের ছবি তুলে instant ক্যালরি।" : "Cook with what you have, or scan a meal photo for instant calorie counts."}
          </p>
        </header>

        {/* Recipe AI */}
        <section className="surface-card space-y-4 p-6">
          <div className="flex items-center gap-2"><ChefHat className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-semibold">{lang === "bn" ? "রেসিপি জেনারেটর" : "Recipe Generator"}</h2></div>
          <div>
            <label className="mb-2 block text-sm font-medium">{lang === "bn" ? "যা আছে লিখুন (কমা দিয়ে)" : "Ingredients (comma separated)"}</label>
            <Input value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder={lang === "bn" ? "ভাত, ডিম, পেঁয়াজ, টমেটো" : "rice, egg, onion, tomato"} />
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium"><Wallet className="h-4 w-4" /> {lang === "bn" ? "বাজেট" : "Budget"}</label>
            <div className="grid grid-cols-3 gap-2">
              {(["low", "mid", "high"] as const).map((b) => (
                <button key={b} onClick={() => setBudget(b)} className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${budget === b ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:border-primary/40"}`}>
                  {lang === "bn" ? { low: "কম", mid: "মাঝারি", high: "বেশি" }[b] : { low: "Low", mid: "Mid", high: "High" }[b]}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={makeRecipe} disabled={busy || ingredients.trim().length < 2} className="w-full">
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {lang === "bn" ? "বানানো হচ্ছে..." : "Cooking..."}</> : (lang === "bn" ? "রেসিপি বানাও" : "Generate recipe")}
          </Button>
          {recipeMd && (
            <div className="prose prose-sm max-w-none rounded-xl border border-border bg-secondary/40 p-4 dark:prose-invert">
              <ReactMarkdown>{recipeMd}</ReactMarkdown>
            </div>
          )}
        </section>

        {/* Photo scan */}
        <section className="surface-card space-y-4 p-6">
          <div className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-semibold">{lang === "bn" ? "খাবারের ছবি স্ক্যান" : "Meal Photo Scan"}</h2></div>
          <p className="text-sm text-muted-foreground">{lang === "bn" ? "ছবি তুলুন বা আপলোড করুন — AI খাবার চিনে ক্যালরি বলবে।" : "Take or upload a photo — AI identifies the food and estimates calories."}</p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickPhoto(f, false); e.target.value = ""; }}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={photoBusy} variant="outline" className="w-full">
            {photoBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {lang === "bn" ? "বিশ্লেষণ..." : "Analyzing..."}</> : <><Camera className="mr-2 h-4 w-4" /> {lang === "bn" ? "ছবি নিন" : "Pick photo"}</>}
          </Button>

          {photoPreview && (
            <div className="grid gap-4 sm:grid-cols-2">
              <img src={photoPreview} alt="" className="aspect-square w-full rounded-xl object-cover" />
              {photoResult && (
                <div className="space-y-2 rounded-xl border border-border bg-secondary/40 p-4">
                  <div className="font-display text-lg font-semibold">{photoResult.name}</div>
                  <div className="text-xs uppercase text-muted-foreground">{photoResult.meal_type}</div>
                  <div className="text-2xl font-bold text-primary">{photoResult.calories} kcal</div>
                  {photoResult.protein_g != null && <div className="text-sm text-muted-foreground">{lang === "bn" ? "প্রোটিন" : "Protein"}: {photoResult.protein_g}g</div>}
                  <p className="text-sm">{photoResult.summary}</p>
                  <Button size="sm" className="w-full" onClick={() => { const f = (fileRef.current?.files?.[0]); if (f) void onPickPhoto(f, true); else if (photoPreview) {
                    // re-log from preview
                    fetch(photoPreview).then((r) => r.blob()).then((b) => onPickPhoto(new File([b], "meal.jpg", { type: b.type }), true));
                  } }}>
                    {lang === "bn" ? "এটি লগ করুন" : "Log this meal"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
