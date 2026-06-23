import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { predictProgress } from "@/lib/predictions.functions";
import { useI18n } from "@/lib/i18n";
import { TrendingDown, TrendingUp, Minus, Sparkles } from "lucide-react";

export function ProgressForecast() {
  const { lang } = useI18n();
  const predict = useServerFn(predictProgress);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await predict({ data: {} } as any);
        setData(res);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="surface-card p-5"><div className="h-32 animate-pulse rounded-xl bg-muted/30" /></div>;
  }

  if (!data?.hasEnoughData) {
    return (
      <div className="surface-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-semibold">{lang === "bn" ? "AI পূর্বাভাস" : "AI Forecast"}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {lang === "bn" ? "ট্রেন্ড দেখাতে আরও কিছু weight entry প্রয়োজন।" : "Log a few more weight entries to see your forecast."}
        </p>
      </div>
    );
  }

  const TrendIcon = data.trend === "losing" ? TrendingDown : data.trend === "gaining" ? TrendingUp : Minus;
  const trendColor = data.trend === "losing" ? "text-green-600" : data.trend === "gaining" ? "text-orange-600" : "text-muted-foreground";
  const isGood = (data.goal === "lose" && data.trend === "losing") || (data.goal === "gain" && data.trend === "gaining") || (data.goal === "maintain" && data.trend === "stable");

  return (
    <div className="surface-card overflow-hidden">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-semibold">{lang === "bn" ? "AI পূর্বাভাস" : "AI Forecast"}</h3>
          </div>
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isGood ? "bg-green-500/10 text-green-700" : "bg-orange-500/10 text-orange-700"}`}>
            <TrendIcon className="h-3 w-3" />
            {data.weeklyChange > 0 ? "+" : ""}{data.weeklyChange} kg/{lang === "bn" ? "সপ্তাহ" : "wk"}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          {lang === "bn"
            ? `এই গতিতে চললে ${Math.abs(data.monthlyChange)} kg ${data.trend === "losing" ? "কমবে" : data.trend === "gaining" ? "বাড়বে" : "স্থির"} প্রতি মাসে।`
            : `At this rate, you'll ${data.trend === "losing" ? "lose" : data.trend === "gaining" ? "gain" : "stay at"} ${Math.abs(data.monthlyChange)} kg/month.`}
        </p>

        <div className="grid grid-cols-3 gap-2">
          <ForecastCell label={lang === "bn" ? "৪ সপ্তাহে" : "4 weeks"} weight={data.in4Weeks} />
          <ForecastCell label={lang === "bn" ? "৮ সপ্তাহে" : "8 weeks"} weight={data.in8Weeks} highlight />
          <ForecastCell label={lang === "bn" ? "১২ সপ্তাহে" : "12 weeks"} weight={data.in12Weeks} />
        </div>

        <div className={`mt-3 text-xs ${trendColor} font-medium`}>
          {isGood
            ? (lang === "bn" ? "✨ চমৎকার! লক্ষ্যের দিকে এগিয়ে যাচ্ছেন।" : "✨ Great pace — on track for your goal.")
            : (lang === "bn" ? "💡 আরেকটু effort দিলে দ্রুত পৌঁছাবেন।" : "💡 A bit more effort and you'll get there faster.")}
        </div>
      </div>
    </div>
  );
}

function ForecastCell({ label, weight, highlight }: { label: string; weight: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-2 text-center ${highlight ? "border-primary/40 bg-primary/5" : "border-border/40 bg-background/50"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-bold">{weight}<span className="text-xs font-normal text-muted-foreground"> kg</span></div>
    </div>
  );
}
