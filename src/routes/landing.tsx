import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Command,
  Download,
  FileSpreadsheet,
  Inbox,
  LockKeyhole,
  MessageSquare,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  component: LandingPage,
});

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="border-b border-border bg-background/92 backdrop-blur">
        <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Command className="h-4 w-4" strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">DocFin</p>
              <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Private Wealth OS</p>
            </div>
          </Link>

          <Link
            to="/dashboard"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-4 text-xs font-semibold text-foreground transition duration-200 hover:border-[#d4af37]/50 hover:text-primary"
          >
            Acesso Restrito / Entrar
            <LockKeyhole className="h-3.5 w-3.5" />
          </Link>
        </header>
      </div>

      <section className="relative px-5 py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(218,255,222,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(218,255,222,0.55)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="relative mx-auto grid max-w-7xl gap-16 lg:grid-cols-[0.94fr_1.06fr] lg:items-center">
          <div>
            <p className="mb-7 max-w-max border-l-2 border-primary pl-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Wealth management para quem trabalha no limite
            </p>

            <h1 className="max-w-4xl font-display text-5xl font-light leading-[0.98] tracking-[-0.045em] text-foreground md:text-7xl">
              O fim do caos financeiro pós-plantão.
            </h1>
            <p className="mt-8 max-w-2xl text-lg font-medium leading-8 text-muted-foreground">
              O DocFin foi construído no bloco operatório para blindar o seu Anexo III, monitorar o Fator R e automatizar o seu Dossiê Fiscal. Sofisticação contábil para o médico de alta performance.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/dashboard"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-md border border-primary/50 bg-primary px-6 text-sm font-semibold text-primary-foreground transition duration-200 hover:border-[#d4af37]/70 hover:shadow-[0_0_0_1px_rgba(212,175,55,0.25)]"
              >
                Iniciar Planeamento
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#fechamento"
                className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-card px-6 text-sm font-semibold text-muted-foreground transition duration-200 hover:border-[#d4af37]/50 hover:text-foreground"
              >
                Ver fluxo contábil
              </a>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-border pt-6 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                PF/PJ separados por desenho
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Drafts fora da matemática fiscal
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Exportação CSV para contador
              </span>
            </div>
          </div>

          <HeroCockpitMockup />
        </div>
      </section>

      <StorySection
        kicker="Captura em campo"
        title="Você não precisa decidir regime fiscal às 2h47 da manhã."
        body="No corredor, depois de um plantão pesado, o que importa é registrar o fato com precisão mínima: hospital, duração e transporte. A triagem contábil fica para depois, quando houver cabeça para consolidar."
        visual={<QuickCaptureChaosMockup />}
      />

      <StorySection
        reverse
        kicker="Timeline financeira"
        title="O calendário deixa de ser agenda. Vira radar de ação."
        body="Eventos resolvidos perdem peso visual. Pendências, drafts e recebíveis aparecem primeiro. O médico abre a semana e entende onde há dinheiro parado, repasse atrasado ou lançamento incompleto."
        visual={<CalendarTimelineMockup />}
      />

      <StorySection
        id="fechamento"
        kicker="Backoffice PJ"
        title="O contador recebe dados fechados, não print bonito."
        body="O Dossiê Fiscal continua elegante para a médica, mas o escritório contábil recebe CSV idempotente, com competência, regime, ajustes, valor líquido e exclusão rigorosa de drafts."
        visual={<InboxAccountingMockup />}
      />

      <section className="px-5 py-28 md:py-36">
        <div className="mx-auto max-w-7xl border-y border-border py-16 md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-12">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Convite institucional</p>
            <h2 className="mt-5 max-w-3xl font-display text-4xl font-light leading-tight tracking-[-0.035em] md:text-6xl">
              Feche o mês com a calma de quem sabe exatamente o que sobrou.
            </h2>
          </div>
          <Link
            to="/dashboard"
            className="mt-10 inline-flex h-12 items-center justify-center gap-2 rounded-md border border-primary/50 bg-primary px-6 text-sm font-semibold text-primary-foreground transition duration-200 hover:border-[#d4af37]/70 md:mt-0"
          >
            Iniciar Planeamento
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-9">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Command className="h-4 w-4 text-primary" />
            <span>DocFin Wealth Management</span>
          </div>
          <div className="flex flex-wrap gap-6">
            <a href="#" className="transition hover:text-primary">Compliance</a>
            <a href="#" className="transition hover:text-primary">Segurança</a>
            <a href="#" className="transition hover:text-primary">Termos</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function StorySection({
  id,
  kicker,
  title,
  body,
  visual,
  reverse = false,
}: {
  id?: string;
  kicker: string;
  title: string;
  body: string;
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <section id={id} className="px-5 py-24 md:py-36">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center">
        <div className={`max-w-xl ${reverse ? "lg:order-2" : ""}`}>
          <p className="border-l-2 border-primary pl-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {kicker}
          </p>
          <h2 className="mt-6 font-display text-4xl font-light leading-tight tracking-[-0.035em] md:text-6xl">
            {title}
          </h2>
          <p className="mt-6 text-base font-medium leading-8 text-muted-foreground">
            {body}
          </p>
        </div>
        <div className={reverse ? "lg:order-1" : ""}>{visual}</div>
      </div>
    </section>
  );
}

function HeroCockpitMockup() {
  return (
    <div className="relative">
      <div className="border border-border bg-card p-3 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="border border-border bg-surface p-5">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Cockpit mensal</p>
              <p className="mt-1 text-sm font-semibold text-foreground">Dra. Thais · Maio 2026</p>
            </div>
            <div className="border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Anexo III validado
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
            <div className="border border-border bg-card p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Resultado consolidado</p>
              <p className="mt-3 font-mono text-4xl font-semibold tracking-[-0.03em] text-primary">R$ 48.720</p>
              <div className="mt-6 space-y-3">
                <ValueRow label="Líquido PJ" value="R$ 31.480" width="72%" />
                <ValueRow label="Líquido PF" value="R$ 17.240" width="46%" muted />
              </div>
            </div>
            <div className="space-y-3">
              <MiniPanel icon={<ShieldCheck className="h-4 w-4" />} label="Fator R" value="31,4%" />
              <MiniPanel icon={<FileSpreadsheet className="h-4 w-4" />} label="Dossiê Fiscal" value="CSV pronto" />
              <MiniPanel icon={<CalendarDays className="h-4 w-4" />} label="A receber" value="R$ 22.100" />
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {["Plantão Sírio · D+30", "Repasse Santa Clara", "DIRPF revisada"].map((item) => (
              <div key={item} className="border border-border bg-surface-elevated px-3 py-3 text-xs text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 -right-4 hidden border border-[#d4af37]/35 bg-[#d4af37]/10 px-4 py-3 text-xs text-[#e7d48a] md:block">
        Fechamento sem WhatsApp
      </div>
    </div>
  );
}

function QuickCaptureChaosMockup() {
  const messages = [
    "thais, qtas horas foi o plantao de ontem?",
    "foi no Santa Clara ou no São Lucas?",
    "manda o uber depois",
    "repasse cai dia 10 ou 20?",
  ];

  return (
    <div className="grid gap-5 md:grid-cols-[0.92fr_1.08fr] md:items-center">
      <div className="border border-border bg-surface p-4 shadow-[0_18px_56px_rgba(0,0,0,0.25)]">
        <div className="border border-border bg-card p-4">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold">Quick Capture</span>
            </div>
            <span className="text-[10px] text-muted-foreground">15 segundos</span>
          </div>
          <FieldPreview label="Hospital / Local" value="Santa Clara Anestesia" />
          <FieldPreview label="Duração / Procedimento" value="12h · centro cirúrgico" />
          <div className="mt-3 border border-primary/30 bg-primary/10 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-primary">Transporte Privado</span>
              <span className="font-mono text-primary">R$ 86,00</span>
            </div>
          </div>
          <button className="mt-5 h-10 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            Salvar como pendência
          </button>
        </div>
      </div>

      <div className="border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          <span className="text-xs font-semibold">O fluxo antigo</span>
        </div>
        <div className="space-y-3">
          {messages.map((message, index) => (
            <div
              key={message}
              className={`max-w-[88%] border border-border bg-surface-elevated px-3 py-2 text-xs leading-5 text-muted-foreground ${index % 2 ? "ml-auto" : ""}`}
            >
              {message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarTimelineMockup() {
  const days = [
    { day: "Seg", label: "Resolvido", ghost: true },
    { day: "Ter", label: "Draft", active: true },
    { day: "Qua", label: "A receber", money: "R$ 2.400" },
    { day: "Qui", label: "Plantão", money: "R$ 3.100" },
    { day: "Sex", label: "Pago", ghost: true },
  ];

  return (
    <div className="border border-border bg-card p-4 shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
      <div className="border border-border bg-surface p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Foco da semana</p>
            <p className="mt-1 text-lg font-semibold">Timeline de ações financeiras</p>
          </div>
          <div className="border border-primary/25 bg-primary/10 px-3 py-2 text-right">
            <p className="text-[10px] text-muted-foreground">Próximos 7 dias</p>
            <p className="font-mono text-sm text-primary">R$ 8.900</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          {days.map((item) => (
            <div
              key={item.day}
              className={`min-h-32 border p-3 transition ${item.active ? "border-[#d4af37]/45 bg-[#d4af37]/10" : "border-border bg-card"} ${item.ghost ? "opacity-45" : ""}`}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{item.day}</p>
              <p className="mt-5 text-sm font-semibold">{item.label}</p>
              {item.money && <p className="mt-2 font-mono text-xs text-primary">{item.money}</p>}
              {item.active && <span className="mt-4 inline-block border border-[#d4af37]/45 px-2 py-1 text-[10px] text-[#e7d48a]">triagem</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InboxAccountingMockup() {
  return (
    <div className="relative border border-border bg-surface p-4 shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
      <div className="border border-border bg-card p-5">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Inbox de consolidação</span>
          </div>
          <span className="border border-border px-2 py-1 text-[10px] text-muted-foreground">8 pendências</span>
        </div>

        <div className="space-y-3">
          <AuditRow label="Hospital Santa Clara" value="regime pendente" tone="warning" />
          <AuditRow label="Plantão 12h · Uber Black" value="R$ 3.400" />
          <AuditRow label="Previsão de recebimento" value="D+30" />
        </div>

        <div className="mt-5 border border-primary/30 bg-primary/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Depois da consolidação</p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">Exportar para o contador</p>
              <p className="mt-1 text-xs text-muted-foreground">Somente registros consolidados entram no CSV.</p>
            </div>
            <Download className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueRow({ label, value, width, muted = false }: { label: string; value: string; width: string; muted?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value}</span>
      </div>
      <div className="h-2 bg-surface-elevated">
        <div className={`h-full ${muted ? "bg-muted-foreground/35" : "bg-primary"}`} style={{ width }} />
      </div>
    </div>
  );
}

function MiniPanel({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between text-primary">
        {icon}
        <BarChart3 className="h-3.5 w-3.5 opacity-60" />
      </div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function FieldPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 border border-border bg-surface-elevated px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function AuditRow({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "warning" }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-border bg-surface-elevated px-3 py-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${tone === "warning" ? "text-[#e7d48a]" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
