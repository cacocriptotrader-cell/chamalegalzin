import { Link, Outlet, useLocation } from "@tanstack/react-router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useState } from "react";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  Command,
  FileSpreadsheet,
  FileText,
  Home,
  MoreHorizontal,
  PlusCircle,
  ShieldCheck,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { CACHE_BUSTER_DOCFIN } from "@/lib/buildInfo";
import { QuickCaptureModal } from "@/components/QuickCaptureModal";
import { useStore } from "@/lib/store";

function getFirstName(full?: string): string {
  if (!full) return "";
  return full.trim().split(/\s+/)[0] ?? "";
}

type NavItem = {
  to:
    | "/"
    | "/dashboard"
    | "/caixa"
    | "/calendario"
    | "/documentos"
    | "/empresa"
    | "/fechamento"
    | "/futuro"
    | "/gestao"
    | "/patrimonio"
    | "/vida-financeira";
  label: string;
  icon: typeof Home;
};

const primaryNavItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/caixa", label: "Recebíveis", icon: Wallet },
];

const backofficeItems: NavItem[] = [
  { to: "/fechamento", label: "Dossiê Fiscal", icon: FileSpreadsheet },
  { to: "/empresa", label: "Empresa & Hospitais", icon: Building2 },
  { to: "/documentos", label: "Documentos", icon: FileText },
];

const personalItems: NavItem[] = [
  { to: "/patrimonio", label: "Patrimônio", icon: ShieldCheck },
  { to: "/vida-financeira", label: "Vida Financeira", icon: Target },
  { to: "/futuro", label: "Projeções", icon: TrendingUp },
];

const mobileNavItems: NavItem[] = [
  { to: "/dashboard", label: "Hoje", icon: Home },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/caixa", label: "Recebíveis", icon: Wallet },
  { to: "/gestao", label: "Mais", icon: MoreHorizontal },
];

const moreRoutes = new Set([
  "/documentos",
  "/empresa",
  "/fechamento",
  "/futuro",
  "/gestao",
  "/patrimonio",
  "/vida-financeira",
]);

const isRouteActive = (pathname: string, to: string) => pathname === to;
const hasActiveRoute = (pathname: string, items: NavItem[]) => items.some((item) => isRouteActive(pathname, item.to));

export function AppShell() {
  const { pathname } = useLocation();
  const { userProfile } = useStore();
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const firstName = getFirstName(userProfile?.fullName);
  const greeting = firstName ? `Olá, Dr(a). ${firstName}` : "Olá, Doutor(a)";

  // Rota dedicada de impressão: sem chrome, sem layout.
  if (pathname === "/imprimir-relatorio") {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation — minimal, single border-b */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/85 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <div className="h-6 w-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                <Command className="h-3.5 w-3.5" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold tracking-tight">Docfin</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-l border-border pl-2 ml-1 hidden sm:inline">
                Wealth
              </span>
              <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground/60 hidden lg:inline">
                {CACHE_BUSTER_DOCFIN}
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {primaryNavItems.map(({ to, label }) => {
                const active = isRouteActive(pathname, to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      active
                        ? "text-primary bg-card"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
              <NavDropdown label="Backoffice PJ" active={hasActiveRoute(pathname, backofficeItems)} items={backofficeItems} />
              <NavDropdown label="Vida PF" active={hasActiveRoute(pathname, personalItems)} items={personalItems} />
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm font-medium text-foreground/85 tracking-tight">
              {greeting}
            </span>
            <button
              type="button"
              onClick={() => setQuickCaptureOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all duration-200"
            >
              <PlusCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
              Novo registro
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo centralizado com respiro lateral */}
      <main className="max-w-7xl mx-auto px-5 sm:px-8 md:px-10 pb-32 md:pb-20">
        <Outlet />
      </main>

      {/* Bottom tab bar — apenas mobile, estética terminal */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-md mx-auto grid grid-cols-5">
          {mobileNavItems.slice(0, 3).map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to === "/gestao" && moreRoutes.has(pathname));
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center py-2.5 transition-all duration-200 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                <span className="text-[10px] font-medium mt-1 tracking-tight">{label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setQuickCaptureOpen(true)}
            className="flex flex-col items-center justify-center py-2.5 text-primary transition-all duration-200"
          >
            <PlusCircle className="h-4 w-4" strokeWidth={2} />
            <span className="text-[10px] font-medium mt-1 tracking-tight">Novo</span>
          </button>
          {mobileNavItems.slice(3).map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to === "/gestao" && moreRoutes.has(pathname));
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center py-2.5 transition-all duration-200 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                <span className="text-[10px] font-medium mt-1 tracking-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <QuickCaptureModal open={quickCaptureOpen} onOpenChange={setQuickCaptureOpen} />
    </div>
  );
}

function NavDropdown({ label, active, items }: { label: string; active: boolean; items: NavItem[] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 outline-none ${
          active
            ? "text-primary bg-card"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        }`}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-50 min-w-56 rounded-xl border border-border bg-card/95 p-1.5 shadow-[0_20px_60px_rgba(2,6,23,0.24)] backdrop-blur"
        >
          {items.map(({ to, label, icon: Icon }) => (
            <DropdownMenu.Item key={to} asChild>
              <Link
                to={to}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground outline-none transition hover:bg-secondary/70 hover:text-foreground focus:bg-secondary/70 focus:text-foreground"
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
                {label}
              </Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
