import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateGroceryList, swapMeal } from "@/lib/predictions.functions";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export function AiSmartPlanTools({ dailyCalories }: { dailyCalories?: number | null }) {
  const { lang } = useI18n();
  const groceryFn = useServerFn(generateGroceryList);
  const swapFn = useServerFn(swapMeal);

  const [groceryMd, setGroceryMd] = useState("");
  const [groceryBusy, setGroceryBusy] = useState(false);

  const [swapMealName, setSwapMealName] = useState("");
  const [swapType, setSwapType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [swapBusy, setSwapBusy] = useState(false);
  const [swapMd, setSwapMd] = useState("");

  async function makeGrocery() {
    setGroceryBusy(true); setGroceryMd("");
    try {
      const r = await groceryFn({ data: { lang } } as any);
      setGroceryMd(r.content);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setGroceryBusy(false);
    }
  }

  async function makeSwap() {
    if (swapMealName.trim().length < 2) return;
    setSwapBusy(true); setSwapMd("");
    try {
      const target = swapType === "breakfast" ? 350 : swapType === "lunch" ? 600 : swapType === "dinner" ? 500 : 200;
      const r = await swapFn({ data: {
        currentMeal: swapMealName,
        mealType: swapType,
        targetCalories: Math.round((dailyCalories ?? 2000) * (target / 2000)),
        lang,
      } } as any);
      setSwapMd(r.content);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSwapBusy(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* AI Grocery List with prices */}
      <div className="surface-card overflow-hidden">
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-4 w-4 text-green-600" />
            <h3 className="font-display text-sm font-semibold">
              {lang === "bn" ? "AI স্মার্ট বাজার লিস্ট (দাম সহ)" : "AI Smart Grocery (with prices)"}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {lang === "bn" ? "সাপ্তাহিক plan থেকে complete shopping list, আনুমানিক ৳দাম সহ।" : "Complete weekly shopping list with estimated ৳ prices."}
          </p>
          <Button onClick={makeGrocery} disabled={groceryBusy} size="sm" className="w-full">
            {groceryBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {lang === "bn" ? "বানানো হচ্ছে..." : "Generating..."}</> : <><Sparkles className="mr-2 h-4 w-4" /> {lang === "bn" ? "লিস্ট তৈরি করুন" : "Generate List"}</>}
          </Button>
          {groceryMd && (
            <div className="prose prose-sm dark:prose-invert mt-4 max-h-96 overflow-y-auto rounded-lg bg-background/60 p-3 text-sm">
              <ReactMarkdown>{groceryMd}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      {/* Meal Swap */}
      <div className="surface-card overflow-hidden">
        <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            <h3 className="font-display text-sm font-semibold">
              {lang === "bn" ? "খাবার পছন্দ না? বদলে নিন" : "Don't like a meal? Swap it"}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {lang === "bn" ? "যে খাবার পছন্দ না সেটা লিখুন — AI ৩টা বিকল্প দেবে।" : "Type a meal you don't like — AI suggests 3 alternatives."}
          </p>
          <div className="flex gap-2 mb-2">
            <select
              value={swapType}
              onChange={(e) => setSwapType(e.target.value as any)}
              className="rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="breakfast">{lang === "bn" ? "নাস্তা" : "Breakfast"}</option>
              <option value="lunch">{lang === "bn" ? "দুপুর" : "Lunch"}</option>
              <option value="dinner">{lang === "bn" ? "রাত" : "Dinner"}</option>
              <option value="snack">{lang === "bn" ? "স্ন্যাক্স" : "Snack"}</option>
            </select>
            <Input
              value={swapMealName}
              onChange={(e) => setSwapMealName(e.target.value)}
              placeholder={lang === "bn" ? "যেমন: ভাত-মাছ" : "e.g. rice & fish"}
              className="flex-1 text-sm"
            />
          </div>
          <Button onClick={makeSwap} disabled={swapBusy || swapMealName.trim().length < 2} size="sm" className="w-full">
            {swapBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {lang === "bn" ? "ভাবছি..." : "Thinking..."}</> : <><Sparkles className="mr-2 h-4 w-4" /> {lang === "bn" ? "বিকল্প দিন" : "Suggest swaps"}</>}
          </Button>
          {swapMd && (
            <div className="prose prose-sm dark:prose-invert mt-4 max-h-96 overflow-y-auto rounded-lg bg-background/60 p-3 text-sm">
              <ReactMarkdown>{swapMd}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
