import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Command,
  FileSpreadsheet,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

const pillars = [
  {
    title: "Quick Capture",
    text: "Registe os seus turnos e plantões em menos de 15 segundos, diretamente no bloco operatório.",
    icon: Zap,
  },
  {
    title: "Inteligência Fiscal",
    text: "Monitorização contínua do Fator R e blindagem do Anexo III.",
    icon: ShieldCheck,
  },
  {
    title: "Contabilidade Zero-Touch",
    text: "Exportação estruturada de Dossiê Fiscal pronta para o seu escritório contábil.",
    icon: FileSpreadsheet,
  },
];

export const Route = createFileRoute("/landing")({
  component: LandingPage,
});

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="relative min-h-screen px-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,rgba(222,255,154,0.16),transparent_28%),radial-gradient(circle_at_18%_82%,rgba(218,255,222,0.08),transparent_32%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <header className="relative z-10 mx-auto flex h-20 max-w-7xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Command className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold tracking-tight">Docfin</span>
            <span className="ml-1 hidden border-l border-border pl-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
              Wealth
            </span>
          </Link>

          <Link
            to="/dashboard"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card/70 px-4 text-xs font-semibold text-foreground backdrop-blur transition hover:border-primary/40 hover:text-primary"
          >
            Acesso Restrito / Entrar
            <LockKeyhole className="h-3.5 w-3.5" />
          </Link>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 pb-16 pt-10 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:pb-24 lg:pt-4">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Private Banking para a rotina médica
            </div>

            <h1 className="font-display text-5xl font-semibold leading-[0.98] tracking-tight text-foreground md:text-7xl">
              O seu Cockpit Financeiro de Alta Performance.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              A plataforma de Wealth Management construída exclusivamente para a realidade médica.
              Separe PF de PJ, automatize o seu Dossiê Fiscal e tome controlo do seu Fator R.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/dashboard"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Iniciar Planeamento
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#arquitetura"
                className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card/50 px-6 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                Ver arquitetura financeira
              </a>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              {[
                ["PF/PJ", "separação jurídica"],
                ["Fator R", "monitorado"],
                ["CSV", "contabilidade pronta"],
              ].map(([value, label]) => (
                <div key={value} className="rounded-2xl border border-border bg-card/55 p-4 backdrop-blur">
                  <p className="font-display text-2xl text-primary">{value}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="glass-card rounded-[2rem] border border-border bg-card/80 p-5 shadow-elegant">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Cockpit mensal</p>
                  <p className="mt-1 font-display text-2xl text-foreground">Resultado líquido</p>
                </div>
                <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Anexo III OK
                </div>
              </div>

              <div className="py-7">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Bottom line consolidado</p>
                <p className="mt-2 font-display text-5xl text-primary">R$ 48.720</p>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-surface-elevated">
                  <div className="h-full w-[68%] rounded-full bg-primary" />
                </div>
                <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                  <span>Líquido PJ</span>
                  <span>Líquido PF</span>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <MetricCard title="Dossiê Fiscal" value="CSV pronto" />
                <MetricCard title="Fator R" value="31,4%" />
                <MetricCard title="Plantões" value="18/mês" />
                <MetricCard title="Patrimônio" value="DIRPF auditada" />
              </div>
            </div>

            <div className="absolute -bottom-6 -left-5 hidden w-48 rounded-2xl border border-border bg-surface-elevated/90 p-4 backdrop-blur md:block">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-semibold">Zero-Touch</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Registros consolidados viram exportação contábil estruturada.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="arquitetura" className="relative border-t border-border px-5 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Arquitetura Docfin</p>
            <h2 className="mt-3 font-display text-3xl text-foreground md:text-5xl">
              Precisão operacional, fiscal e patrimonial no mesmo terminal.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {pillars.map(({ title, text, icon: Icon }) => (
              <article key={title} className="glass-card rounded-3xl border border-border bg-card/70 p-6 transition hover:border-primary/30">
                <div className="mb-7 flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl text-foreground">{title}</h3>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-5 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-border bg-card/65 p-7 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Acesso institucional</p>
            <h2 className="mt-3 font-display text-3xl text-foreground">Entre pelo cockpit. Feche o mês com confiança.</h2>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Iniciar Planeamento
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Command className="h-4 w-4 text-primary" />
            <span>Docfin Wealth</span>
          </div>
          <div className="flex flex-wrap gap-5">
            <a href="#" className="transition hover:text-primary">Compliance</a>
            <a href="#" className="transition hover:text-primary">Segurança</a>
            <a href="#" className="transition hover:text-primary">Termos</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-elevated/70 p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{title}</span>
        <BarChart3 className="h-3.5 w-3.5 text-primary" />
      </div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
