import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "docfin.pwa.install.dismissed.v1";

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneDisplayMode()) return;

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // Registration failure should never block the product experience.
        });
      }, { once: true });
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const dismissed = window.localStorage.getItem(DISMISS_KEY) === "true";
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setVisible(!dismissed);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setVisible(false);
      window.localStorage.setItem(DISMISS_KEY, "true");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setVisible(false);
    if (choice.outcome === "dismissed") {
      window.localStorage.setItem(DISMISS_KEY, "true");
    }
  }

  function dismiss() {
    setVisible(false);
    window.localStorage.setItem(DISMISS_KEY, "true");
  }

  if (!visible || !installPrompt) return null;

  return (
    <aside
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[70] mx-auto max-w-md rounded-2xl border border-primary/30 bg-card/95 p-3 text-foreground shadow-2xl shadow-primary/20 backdrop-blur-2xl sm:bottom-5 sm:right-5 sm:left-auto sm:mx-0"
      aria-label="Instalar aplicativo DocFin"
    >
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
          <Smartphone className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Instalar DocFin App</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Abra o DocFin direto da tela inicial, com carregamento rápido e visual de app nativo.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={installApp}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Instalar
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border px-4 text-xs font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              Agora não
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          aria-label="Fechar aviso de instalação"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
