import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Home, PlusCircle, TrendingUp, Wallet, Settings, ShieldCheck, Command, FileSpreadsheet, CalendarDays } from "lucide-react";
import { CACHE_BUSTER_DOCFIN } from "@/lib/buildInfo";
import { useStore } from "@/lib/store";

function getFirstName(full?: string): string {
  if (!full) return "";
  return full.trim().split(/\s+/)[0] ?? "";
}

type NavItem = {
  to: "/" | "/caixa" | "/calendario" | "/novo-registro" | "/futuro" | "/gestao" | "/patrimonio" | "/fechamento";
  label: string;
  icon: typeof Home;
};

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/caixa", label: "Ledger", icon: Wallet },
  { to: "/patrimonio", label: "Patrimônio", icon: ShieldCheck },
  { to: "/futuro", label: "Projeções", icon: TrendingUp },
  { to: "/fechamento", label: "Fechamento", icon: FileSpreadsheet },
  { to: "/gestao", label: "Gestão", icon: Settings },
];

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

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, label }) => {
                const active = pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
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
        <div className="max-w-md mx-auto grid grid-cols-7">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
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
