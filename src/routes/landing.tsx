import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Command,
  Download,
  FileSpreadsheet,
  Inbox,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  component: LandingPage,
});

const NAV_ITEMS = ["Plataforma", "Fator R", "Dossiê Fiscal", "Segurança"];

const TRUST_ITEMS = [
  { label: "Dados fiscais separados por competência", value: "Competência" },
  { label: "CSV contábil pronto para auditoria", value: "Contador" },
  { label: "Fluxo de recebíveis e pendências", value: "Caixa" },
];

const FEATURE_CARDS = [
  {
    eyebrow: "Plantões",
    title: "A captura entra leve. A auditoria sai completa.",
    body: "Registre hospital, duração, transporte e observações em segundos. Depois, consolide regime fiscal, recebimento e deduções sem perder rastreabilidade.",
    icon: <Clock3 className="h-5 w-5" />,
  },
  {
    eyebrow: "Fator R",
    title: "FS12/RBT12 no centro da tomada de decisão.",
    body: "Monitore o índice de 12 meses, acompanhe folha considerada e identifique risco de Anexo V antes do fechamento mensal.",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    eyebrow: "Contabilidade",
    title: "Menos WhatsApp, mais documento fechado.",
    body: "Gere dossiê mensal, exporte CSV estruturado e entregue ao contador uma base consistente, sem rascunhos misturados.",
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
];

const FOOTER_COLUMNS = [
  {
    title: "Produto",
    links: ["Painel financeiro", "Calendário", "Recebíveis", "Dossiê fiscal"],
  },
  {
    title: "Fiscal",
    links: ["Fator R", "Simples Nacional", "Deduções", "Competência e caixa"],
  },
  {
    title: "Operação",
    links: ["Caixa de plantões", "Consolidação em lote", "CSV contábil", "Alertas"],
  },
  {
    title: "Institucional",
    links: ["Segurança", "LGPD", "Termos", "Contato"],
  },
];

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#051024] text-white">
      <HeroSection />
      <TrustSection />
      <CockpitSection />
      <FiscalSection />
      <SecuritySection />
      <FeatureSection />
      <FinalCta />
      <LandingFooter />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-[760px] border-b border-[#1E2A45] bg-[#051024] px-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_28%,rgba(0,71,187,0.22),transparent_34rem)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0F1A30]/75 to-transparent" />
      <LandingNav />

      <div className="relative mx-auto grid max-w-7xl gap-12 pb-20 pt-24 md:pt-28 lg:min-h-[680px] lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="max-w-4xl">
          <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#1E2A45] bg-[#0F1A30]/78 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-[#0047BB]" />
            Gestão patrimonial para médicos PJ
          </p>

          <h1 className="max-w-5xl font-display text-6xl font-semibold leading-[0.9] tracking-[-0.055em] text-white md:text-8xl lg:text-[7.7rem]">
            Inteligência financeira exclusiva para médicos.
          </h1>

          <p className="mt-8 max-w-2xl text-lg font-medium leading-8 text-slate-300 md:text-xl">
            O DocFin organiza plantões, recebíveis, deduções e Fator R em um painel fiscal privado, feito para transformar rotina médica em fechamento contábil confiável.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <PrimaryCta>Conhecer o painel</PrimaryCta>
            <a
              href="#fator-r"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#1E2A45] bg-[#0F1A30] px-6 text-sm font-semibold text-slate-200 transition hover:border-[#0047BB]/70 hover:text-white"
            >
              Ver blindagem fiscal
            </a>
          </div>

          <div className="mt-12 grid max-w-3xl gap-3 sm:grid-cols-3">
            {TRUST_ITEMS.map((item) => (
              <div key={item.value} className="rounded-2xl border border-[#1E2A45] bg-[#0F1A30]/72 p-4">
                <p className="font-mono text-sm font-semibold text-white">{item.value}</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

function LandingNav() {
  return (
    <header className="relative z-20 mx-auto flex h-20 max-w-7xl items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0047BB] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
          <Command className="h-4 w-4" strokeWidth={2.4} />
        </div>
        <div>
          <p className="text-base font-semibold tracking-tight text-white">DocFin</p>
          <p className="text-[9px] uppercase tracking-[0.22em] text-slate-400">Gestão Patrimonial</p>
        </div>
      </Link>

      <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
        {NAV_ITEMS.map((item) => (
          <a key={item} href={`#${slug(item)}`} className="transition hover:text-white">
            {item}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="hidden h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-slate-300 transition hover:text-white sm:inline-flex"
        >
          Entrar
          <LockKeyhole className="h-3.5 w-3.5" />
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[#051024] transition hover:bg-slate-200"
        >
          Acessar plataforma
        </Link>
      </div>
    </header>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[610px] lg:translate-y-8">
      <div className="absolute -left-6 top-14 hidden h-72 w-32 rounded-[2rem] border border-[#1E2A45] bg-[#0F1A30]/72 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:block" />
      <div className="relative rounded-[2rem] border border-[#1E2A45] bg-[#0F1A30] p-3 shadow-[0_34px_110px_rgba(0,0,0,0.35)]">
        <div className="rounded-[1.45rem] border border-[#1E2A45] bg-[#07142A] p-5">
          <div className="flex items-start justify-between gap-4 border-b border-[#1E2A45] pb-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Painel patrimonial</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Maio 2026</h2>
            </div>
            <div className="rounded-full border border-[#0047BB]/40 bg-[#0047BB]/12 px-3 py-1 text-xs font-semibold text-blue-200">
              Anexo III protegido
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-[#1E2A45] bg-[#0F1A30] p-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Resultado líquido</p>
              <p className="mt-3 font-mono text-4xl font-semibold tracking-[-0.04em] text-white">R$ 48.720</p>
              <div className="mt-6 space-y-4">
                <MetricBar label="Plantões consolidados" value="R$ 36.400" width="78%" />
                <MetricBar label="Recebíveis em aberto" value="R$ 22.100" width="52%" muted />
              </div>
            </div>

            <div className="grid gap-3">
              <HeroMiniCard icon={<BarChart3 className="h-4 w-4" />} label="Fator R" value="31,4%" />
              <HeroMiniCard icon={<FileSpreadsheet className="h-4 w-4" />} label="Dossiê" value="Pronto" />
              <HeroMiniCard icon={<BellRing className="h-4 w-4" />} label="Alertas" value="3 ações" />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {["Santa Clara", "Sírio · D+30", "Glosa revisada"].map((item) => (
              <div key={item} className="rounded-xl border border-[#1E2A45] bg-[#0B162B] px-3 py-3 text-xs font-medium text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-7 right-8 hidden rounded-2xl border border-[#1E2A45] bg-white p-4 text-[#051024] shadow-[0_18px_70px_rgba(0,0,0,0.26)] md:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Fechamento</p>
        <p className="mt-1 text-lg font-semibold">CSV contábil</p>
        <p className="mt-1 text-xs text-slate-500">sem rascunhos</p>
      </div>
    </div>
  );
}

function TrustSection() {
  return (
    <section className="border-b border-[#1E2A45] bg-[#07111F] px-5 py-28 md:py-36">
      <div className="mx-auto max-w-6xl text-center">
        <p className="text-2xl font-semibold tracking-[-0.02em] text-slate-300 md:text-3xl">
          Uma plataforma criada para o médico que precisa fechar o mês com precisão, não com memória.
        </p>
        <div className="mx-auto mt-16 grid max-w-4xl gap-5 md:grid-cols-3">
          <TrustBadge title="Fator R" body="Janela móvel FS12/RBT12 para leitura gerencial." />
          <TrustBadge title="Deduções" body="Retenções, glosas e taxas em campos auditáveis." />
          <TrustBadge title="Caixa" body="Situação de recebimento sem destruir competência." />
        </div>
      </div>
    </section>
  );
}

function CockpitSection() {
  return (
    <section id="plataforma" className="relative border-b border-[#1E2A45] bg-[#051024] px-5 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Plataforma"
          title="Controle sua operação médica como um escritório patrimonial privado."
          body="Do plantão capturado no corredor ao dossiê enviado para a contabilidade, o DocFin organiza cada decisão financeira em uma esteira clara."
          centered
        />

        <div className="relative mx-auto mt-16 max-w-6xl rounded-[2rem] border border-[#1E2A45] bg-[#0F1A30] p-4 shadow-[0_36px_120px_rgba(0,0,0,0.32)]">
          <div className="grid gap-4 rounded-[1.4rem] border border-[#1E2A45] bg-[#07142A] p-4 md:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <DarkPanel title="Caixa de plantões" icon={<Inbox className="h-4 w-4" />}>
                <InboxRow title="Hospital Santa Clara" status="Regime pendente" />
                <InboxRow title="Plantão noturno 12h" status="A receber" />
                <InboxRow title="Repasse de equipe" status="Glosa lançada" />
              </DarkPanel>
              <DarkPanel title="Calendário financeiro" icon={<CalendarDays className="h-4 w-4" />}>
                <div className="grid grid-cols-5 gap-2">
                  {["Seg", "Ter", "Qua", "Qui", "Sex"].map((day, index) => (
                    <div key={day} className={`min-h-24 rounded-xl border border-[#1E2A45] p-2 ${index === 2 ? "bg-[#0047BB]/12" : "bg-[#0F1A30]"}`}>
                      <p className="text-[10px] text-slate-400">{day}</p>
                      <div className="mt-5 h-2 rounded-full bg-[#0047BB]" />
                      {index > 1 && <div className="mt-2 h-2 rounded-full bg-slate-600/60" />}
                    </div>
                  ))}
                </div>
              </DarkPanel>
            </div>

            <div className="rounded-[1.35rem] border border-[#1E2A45] bg-[#0F1A30] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Dossiê fiscal</p>
                  <h3 className="mt-2 text-3xl font-semibold tracking-tight text-white">Fechamento de maio</h3>
                </div>
                <Download className="h-5 w-5 text-[#0047BB]" />
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <StatementCard label="Bruto PJ" value="R$ 62.400" />
                <StatementCard label="Líquido PJ" value="R$ 41.920" />
                <StatementCard label="Retenções" value="R$ 5.680" />
                <StatementCard label="CSV" value="18 linhas" />
              </div>

              <div className="mt-6 rounded-2xl border border-[#1E2A45] bg-[#07142A] p-4">
                <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                  <span>FS12/RBT12</span>
                  <span className="font-mono text-blue-200">31,4%</span>
                </div>
                <div className="h-3 rounded-full bg-[#0B162B]">
                  <div className="h-3 w-[72%] rounded-full bg-[#0047BB]" />
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-400">
                  Leitura gerencial para discussão com a contabilidade antes do fechamento definitivo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FiscalSection() {
  return (
    <section id="fator-r" className="relative min-h-[720px] border-b border-[#1E2A45] bg-[#061124] px-5 py-24 md:py-32">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,26,48,0.55),rgba(5,16,36,0.92)),radial-gradient(circle_at_50%_82%,rgba(0,71,187,0.18),transparent_34rem)]" />
      <div className="relative mx-auto max-w-6xl text-center">
        <SectionHeader
          eyebrow="Fator R"
          title="Blindagem fiscal e Fator R sob leitura contínua."
          body="O DocFin separa rascunho de registro consolidado, competência de caixa e dedução de imposto. O resultado é uma base mais limpa para o contador decidir com segurança."
          centered
        />

        <div className="mx-auto mt-14 grid max-w-4xl gap-3 sm:grid-cols-3">
          <Pill>RBT12</Pill>
          <Pill>FS12</Pill>
          <Pill>Anexo III</Pill>
        </div>

        <div className="mx-auto mt-14 max-w-4xl rounded-[2rem] border border-[#1E2A45] bg-[#0F1A30]/82 p-4 shadow-[0_34px_110px_rgba(0,0,0,0.28)]">
          <div className="grid gap-4 rounded-[1.4rem] border border-[#1E2A45] bg-[#07142A] p-5 md:grid-cols-3">
            <FiscalMetric label="Receita 12 meses" value="R$ 684.200" />
            <FiscalMetric label="Folha considerada" value="R$ 214.900" />
            <FiscalMetric label="Fator R projetado" value="31,4%" accent />
          </div>
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section id="seguranca" className="border-b border-[#1E2A45] bg-[#07111F] px-5 py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div className="max-w-xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Segurança e confiança</p>
          <h2 className="mt-6 font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-white md:text-7xl">
            O porto seguro da sua rotina financeira.
          </h2>
          <p className="mt-7 text-lg leading-8 text-slate-300">
            A proposta do DocFin é administrativa e fiscal: organizar dados, preservar histórico e reduzir improviso. Decisões tributárias continuam com revisão humana e contábil.
          </p>
          <div className="mt-9 space-y-4">
            <CheckLine>Separação explícita entre rascunhos e registros consolidados.</CheckLine>
            <CheckLine>Situação de pagamento para enxergar recebido, a receber e atrasado.</CheckLine>
            <CheckLine>Dossiê mensal preparado para conferência profissional.</CheckLine>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[560px] rounded-[2rem] border border-[#1E2A45] bg-white p-8 shadow-[0_34px_110px_rgba(0,0,0,0.3)]">
          <div className="flex min-h-[420px] items-center justify-center rounded-[1.35rem] bg-[#F8FAFC]">
            <div className="relative flex h-72 w-72 items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_28px_80px_rgba(15,23,42,0.18)]">
              <div className="absolute inset-8 rounded-[1.5rem] border border-slate-200" />
              <ShieldCheck className="h-28 w-28 text-[#0047BB]" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureSection() {
  return (
    <section id="dossie-fiscal" className="border-b border-[#1E2A45] bg-[#051024] px-5 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Sistema operacional"
          title="Uma mesa de gestão para plantão, caixa e contabilidade."
          body="Cada módulo foi desenhado para reduzir fricção operacional sem transformar o médico em analista financeiro."
          centered
        />

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {FEATURE_CARDS.map((card) => (
            <div key={card.eyebrow} className="rounded-[1.5rem] border border-[#1E2A45] bg-[#0F1A30] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.2)]">
              <div className="mb-10 flex h-11 w-11 items-center justify-center rounded-xl border border-[#1E2A45] bg-[#07142A] text-[#0047BB]">
                {card.icon}
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{card.eyebrow}</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">{card.title}</h3>
              <p className="mt-5 text-sm leading-7 text-slate-400">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-[#07111F] px-5 py-28 md:py-36">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Convite institucional</p>
        <h2 className="mt-6 font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-white md:text-7xl">
          Feche o mês com a calma de quem sabe o que sobrou.
        </h2>
        <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-300">
          Entre no painel DocFin e transforme plantões, repasses e obrigações fiscais em uma operação mensal elegante.
        </p>
        <div className="mt-10">
          <PrimaryCta>Entrar no DocFin</PrimaryCta>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-[#1E2A45] bg-[#0F1A30] px-5 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0047BB] text-white">
                <Command className="h-4 w-4" />
              </div>
              <div>
                <p className="text-base font-semibold text-white">DocFin</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Gestão Patrimonial Médica</p>
              </div>
            </div>
            <p className="mt-8 max-w-md text-sm leading-7 text-slate-400">
              Plataforma de organização financeira e fiscal para médicos. As informações exibidas são gerenciais e não substituem orientação contábil, fiscal ou jurídica.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-semibold text-white">{column.title}</h3>
                <ul className="mt-5 space-y-3 text-sm text-slate-400">
                  {column.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="transition hover:text-white">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 border-t border-[#1E2A45] pt-8 text-xs leading-6 text-slate-500">
          <p>© 2026 DocFin. Todos os direitos reservados.</p>
          <p className="mt-4 max-w-5xl">
            O DocFin apoia a gestão administrativa, financeira e fiscal do médico. A apuração tributária definitiva, enquadramentos e obrigações acessórias devem ser revisados por profissional habilitado.
          </p>
        </div>
      </div>
    </footer>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-4xl text-center" : "max-w-3xl"}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
      <h2 className="mt-5 font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-white md:text-7xl">
        {title}
      </h2>
      <p className="mt-6 text-lg leading-8 text-slate-300">{body}</p>
    </div>
  );
}

function PrimaryCta({ children }: { children: ReactNode }) {
  return (
    <Link
      to="/dashboard"
      className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0047BB] px-6 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] transition hover:bg-[#0B5DDF]"
    >
      {children}
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function MetricBar({ label, value, width, muted = false }: { label: string; value: string; width: string; muted?: boolean }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-white">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-[#0B162B]">
        <div className={`h-2 rounded-full ${muted ? "bg-slate-500/50" : "bg-[#0047BB]"}`} style={{ width }} />
      </div>
    </div>
  );
}

function HeroMiniCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#1E2A45] bg-[#0B162B] p-4">
      <div className="mb-4 text-[#0047BB]">{icon}</div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function TrustBadge({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.35rem] border border-[#1E2A45] bg-[#0F1A30] p-6 text-left">
      <BadgeCheck className="h-5 w-5 text-[#0047BB]" />
      <p className="mt-6 text-lg font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
    </div>
  );
}

function DarkPanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[1.35rem] border border-[#1E2A45] bg-[#0F1A30] p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
        <span className="text-[#0047BB]">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function InboxRow({ title, status }: { title: string; status: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-[#1E2A45] bg-[#07142A] px-3 py-3 text-xs last:mb-0">
      <span className="text-slate-300">{title}</span>
      <span className="font-mono text-blue-200">{status}</span>
    </div>
  );
}

function StatementCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#1E2A45] bg-[#07142A] p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 font-mono text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-full border border-[#1E2A45] bg-[#0F1A30]/82 px-5 py-3 text-sm font-semibold text-slate-200">
      {children}
    </div>
  );
}

function FiscalMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#1E2A45] bg-[#0F1A30] p-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className={`mt-3 font-mono text-2xl font-semibold ${accent ? "text-blue-200" : "text-white"}`}>{value}</p>
    </div>
  );
}

function CheckLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm leading-6 text-slate-300">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0047BB]" />
      <span>{children}</span>
    </div>
  );
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}
