import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getStreaksAndBadges, ALL_BADGES } from "@/lib/achievements.functions";
import { useI18n } from "@/lib/i18n";
import { Flame, Trophy, Lock } from "lucide-react";
import { toast } from "sonner";

export function StreakBadges() {
  const { lang } = useI18n();
  const fetchData = useServerFn(getStreaksAndBadges);
  const [data, setData] = useState<{ streak: number; longest: number; unlocked: string[]; newlyUnlocked: string[] } | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchData({ data: {} } as any);
        setData(res);
        if (res.newlyUnlocked.length > 0) {
          const names = res.newlyUnlocked
            .map((k) => ALL_BADGES.find((b) => b.key === k))
            .filter(Boolean)
            .map((b) => `${b!.emoji} ${lang === "bn" ? b!.name_bn : b!.name_en}`)
            .join(", ");
          toast.success(
            (lang === "bn" ? "🎉 নতুন ব্যাজ আনলক! " : "🎉 New badge unlocked! ") + names,
            { duration: 5000 },
          );
        }
      } catch {
        // silent
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) {
    return (
      <div className="surface-card p-5">
        <div className="h-24 animate-pulse rounded-xl bg-muted/30" />
      </div>
    );
  }

  const unlocked = new Set(data.unlocked);
  const sorted = [...ALL_BADGES].sort((a, b) => {
    const ua = unlocked.has(a.key) ? 0 : 1;
    const ub = unlocked.has(b.key) ? 0 : 1;
    return ua - ub;
  });
  const visible = showAll ? sorted : sorted.slice(0, 6);

  return (
    <div className="surface-card overflow-hidden">
      {/* Streak header */}
      <div className="relative bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-red-500/10 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg">
              <Flame className="h-7 w-7 text-white" fill="white" />
              {data.streak > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1 text-[10px] font-bold text-orange-600 ring-2 ring-orange-500">
                  {data.streak}
                </span>
              )}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {lang === "bn" ? "বর্তমান streak" : "Current streak"}
              </div>
              <div className="font-display text-2xl font-bold">
                {data.streak} <span className="text-sm font-normal text-muted-foreground">{lang === "bn" ? "দিন 🔥" : "days 🔥"}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
              <Trophy className="h-3 w-3" /> {lang === "bn" ? "সর্বোচ্চ" : "Best"}
            </div>
            <div className="font-display text-lg font-bold">{data.longest}</div>
          </div>
        </div>
        {data.streak === 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {lang === "bn" ? "আজ একটা log দিয়ে streak শুরু করুন!" : "Log something today to start your streak!"}
          </p>
        )}
      </div>

      {/* Badges */}
      <div className="border-t border-border/60 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold">
            {lang === "bn" ? "অর্জন" : "Achievements"}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {data.unlocked.length} / {ALL_BADGES.length}
            </span>
          </h3>
          {ALL_BADGES.length > 6 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs text-primary hover:underline"
            >
              {showAll ? (lang === "bn" ? "কম দেখান" : "Show less") : (lang === "bn" ? "সব দেখান" : "View all")}
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {visible.map((b) => {
            const got = unlocked.has(b.key);
            return (
              <div
                key={b.key}
                title={lang === "bn" ? b.desc_bn : b.desc_en}
                className={`group flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all ${
                  got
                    ? "border-primary/30 bg-primary/5 hover:scale-105 hover:shadow-md"
                    : "border-border/40 bg-muted/20 opacity-50 grayscale"
                }`}
              >
                <div className="relative text-2xl">
                  {got ? b.emoji : <Lock className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="line-clamp-2 text-[10px] font-medium leading-tight">
                  {lang === "bn" ? b.name_bn : b.name_en}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
