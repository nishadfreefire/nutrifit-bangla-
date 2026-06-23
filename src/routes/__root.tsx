import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { InstallPrompt } from "@/components/install-prompt";


import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NutriFit Bangla · AI Diet & Fitness Planner" },
      {
        name: "description",
        content: "Personalized Bangladeshi diet & fitness plans powered by AI.",
      },
      { name: "author", content: "NutriFit Bangla" },
      { property: "og:title", content: "NutriFit Bangla · AI Diet & Fitness Planner" },
      {
        property: "og:description",
        content: "Personalized Bangladeshi diet & fitness plans powered by AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0d7a5f" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "NutriFit" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  // Reminder scheduler — water/meal/sleep nudges based on time of day
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const tick = () => {
      if (localStorage.getItem("nf:reminders") !== "on") return;
      if (Notification.permission !== "granted") return;
      const lang = (localStorage.getItem("lang") as "en" | "bn") ?? "en";
      const now = new Date();
      const hour = now.getHours();
      const slot = `${now.toISOString().slice(0, 10)}:${hour}`;
      const lastKey = "nf:lastReminder";
      if (localStorage.getItem(lastKey) === slot) return;
      const messages: Record<number, { en: string; bn: string }> = {
        9: { en: "☀️ Good morning! Time for breakfast and 1 glass of water.", bn: "☀️ শুভ সকাল! নাস্তা ও ১ গ্লাস পানি খান।" },
        12: { en: "🍱 Lunch time — log it in NutriFit.", bn: "🍱 দুপুরের খাবারের সময় — NutriFit এ লগ করুন।" },
        15: { en: "💧 Hydration check — drink some water!", bn: "💧 পানি খাওয়ার সময় হয়েছে!" },
        18: { en: "🚶 Evening walk? A few minutes counts.", bn: "🚶 সন্ধ্যায় একটু হাঁটুন।" },
        21: { en: "🌙 Wind down — log today's wellness before bed.", bn: "🌙 ঘুমের আগে আজকের wellness লগ করুন।" },
      };
      const msg = messages[hour];
      if (!msg) return;
      new Notification("NutriFit", { body: msg[lang], icon: "/icon-192.png" });
      localStorage.setItem(lastKey, slot);
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <Outlet />
          <InstallPrompt />
          <Toaster richColors position="top-center" />
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>

  );
}
