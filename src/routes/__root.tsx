import { Outlet, createRootRoute, HeadContent, Scripts, Link, useLocation } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { Onboarding } from "@/components/Onboarding";
import { installBetaSeedConsoleHook } from "@/lib/betaSeed";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass-card rounded-2xl p-10">
        <h1 className="text-7xl font-display text-gradient">404</h1>
        <h2 className="mt-3 text-xl">Página não encontrada</h2>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-xl px-4 py-2 text-sm font-medium text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Docfin — Wealth Management para Médicos" },
      { name: "description", content: "Gestão financeira premium para plantonistas: fluxo de caixa, Fator R, alocação inteligente e independência financeira." },
      { name: "theme-color", content: "#0f1726" },
      { property: "og:title", content: "Docfin — Wealth Management para Médicos" },
      { property: "og:description", content: "Gestão financeira premium para plantonistas: fluxo de caixa, Fator R, alocação inteligente e independência financeira." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Docfin — Wealth Management para Médicos" },
      { name: "twitter:description", content: "Gestão financeira premium para plantonistas: fluxo de caixa, Fator R, alocação inteligente e independência financeira." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d136b74e-3784-4992-878c-7a8fd1ba7fcb/id-preview-a70e4558--fb88fa8a-740b-475b-b7ba-dcf93b4c3e9f.lovable.app-1777585050815.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d136b74e-3784-4992-878c-7a8fd1ba7fcb/id-preview-a70e4558--fb88fa8a-740b-475b-b7ba-dcf93b4c3e9f.lovable.app-1777585050815.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Sora:wght@500;600;700&family=JetBrains+Mono:wght@400;500&family=Playfair+Display:ital,wght@1,600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark overflow-x-hidden">
      <head><HeadContent /></head>
      <body className="overflow-x-hidden">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    installBetaSeedConsoleHook();
  }, []);

  return (
    <StoreProvider>
      <OnboardingGate />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            boxShadow: "0 18px 48px rgba(2,6,23,0.28)",
          },
          classNames: {
            success: "border-primary/50 shadow-[0_0_36px_rgba(15,118,110,0.22)]",
            title: "text-sm font-semibold text-foreground",
            actionButton: "rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90",
          },
        }}
      />
    </StoreProvider>
  );
}

function RouteLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background px-5 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="premium-card rounded-3xl p-6">
          <div className="h-4 w-40 animate-pulse rounded-full bg-surface-elevated" />
          <div className="mt-5 h-9 w-64 animate-pulse rounded-xl bg-surface-elevated" />
          <div className="mt-4 h-4 max-w-xl animate-pulse rounded-full bg-surface-elevated" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="premium-card rounded-2xl p-4">
              <div className="h-3 w-28 animate-pulse rounded-full bg-surface-elevated" />
              <div className="mt-4 h-7 w-36 animate-pulse rounded-xl bg-surface-elevated" />
              <div className="mt-4 h-3 w-32 animate-pulse rounded-full bg-surface-elevated" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="premium-card rounded-2xl p-5 lg:col-span-7">
            <div className="h-5 w-48 animate-pulse rounded-full bg-surface-elevated" />
            <div className="mt-5 space-y-3">
              <div className="h-16 animate-pulse rounded-2xl bg-surface-elevated" />
              <div className="h-16 animate-pulse rounded-2xl bg-surface-elevated" />
            </div>
          </div>
          <div className="premium-card rounded-2xl p-5 lg:col-span-5">
            <div className="h-5 w-44 animate-pulse rounded-full bg-surface-elevated" />
            <div className="mt-5 h-32 animate-pulse rounded-2xl bg-surface-elevated" />
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingGate() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) logger.warn("Falha ao recuperar sessão inicial.", error);
      setSession(session);
      if (session) {
        checkOnboarding(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch(err => {
      logger.error("Erro ao recuperar sessão inicial.", err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        if (event === "SIGNED_IN" && (pathname === "/" || pathname === "/landing" || pathname === "/login")) {
          navigate({ to: "/dashboard", replace: true });
        }
        checkOnboarding(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkOnboarding(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", userId)
        .maybeSingle();
      
      if (error) {
        logger.error("Falha ao carregar perfil de onboarding.", error);
      }
      
      setOnboardingCompleted(!!profile?.onboarding_completed);
    } catch (err) {
      logger.error("Erro inesperado ao verificar onboarding.", err);
    } finally {
      setLoading(false);
    }
  }

  const isLandingPublicRoute = pathname === "/" || pathname === "/landing";
  const isStandalonePublicRoute = isLandingPublicRoute || pathname === "/planos";
  const isAuthPublicRoute = pathname === "/login";
  const isPublicRoute = isStandalonePublicRoute || isAuthPublicRoute;
  const shouldRedirectAuthenticatedPublicRoute = isLandingPublicRoute || isAuthPublicRoute;

  // Rota dedicada de impressão: bypass total (sem onboarding, sem shell).
  if (pathname === "/imprimir-relatorio") return <AppShell />;

  if (loading && !isPublicRoute) {
    return <RouteLoadingSkeleton />;
  }

  if (session && shouldRedirectAuthenticatedPublicRoute) {
    navigate({ to: "/dashboard", replace: true });
    return <RouteLoadingSkeleton />;
  }

  if (isStandalonePublicRoute) return <Outlet />;

  if (!session && !isPublicRoute) {
    navigate({ to: "/login", replace: true });
    return null;
  }

  if (session && isAuthPublicRoute) {
    navigate({ to: "/dashboard", replace: true });
    return <RouteLoadingSkeleton />;
  }

  if (isAuthPublicRoute) return <Outlet />;

  if (session && !onboardingCompleted) {
    return <Onboarding />;
  }

  return (
    <>
      <AppShell />
    </>
  );
}
