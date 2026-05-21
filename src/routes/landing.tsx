import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import {
  ArrowRight,
  Bot,
  Building2,
  Clock,
  FileSpreadsheet,
  LockKeyhole,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { DocFinLogo } from "@/components/DocFinLogo";

export const Route = createFileRoute("/landing")({
  component: LandingPage,
});

const navItems = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Dossiê Fiscal", href: "#dossie" },
  { label: "Concierge", href: "#concierge" },
  { label: "Segurança", href: "#seguranca" },
];

const hospitalLogos = ["Sírio-Libanês", "Albert Einstein", "Rede D'Or", "Oswaldo Cruz", "BP"];

const bentoFeatures = [
  {
    eyebrow: "Operação",
    title: "Captura em 30 segundos",
    body: "Registre hospital, duração, valor e transporte sem abrir um formulário fiscal. O plantão entra como rascunho e fica seguro no Inbox.",
    icon: <Clock className="h-5 w-5" />,
    size: "lg:col-span-7",
    metric: "30s",
    metricLabel: "tempo alvo por plantão",
  },
  {
    eyebrow: "Backoffice PJ",
    title: "Dossiê Fiscal Premium",
    body: "Transforme plantões consolidados em leitura executiva para contador, com CSV estruturado e índice tributário escondido até ser necessário.",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    size: "lg:col-span-5",
    metric: "CSV",
    metricLabel: "pronto para contabilidade",
  },
  {
    eyebrow: "Concierge",
    title: "IA via WhatsApp",
    body: "No plano Concierge, lançamentos por áudio e texto viram rascunhos acionáveis. A rotina conversa com o app sem depender de planilha.",
    icon: <Bot className="h-5 w-5" />,
    size: "lg:col-span-5",
    metric: "IA",
    metricLabel: "áudio e texto ilimitados",
  },
  {
    eyebrow: "Patrimônio",
    title: "PF e PJ sem confusão mental",
    body: "Resultado líquido, recebíveis, patrimônio e pendências aparecem separados por contexto para reduzir ruído depois de turnos longos.",
    icon: <WalletCards className="h-5 w-5" />,
    size: "lg:col-span-7",
    metric: "1",
    metricLabel: "cockpit de decisão",
  },
];

const testimonials = [
  {
    quote: "Eu não quero virar contadora depois de 12 horas de plantão. O DocFin me mostra o que fiz, o que falta receber e o que precisa ir para o escritório.",
    author: "Anestesiologista, R3",
  },
  {
    quote: "O valor não está só no dashboard bonito. Está em separar rascunho de dado consolidado antes de qualquer fechamento fiscal.",
    author: "Contador de PJ médica",
  },
];

const faqs = [
  {
    question: "O DocFin substitui meu contador?",
    answer: "Não. O DocFin organiza operação, recebíveis e evidências para que o contador feche com menos retrabalho e mais segurança.",
  },
  {
    question: "Preciso cadastrar CNPJ antes de lançar um plantão?",
    answer: "Não. O primeiro lançamento pode ser feito com hospital, duração, valor e transporte. A parte fiscal fica para a consolidação.",
  },
  {
    question: "O índice tributário é cálculo fiscal definitivo?",
    answer: "É uma projeção gerencial para decisão. A validação oficial continua sendo feita no fechamento contábil.",
  },
];

export function LandingPage() {
  return (
    <main className="premium-shell min-h-screen overflow-hidden text-foreground">
      <LandingHeader />
      <HeroSection />
      <TrustBand />
      <BentoSection />
      <WorkflowSection />
      <SecuritySection />
      <TestimonialsSection />
      <FaqSection />
      <FinalCta />
      <LandingFooter />
    </main>
  );
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <DocFinLogo className="h-10 w-[142px]" />
          <span className="hidden border-l border-border pl-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground sm:inline">
            Med-Fintech
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground lg:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-primary">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-foreground sm:inline-flex"
          >
            Entrar
          </Link>
          <Link
            to="/login"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
          >
            Comece seu Beta
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="px-5 pb-18 pt-16 md:px-8 md:pb-24 md:pt-24">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="animate-fade-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            <ShieldCheck className="h-4 w-4" />
            Wealth management para médicos
          </p>
          <h1 className="mt-7 max-w-5xl text-5xl font-semibold leading-[0.96] tracking-[-0.055em] text-foreground md:text-6xl lg:text-[4.85rem]">
            A paz de espírito fiscal que a sua rotina médica exige.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl md:leading-9">
            Capture plantões em 30 segundos, otimize impostos e deixe a burocracia no piloto automático, sem transformar o fim do mês em uma segunda jornada.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton to="/login">Comece seu Beta Gratuito</PrimaryButton>
            <SecondaryButton to="/planos">Ver Planos</SecondaryButton>
          </div>

          <div className="mt-10 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
            <HeroMetric value="30s" label="para registrar um plantão" />
            <HeroMetric value="28%" label="meta gerencial de otimização" />
            <HeroMetric value="CSV" label="dossiê para contabilidade" />
          </div>
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[600px] animate-fade-in">
      <div className="absolute -left-10 top-8 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -right-8 bottom-10 h-72 w-72 rounded-full bg-success/10 blur-3xl" />
      <div className="relative rounded-[2rem] border border-border bg-card/90 p-4 shadow-2xl shadow-primary/10 backdrop-blur">
        <div className="rounded-[1.5rem] border border-border bg-background/50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Cockpit DocFin</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Dinheiro no bolso</h2>
            </div>
            <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-success">
              Seguro
            </span>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <MockupMetric label="Resultado líquido" value="R$ 42.780" tone="success" />
            <MockupMetric label="Índice tributário" value="31,4%" tone="neutral" />
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-surface-elevated/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Inbox de plantões</p>
              <span className="text-[10px] text-muted-foreground">3 pendências</span>
            </div>
            <MockupRow hospital="Einstein" detail="12h · transporte privado" value="R$ 3.360" />
            <MockupRow hospital="Sírio-Libanês" detail="D+30 · repasse previsto" value="R$ 2.940" />
            <MockupRow hospital="Rede D'Or" detail="glosa em revisão" value="R$ 1.680" muted />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-border bg-surface/70 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Dossiê</p>
              <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-foreground">Exportado</p>
            </div>
            <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary">Concierge</p>
              <p className="mt-3 text-sm font-semibold text-foreground">Áudio vira rascunho fiscal</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustBand() {
  return (
    <section className="px-5 py-10 md:px-8">
      <div className="mx-auto max-w-7xl rounded-3xl border border-border bg-card/65 p-5 backdrop-blur">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          Hospitais onde nossos médicos atuam
        </p>
        <div className="mt-5 grid gap-3 text-center sm:grid-cols-5">
          {hospitalLogos.map((name) => (
            <div key={name} className="rounded-2xl border border-border bg-surface/70 px-4 py-3 text-sm font-semibold text-muted-foreground">
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BentoSection() {
  return (
    <section id="funcionalidades" className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Sistema operacional financeiro"
          title="Menos cliques. Mais fechamento. Nenhuma planilha paralela."
          body="O DocFin organiza o ciclo completo: captura do plantão, triagem fiscal, recebíveis e entrega contábil. A complexidade aparece só quando ela protege você."
        />

        <div className="mt-12 grid gap-4 lg:grid-cols-12">
          {bentoFeatures.map((feature) => (
            <BentoCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BentoCard({ feature }: { feature: (typeof bentoFeatures)[number] }) {
  return (
    <article
      className={`group premium-card relative overflow-hidden rounded-3xl p-6 transition duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-2xl hover:shadow-primary/10 ${feature.size}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/30 opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
          {feature.icon}
        </div>
        <div className="rounded-2xl border border-border bg-surface/70 px-4 py-3 text-right">
          <p className="font-mono text-2xl font-semibold tabular-nums text-success">{feature.metric}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{feature.metricLabel}</p>
        </div>
      </div>
      <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{feature.eyebrow}</p>
      <h3 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight text-foreground">{feature.title}</h3>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{feature.body}</p>
    </article>
  );
}

function WorkflowSection() {
  return (
    <section id="dossie" className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <SectionHeader
            eyebrow="Mecanismo"
            title="O fluxo que separa pressa médica de precisão contábil."
            body="O plantão nasce como rascunho, passa por consolidação e só então entra em caixa, Dossiê Fiscal e relatórios para o contador."
          />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton to="/login">Criar conta gratuita</PrimaryButton>
            <SecondaryButton to="/planos">Comparar planos</SecondaryButton>
          </div>
        </div>

        <div className="premium-card rounded-3xl p-5">
          <div className="space-y-3">
            {[
              ["01", "Captura rápida", "Hospital, duração, valor e transporte em segundos."],
              ["02", "Inbox fiscal", "Pendência revisada antes de contaminar os cálculos."],
              ["03", "Dossiê Premium", "CSV e leitura executiva para o escritório contábil."],
              ["04", "Recebíveis", "Previsão de pagamento e status de caixa em uma linha."],
            ].map(([step, title, body]) => (
              <div key={step} className="flex gap-4 rounded-2xl border border-border bg-surface/70 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-xs font-semibold text-primary">
                  {step}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section id="seguranca" className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="premium-card rounded-3xl p-7 md:p-9">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h2 className="mt-8 max-w-2xl text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Segurança institucional para dados que você não colocaria em uma planilha qualquer.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">
            Acesso segregado, visão contábil controlada e dados operacionais prontos para auditoria. O médico decide o que vira base de cálculo e o que ainda é rascunho.
          </p>
        </div>

        <div className="grid gap-4">
          <SecurityLine icon={<ShieldCheck className="h-4 w-4" />} title="Rascunhos isolados" body="Pendências não entram em caixa, Dossiê ou indicadores globais." />
          <SecurityLine icon={<Building2 className="h-4 w-4" />} title="Visão do contador" body="Leitura estruturada para reduzir WhatsApp, print e planilha paralela." />
          <SecurityLine icon={<FileSpreadsheet className="h-4 w-4" />} title="Exportação contábil" body="CSV institucional para fechamento mensal com menos digitação manual." />
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Prova de confiança</p>
            <h2 className="mt-5 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Feito para quem não tem energia sobrando para burocracia.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {testimonials.map((item) => (
              <article key={item.author} className="premium-card rounded-3xl p-6">
                <p className="text-base leading-8 text-foreground">“{item.quote}”</p>
                <p className="mt-6 text-sm font-semibold text-primary">{item.author}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Antes de entrar</p>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            As perguntas que um médico ocupado faria antes de confiar seus números.
          </h2>
          <p className="mt-6 text-base leading-8 text-muted-foreground">
            O DocFin foi desenhado para reduzir atrito, não para substituir decisões contábeis que precisam de validação profissional.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((item) => (
            <details key={item.question} className="group premium-card rounded-3xl p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-foreground">
                {item.question}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-primary transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section id="concierge" className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-primary/30 bg-primary/10 p-6 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Beta exclusivo</p>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Pare de fechar o mês no susto.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
              Comece pelo plano gratuito, valide o fluxo web e descubra se o Concierge com IA por WhatsApp faz sentido para a sua rotina.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <PrimaryButton to="/login">Começar agora</PrimaryButton>
            <SecondaryButton to="/planos">Ver preços</SecondaryButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background px-5 py-14 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <DocFinLogo className="h-10 w-[142px]" />
          <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
            Inteligência financeira de alta performance para médicos especialistas.
          </p>
          <p className="mt-5 text-sm text-muted-foreground">contato@docfin.com.br</p>
        </div>

        {[
          ["Produto", "Cockpit", "Lançamentos", "Dossiê Fiscal", "Planos"],
          ["Soluções", "PJ médica", "Fator R", "Contadores", "Recebíveis"],
          ["Legal", "Privacidade", "Termos", "LGPD", "Segurança"],
        ].map(([title, ...links]) => (
          <div key={title}>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
            <div className="mt-4 space-y-3">
              {links.map((link) => (
                <a key={link} href="#" className="block text-sm text-muted-foreground transition hover:text-primary">
                  {link}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-5 border-t border-border pt-7 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>© 2026 DocFin. Todos os direitos reservados. DOCFIN_INSTITUTIONAL_NAVY_2026-05-17-19_WORK.</p>
        <div className="flex items-center gap-3">
          <SocialIcon label="Instagram">
            <path d="M7.5 2.75h9A4.75 4.75 0 0 1 21.25 7.5v9a4.75 4.75 0 0 1-4.75 4.75h-9a4.75 4.75 0 0 1-4.75-4.75v-9A4.75 4.75 0 0 1 7.5 2.75Z" />
            <path d="M8.75 12a3.25 3.25 0 1 0 6.5 0 3.25 3.25 0 0 0-6.5 0Z" />
            <path d="M17.1 6.9h.01" />
          </SocialIcon>
          <SocialIcon label="Twitter/X">
            <path d="M4 4l11.5 16h4.5L8.5 4H4Z" />
            <path d="M4 20L20 4" />
          </SocialIcon>
        </div>
      </div>
    </footer>
  );
}

function SectionHeader({ eyebrow, title, body }: { eyebrow: string; title: ReactNode; body: string }) {
  return (
    <div className="max-w-4xl">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
      <h2 className="mt-5 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">{title}</h2>
      <p className="mt-6 max-w-3xl text-base leading-8 text-muted-foreground">{body}</p>
    </div>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-mono text-2xl font-semibold tabular-nums text-success">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function MockupMetric({ label, value, tone }: { label: string; value: string; tone: "success" | "neutral" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-3 font-mono text-3xl font-semibold tabular-nums ${tone === "success" ? "text-success" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function MockupRow({ hospital, detail, value, muted }: { hospital: string; detail: string; value: string; muted?: boolean }) {
  return (
    <div className={`mt-3 rounded-2xl border border-border bg-background/45 p-4 ${muted ? "opacity-65" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{hospital}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <p className="font-mono text-sm font-semibold tabular-nums text-success">{value}</p>
      </div>
    </div>
  );
}

function SecurityLine({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <article className="premium-card rounded-3xl p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
    </article>
  );
}

function SocialIcon({ label, children }: { label: string; children: ReactNode }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </a>
  );
}

function PrimaryButton({ to, children }: { to: "/login" | "/planos"; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function SecondaryButton({ to, children }: { to: "/login" | "/planos"; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-12 items-center justify-center rounded-xl border border-border px-6 text-sm font-bold text-foreground transition hover:border-primary/50 hover:text-primary"
    >
      {children}
    </Link>
  );
}
