import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallPrompt() {
  const { lang } = useI18n();
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem("install-dismissed") === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show || !evt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl sm:bottom-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-sm">
            {lang === "bn" ? "App হিসেবে install করুন" : "Install as App"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {lang === "bn" ? "Home screen এ যোগ করুন — fast access।" : "Add to home screen for quick access."}
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={async () => {
                await evt.prompt();
                await evt.userChoice;
                setShow(false);
                setEvt(null);
              }}
            >
              {lang === "bn" ? "Install" : "Install"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                window.localStorage.setItem("install-dismissed", "1");
                setShow(false);
              }}
            >
              {lang === "bn" ? "পরে" : "Later"}
            </Button>
          </div>
        </div>
        <button
          onClick={() => setShow(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
