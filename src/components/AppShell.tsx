import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  Building2,
  CalendarDays,
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
import { useStore } from "@/lib/store";

function getFirstName(full?: string): string {
  if (!full) return "";
  return full.trim().split(/\s+/)[0] ?? "";
}

type NavItem = {
  to:
    | "/"
    | "/caixa"
    | "/calendario"
    | "/documentos"
    | "/empresa"
    | "/fechamento"
    | "/futuro"
    | "/gestao"
    | "/novo-registro"
    | "/patrimonio"
    | "/vida-financeira";
  label: string;
  icon: typeof Home;
};

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Hoje",
    items: [
      { to: "/", label: "Dashboard", icon: Home },
    ],
  },
  {
    label: "Operação Médica",
    items: [
      { to: "/calendario", label: "Calendário", icon: CalendarDays },
      { to: "/caixa", label: "Recebíveis", icon: Wallet },
    ],
  },
  {
    label: "Backoffice PJ",
    items: [
      { to: "/fechamento", label: "Dossiê Fiscal", icon: FileSpreadsheet },
      { to: "/empresa", label: "Empresa & Hospitais", icon: Building2 },
      { to: "/documentos", label: "Documentos", icon: FileText },
    ],
  },
  {
    label: "Vida PF",
    items: [
      { to: "/patrimonio", label: "Patrimônio", icon: ShieldCheck },
      { to: "/vida-financeira", label: "Vida Financeira", icon: Target },
      { to: "/futuro", label: "Projeções", icon: TrendingUp },
    ],
  },
];

const mobileNavItems: NavItem[] = [
  { to: "/", label: "Hoje", icon: Home },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/caixa", label: "Recebíveis", icon: Wallet },
  { to: "/novo-registro", label: "Novo", icon: PlusCircle },
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

export function AppShell() {
  const { pathname } = useLocation();
  const { userProfile } = useStore();
  const firstName = getFirstName(userProfile?.fullName);
  const greeting = firstName ? `Olá, Dr(a). ${firstName}` : "Olá, Doutor(a)";

  // Rota dedicada de impressão: sem chrome, sem layout.
  if (pathname === "/imprimir-relatorio") {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation — minimal, single border-b */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="h-6 w-6 rounded-md bg-foreground text-background flex items-center justify-center">
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

            <nav className="hidden xl:flex items-center gap-3">
              {navGroups.map((group) => (
                <div key={group.label} className="flex items-center gap-1 border-l border-border/70 pl-3 first:border-l-0 first:pl-0">
                  <span className="hidden 2xl:inline text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70 mr-1">
                    {group.label}
                  </span>
                  {group.items.map(({ to, label }) => {
                    const active = pathname === to;
                    return (
                      <Link
                        key={to}
                        to={to}
                        className={`px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                          active
                            ? "text-foreground bg-secondary"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        }`}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <nav className="hidden md:flex xl:hidden items-center gap-1">
              {[
                { to: "/", label: "Hoje" },
                { to: "/calendario", label: "Calendário" },
                { to: "/caixa", label: "Recebíveis" },
                { to: "/fechamento", label: "Dossiê" },
                { to: "/gestao", label: "Mais" },
              ].map(({ to, label }) => {
                const active = pathname === to || (to === "/gestao" && moreRoutes.has(pathname));
                return (
                  <Link
                    key={to}
                    to={to as NavItem["to"]}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      active
                        ? "text-foreground bg-secondary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm font-medium text-slate-300 tracking-tight">
              {greeting}
            </span>
            <Link
              to="/novo-registro"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition-all duration-200"
            >
              <PlusCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
              Novo registro
            </Link>
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
          {mobileNavItems.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to === "/gestao" && moreRoutes.has(pathname));
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center py-2.5 transition-all duration-200 ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                <span className="text-[10px] font-medium mt-1 tracking-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
