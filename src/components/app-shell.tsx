import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Apple,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Salad,
  Droplet,
  UserCog,
  Menu,
  X,
  Sparkles,
  MoreHorizontal,
  Moon,
  Sun,
  Heart,
  ChefHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";


type NavItemDef = { to: string; icon: ReactNode; label: string };

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const router = useRouter();
  const { lang, setLang, t } = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);


  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  const nav: NavItemDef[] = [
    { to: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" />, label: t("dashboard") },
    { to: "/plan", icon: <Salad className="h-4 w-4" />, label: t("diet_plan") },
    { to: "/meals", icon: <Apple className="h-4 w-4" />, label: t("meals") },
    { to: "/workouts", icon: <Dumbbell className="h-4 w-4" />, label: t("workouts") },
    { to: "/water", icon: <Droplet className="h-4 w-4" />, label: t("water") },
    { to: "/wellness", icon: <Heart className="h-4 w-4" />, label: lang === "bn" ? "সুস্থতা" : "Wellness" },
    { to: "/recipe", icon: <ChefHat className="h-4 w-4" />, label: lang === "bn" ? "রেসিপি AI" : "Recipe AI" },
    { to: "/chat", icon: <MessageCircle className="h-4 w-4" />, label: t("ai_coach") },
    { to: "/onboarding", icon: <UserCog className="h-4 w-4" />, label: t("profile") },
  ];

  // Pick the 4 primary tabs for the bottom bar + a "More" entry that opens the drawer.
  const bottomTabs: NavItemDef[] = [
    { to: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" />, label: t("dashboard") },
    { to: "/plan", icon: <Salad className="h-5 w-5" />, label: t("diet_plan") },
    { to: "/meals", icon: <Apple className="h-5 w-5" />, label: t("meals") },
    { to: "/workouts", icon: <Dumbbell className="h-5 w-5" />, label: t("workouts") },
    { to: "/chat", icon: <MessageCircle className="h-5 w-5" />, label: t("ai_coach") },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Dumbbell className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-bold">NutriFit</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {nav.map((n) => (
            <NavItem key={n.to} to={n.to} icon={n.icon}>
              {n.label}
            </NavItem>
          ))}
        </nav>
        <div className="space-y-2 border-t border-border p-4">
          <LangToggle lang={lang} setLang={setLang} />
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> {t("sign_out")}
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur md:h-16 md:px-8"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="-ml-1 rounded-lg p-2 hover:bg-secondary md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground md:hidden">
              <Dumbbell className="h-4 w-4" />
            </div>
            <span className="truncate font-display font-bold md:hidden">NutriFit</span>
          </div>

          <div className="min-w-0" />

          <div className="flex items-center gap-2">
            <Link to="/chat" className="hidden md:block">
              <Button size="sm" variant="ghost" className="gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> {t("ai_coach")}
              </Button>
            </Link>
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <LangToggle compact lang={lang} setLang={setLang} />
          </div>

        </header>

        {/* Main content — bottom padding clears the mobile tab bar */}
        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-6">
          {bottomTabs.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              activeProps={{ className: "text-primary" }}
              className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-95"
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </Link>
          ))}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-95"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Mobile drawer (more menu) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-foreground/40 animate-fade-in" />
          <aside
            className="absolute left-0 top-0 h-full w-72 animate-slide-in-right bg-card p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Dumbbell className="h-4 w-4" />
                </div>
                <span className="font-display text-lg font-bold">NutriFit</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {nav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMobileOpen(false)}
                  activeProps={{ className: "bg-primary/10 text-primary" }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {n.icon}
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6 space-y-2 border-t border-border pt-4">
              <LangToggle lang={lang} setLang={setLang} />
              <Button variant="ghost" className="w-full justify-start gap-2" onClick={signOut}>
                <LogOut className="h-4 w-4" /> {t("sign_out")}
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function LangToggle({
  lang,
  setLang,
  compact,
}: {
  lang: "en" | "bn";
  setLang: (l: "en" | "bn") => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center rounded-full border border-border bg-secondary p-0.5 text-xs font-semibold ${compact ? "" : "w-full justify-center"}`}
    >
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
  );
}

function NavItem({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      activeProps={{ className: "bg-primary/10 text-primary" }}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {icon}
      {children}
    </Link>
  );
}
