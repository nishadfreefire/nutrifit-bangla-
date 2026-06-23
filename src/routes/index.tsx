import { createFileRoute, Link } from "@tanstack/react-router";
import { HeroButton } from "@/components/hero-button";
import { Apple, Dumbbell, Droplet, HeartPulse, MessageCircle, Sparkles, Utensils } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NutriFit Bangla · AI Diet & Fitness Planner" },
      { name: "description", content: "Personalized Bangladeshi diet, fitness & water tracking with an AI coach. Bangla & English." },
      { property: "og:title", content: "NutriFit Bangla · AI Diet & Fitness Planner" },
      { property: "og:description", content: "Diet, workouts, water & AI coach — built for Bangladesh." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { lang, setLang } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Dumbbell className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold">NutriFit Bangla</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-full border border-border bg-secondary p-0.5 text-xs font-semibold">
            <button
              onClick={() => setLang("en")}
              className={`rounded-full px-3 py-1 transition-colors ${lang === "en" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("bn")}
              className={`rounded-full px-3 py-1 transition-colors ${lang === "bn" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              বাংলা
            </button>
          </div>
          <Link to="/auth">
            <HeroButton variant="ghostHero">{lang === "bn" ? "লগ ইন" : "Sign in"}</HeroButton>
          </Link>
        </div>
      </header>


      <main className="mx-auto max-w-6xl px-6">
        <section className="grid gap-12 py-12 md:grid-cols-2 md:py-20">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> {lang === "bn" ? "AI চালিত · বাংলাদেশের জন্য" : "AI-powered · Made for Bangladesh"}
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
              {lang === "bn" ? (
                <>আপনার <span className="text-primary">ডায়েট</span>, ওয়ার্কআউট<br className="hidden sm:inline"/> ও কোচ — এক অ্যাপেই।</>
              ) : (
                <>Your <span className="text-primary">diet</span>, workouts &<br className="hidden sm:inline"/> coach — in one app.</>
              )}
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
              {lang === "bn"
                ? "ব্যক্তিগত বাংলাদেশি মিল প্ল্যান, ঘর/জিম ওয়ার্কআউট, পানি ট্র্যাকার আর বাংলা/ইংরেজি AI কোচ — আপনার BMI, বাজেট ও লক্ষ্য অনুযায়ী।"
                : "Personalized Bangladeshi meal plans, home/gym workouts, water tracking and a Bangla/English AI coach — all tuned to your BMI, budget and goal."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth"><HeroButton size="lg">{lang === "bn" ? "ফ্রি শুরু করুন" : "Start free"}</HeroButton></Link>
              <a href="#features"><HeroButton size="lg" variant="ghostHero">{lang === "bn" ? "ফিচার দেখুন" : "See features"}</HeroButton></a>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 text-sm">
              <Stat n="100%" label={lang === "bn" ? "দেশি খাবার" : "Local foods"} />
              <Stat n="EN/বাং" label={lang === "bn" ? "দ্বিভাষিক" : "Bilingual"} />
              <Stat n="24/7" label={lang === "bn" ? "AI কোচ" : "AI coach"} />
            </div>

          </div>

          <div className="relative">
            <div className="surface-card relative overflow-hidden p-6">
              <div className="absolute left-0 top-0 h-1 w-full bg-primary" />
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Today</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">On track</span>
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <div className="font-display text-5xl font-bold text-primary">22.4</div>
                  <div className="text-sm text-muted-foreground">BMI · Normal</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-display text-2xl font-semibold">1,840</div>
                  <div className="text-xs text-muted-foreground">kcal target</div>
                </div>
              </div>
              <div className="mt-6 space-y-2.5">
                <Meal icon={<Utensils className="h-4 w-4" />} time="08:00" name="Roti + dim bhaji + doi" kcal={420} />
                <Meal icon={<Apple className="h-4 w-4" />} time="11:00" name="Banana + peanuts" kcal={210} />
                <Meal icon={<Utensils className="h-4 w-4" />} time="13:30" name="Bhaat + daal + rui maach" kcal={680} />
                <Meal icon={<Utensils className="h-4 w-4" />} time="19:30" name="Roti + sobji + murgi" kcal={530} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-border bg-secondary p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Droplet className="h-3.5 w-3.5 text-primary" /> Water</div>
                  <div className="mt-1 font-display text-lg font-bold">1.8 / 2.5 L</div>
                </div>
                <div className="rounded-lg border border-border bg-secondary p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Dumbbell className="h-3.5 w-3.5 text-primary" /> Workout</div>
                  <div className="mt-1 font-display text-lg font-bold">Day 3 ✓</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="grid gap-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
          <Feature icon={<HeartPulse className="h-5 w-5" />} title={lang === "bn" ? "স্মার্ট BMI ও ক্যালরি" : "Smart BMI & calorie engine"} desc={lang === "bn" ? "Mifflin–St Jeor হিসাব, আদর্শ ওজন, লক্ষ্য অনুযায়ী টার্গেট।" : "Mifflin–St Jeor math, ideal weight range, and a target tuned to your goal."} />
          <Feature icon={<Utensils className="h-5 w-5" />} title={lang === "bn" ? "বাংলাদেশি মিল প্ল্যান" : "Bangladeshi meal plans"} desc={lang === "bn" ? "ভাত, রুটি, মাছ, ডাল, সবজি — কম/মাঝারি/বেশি বাজেট, AI বানানো।" : "Rice, roti, fish, daal, sobji — low/medium/high budget, AI-generated."} />
          <Feature icon={<Dumbbell className="h-5 w-5" />} title={lang === "bn" ? "ঘর ও জিম ওয়ার্কআউট" : "Home & gym workouts"} desc={lang === "bn" ? "২–৬ দিনের রুটিন, সেট-রেপ ও বার্ন হওয়া ক্যালরি।" : "2–6 day routines with sets, reps & calories burned per session."} />
          <Feature icon={<Droplet className="h-5 w-5" />} title={lang === "bn" ? "পানি ট্র্যাকার" : "Hydration tracker"} desc={lang === "bn" ? "দৈনিক লক্ষ্য, দ্রুত-যোগ বোতাম, সুন্দর প্রগ্রেস রিং।" : "Daily water goal, quick-add buttons, beautiful progress ring."} />
          <Feature icon={<Apple className="h-5 w-5" />} title={lang === "bn" ? "মিল লগিং" : "Meal logging"} desc={lang === "bn" ? "প্রতিটা মিল লগ করুন, আজকের ক্যালরি বনাম লক্ষ্য দেখুন।" : "Log every meal, see today's calories versus your target instantly."} />
          <Feature icon={<MessageCircle className="h-5 w-5" />} title={lang === "bn" ? "বাংলা/ইংরেজি AI কোচ" : "Bangla/English AI coach"} desc={lang === "bn" ? "ডায়েট, রেসিপি বা ট্রেনিং নিয়ে — বাংলায় বা ইংরেজিতে জিজ্ঞেস করুন।" : "Ask anything about diet, recipes, or training — in Bangla or English."} />
        </section>

        <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} NutriFit Bangla
        </footer>
      </main>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-bold text-foreground">{n}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Meal({ icon, time, name, kcal }: { icon: React.ReactNode; time: string; name: string; kcal: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-card text-primary">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{time}</div>
      </div>
      <div className="shrink-0 text-sm font-semibold text-foreground">{kcal} kcal</div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="surface-card p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
