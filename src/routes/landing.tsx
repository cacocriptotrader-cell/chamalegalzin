import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  FileSpreadsheet,
  Layers3,
  LockKeyhole,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { DocFinLogo } from "@/components/DocFinLogo";

export const Route = createFileRoute("/landing")({
  component: LandingPage,
});

type Persona = "doctor" | "accountant";

const navItems = [
  { label: "Recursos", href: "#recursos" },
  { label: "Médicos e Contadores", href: "#personas" },
  { label: "Fluxo fiscal", href: "#fluxo" },
  { label: "Segurança", href: "#seguranca" },
];

const bentoFeatures = [
  {
    title: "Roteamento automático PJ vs PIX",
    eyebrow: "Receita segregada",
    body: "Cada plantão nasce com regime e forma de recebimento claros, evitando que PIX/PF, CLT ou SCP contaminem a base do Simples Nacional.",
    icon: <RouteIcon className="h-5 w-5" />,
    metric: "PJ / PIX",
    detail: "separação de caixa e competência",
    className: "lg:col-span-5",
  },
  {
    title: "Inserção em lote de escalas",
    eyebrow: "Operação mobile",
    body: "Cadastre vários dias com o mesmo hospital, valor e duração em uma única ação. Menos repetição no pós-plantão, mais dados confiáveis no fechamento.",
    icon: <CalendarDays className="h-5 w-5" />,
    metric: "15+",
    detail: "plantões por mês sem retrabalho",
    className: "lg:col-span-4",
  },
  {
    title: "Motor fiscal 2026 auditável",
    eyebrow: "Lei 15.270/2025",
    body: "Simulação de pró-labore, INSS, IRRF com redutor adicional e Fator R usando memória de cálculo pronta para conferência contábil.",
    icon: <ShieldCheck className="h-5 w-5" />,
    metric: "PGDAS-D",
    detail: "Fator R, RBT12 e anexos",
    className: "lg:col-span-3",
  },
];

const heroPersonaContent = {
  doctor: {
    tabLabel: "Para Médicos",
    badge: "WEALTH MANAGEMENT PARA MÉDICOS",
    headline: "A paz de espírito fiscal que a sua rotina médica exige.",
    subHeadline:
      "Capture plantões em 30 segundos, otimize impostos e deixe a burocracia no piloto automático, sem transformar o fim do mês em uma segunda jornada.",
    cta: "Comece seu Beta",
  },
  accountant: {
    tabLabel: "Para Escritórios",
    badge: "AUDITORIA E COMPLIANCE",
    headline: "A base de cálculo perfeita, integrada nativamente ao seu ERP.",
    subHeadline:
      "Elimine a redigitação. Receba os faturamentos dos seus clientes médicos já roteados (PJ/PIX) e com o Fator R otimizado, prontos para o SCI.",
    cta: "Cadastrar Escritório",
  },
} satisfies Record<Persona, { tabLabel: string; badge: string; headline: string; subHeadline: string; cta: string }>;

const personaContent = {
  doctor: {
    label: "Para Médicos",
    icon: <Stethoscope className="h-4 w-4" />,
    title: "Você registra a rotina. O DocFin organiza o impacto financeiro.",
    description:
      "Capture plantões em segundos, veja o que é PJ, PIX ou bolsa, acompanhe recebimentos e reduza o risco de pagar imposto em cima de dado errado.",
    bullets: [
      "Cadastro rápido de plantões, inclusive em lote para escalas mensais.",
      "Separação entre caixa, competência fiscal e vida financeira pessoal.",
      "Alertas de dados pendentes antes de virar problema no fechamento.",
    ],
    cta: "Entrar como médica(o)",
  },
  accountant: {
    label: "Para Contadores",
    icon: <FileSpreadsheet className="h-4 w-4" />,
    title: "Base limpa, memória de cálculo e publicação do DAS em um fluxo só.",
    description:
      "O painel contábil entrega base tributável por competência, simulação de pró-labore, Fator R, RBT12 e CSV pronto para conferência ou importação no escritório.",
    bullets: [
      "Relatórios auditáveis por competência fiscal, não por atraso de pagamento.",
      "Validação Maker-Checker com pró-labore, DAS oficial e Pix copia e cola.",
      "Exportação com memória de cálculo para reduzir retrabalho no ERP contábil.",
    ],
    cta: "Acessar visão contábil",
  },
} satisfies Record<Persona, { label: string; icon: ReactNode; title: string; description: string; bullets: string[]; cta: string }>;

const fiscalFlow = [
  {
    step: "01",
    title: "Plantão capturado",
    body: "Hospital, valor, duração, datas e regime entram sem exigir fechamento fiscal no meio da rotina.",
  },
  {
    step: "02",
    title: "Receita classificada",
    body: "PJ Simples, PIX/PF, CLT, SCP e bolsa são tratados como trilhas separadas para evitar mistura de bases.",
  },
  {
    step: "03",
    title: "Contador valida",
    body: "O escritório revisa competência, pró-labore, Fator R e DAS estimado antes de publicar para pagamento.",
  },
  {
    step: "04",
    title: "CSV auditável",
    body: "A memória de cálculo sai pronta para conferência, importação e documentação do fechamento mensal.",
  },
];

export function LandingPage() {
  return (
    <main className="premium-shell min-h-screen overflow-hidden text-foreground">
      <LandingHeader />
      <HeroSection />
      <BentoSection />
      <PersonaTabsSection />
      <WorkflowSection />
      <SecuritySection />
      <FinalCta />
      <LandingFooter />
    </main>
  );
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="Ir para a página inicial do DocFin">
          <DocFinLogo className="h-10 w-[142px]" />
          <span className="hidden border-l border-border pl-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground sm:inline">
            Med-Fintech
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground lg:flex" aria-label="Navegação principal">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:inline-flex"
          >
            Entrar
          </Link>
          <Link
            to="/login"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Começar beta
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  const [persona, setPersona] = useState<Persona>("doctor");
  const content = heroPersonaContent[persona];

  return (
    <section className="px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-24" aria-labelledby="hero-title">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="min-w-0 animate-fade-in">
          <div className="inline-grid rounded-full border border-border bg-surface/70 p-1 sm:grid-cols-2" role="tablist" aria-label="Escolha o perfil principal da página">
            {(Object.keys(heroPersonaContent) as Persona[]).map((item) => {
              const selected = persona === item;

              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="hero-persona-panel"
                  id={`hero-persona-tab-${item}`}
                  onClick={() => setPersona(item)}
                  className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                    selected ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {heroPersonaContent[item].tabLabel}
                </button>
              );
            })}
          </div>

          <div
            key={persona}
            id="hero-persona-panel"
            role="tabpanel"
            aria-labelledby={`hero-persona-tab-${persona}`}
            className="mt-5 animate-fade-in transition-opacity duration-300 ease-out"
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-4 w-4" />
              {content.badge}
            </p>
            <h1 id="hero-title" className="mt-7 max-w-5xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-foreground sm:text-5xl md:text-6xl lg:text-[4.65rem]">
              {content.headline}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl md:leading-9">
              {content.subHeadline}
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton to="/login">{content.cta}</PrimaryButton>
            <SecondaryButton to="/login">{persona === "doctor" ? "Ver integração contábil" : "Ver fluxo para clientes"}</SecondaryButton>
          </div>

          <dl className="mt-10 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
            <HeroMetric value="10s" label="captura operacional" />
            <HeroMetric value="2026" label="IRRF e Lei 15.270" />
            <HeroMetric value="CSV" label="memória contábil" />
          </dl>
        </div>

        <HeroDashboardPreview />
      </div>
    </section>
  );
}

function HeroDashboardPreview() {
  return (
    <aside className="relative mx-auto w-full max-w-[620px] animate-fade-in" aria-label="Prévia visual do painel DocFin">
      <div className="rounded-[2rem] border border-border bg-card/90 p-4 shadow-2xl shadow-primary/10 backdrop-blur">
        <div className="rounded-[1.5rem] border border-border bg-background/55 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Fechamento inteligente</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Maio 2026</h2>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-success">
              <BadgeCheck className="h-3.5 w-3.5" />
              Base validável
            </span>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <PreviewMetric label="Receita PJ Simples" value="R$ 17.400" />
            <PreviewMetric label="PIX / PF isolado" value="R$ 2.400" muted />
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-surface-elevated/80 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Memória PGDAS-D</p>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary">Fator R 28%</span>
            </div>
            <PreviewRow label="Pró-labore simulado" value="R$ 4.872,00" />
            <PreviewRow label="INSS" value="R$ 535,92" />
            <PreviewRow label="IRRF 2026" value="R$ 0,00" success />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-2xl border border-border bg-surface/70 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Inserção em lote</p>
              <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-foreground">12 datas</p>
            </div>
            <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary">Contador</p>
              <p className="mt-3 text-sm font-semibold text-foreground">Publica DAS + Pix para o cliente</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function BentoSection() {
  return (
    <section id="recursos" className="px-5 py-18 md:px-8 md:py-24" aria-labelledby="features-title">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Três motores do Beta"
          title="A parte difícil acontece por trás. A rotina fica simples na mão do usuário."
          body="A landing agora mostra o que diferencia o produto tecnicamente sem virar aula: roteamento de regimes, escala em lote e cálculo fiscal 2026 auditável."
          id="features-title"
        />

        <div className="mt-12 grid gap-4 lg:grid-cols-12">
          {bentoFeatures.map((feature) => (
            <article key={feature.title} className={`premium-card min-w-0 rounded-3xl p-6 transition hover:-translate-y-1 hover:border-primary/45 hover:shadow-2xl hover:shadow-primary/10 ${feature.className}`}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                  {feature.icon}
                </div>
                <div className="w-full rounded-2xl border border-border bg-surface/70 px-4 py-3 sm:w-auto sm:text-right">
                  <p className="font-mono text-2xl font-semibold tabular-nums text-success">{feature.metric}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{feature.detail}</p>
                </div>
              </div>
              <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{feature.eyebrow}</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{feature.title}</h3>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PersonaTabsSection() {
  const [activePersona, setActivePersona] = useState<Persona>("doctor");
  const content = useMemo(() => personaContent[activePersona], [activePersona]);

  return (
    <section id="personas" className="px-5 py-18 md:px-8 md:py-24" aria-labelledby="persona-title">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <SectionHeader
            eyebrow="Duas personas, uma fonte da verdade"
            title="Médico ganha tempo. Contador ganha base limpa."
            body="O DocFin separa a experiência de quem lança os plantões da experiência de quem confere imposto, sem duplicar planilha ou misturar permissões."
            id="persona-title"
          />

          <div className="premium-card rounded-3xl p-4 md:p-6">
            <div className="grid rounded-2xl border border-border bg-surface/60 p-1 sm:grid-cols-2" role="tablist" aria-label="Escolha a visão de valor do DocFin">
              {(Object.keys(personaContent) as Persona[]).map((persona) => {
                const item = personaContent[persona];
                const selected = activePersona === persona;

                return (
                  <button
                    key={persona}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`persona-panel-${persona}`}
                    id={`persona-tab-${persona}`}
                    onClick={() => setActivePersona(persona)}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                      selected ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div
              id={`persona-panel-${activePersona}`}
              role="tabpanel"
              aria-labelledby={`persona-tab-${activePersona}`}
              className="mt-6 rounded-2xl border border-border bg-background/45 p-5 md:p-6"
            >
              <h3 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground">{content.title}</h3>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">{content.description}</p>

              <ul className="mt-6 grid gap-3" aria-label={`Benefícios ${content.label.toLowerCase()}`}>
                {content.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3 rounded-2xl border border-border bg-surface/70 p-4 text-sm leading-6 text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                <PrimaryButton to="/login">{content.cta}</PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section id="fluxo" className="px-5 py-18 md:px-8 md:py-24" aria-labelledby="workflow-title">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <SectionHeader
            eyebrow="Fluxo Maker-Checker"
            title="O fechamento sai do WhatsApp e vira processo."
            body="O médico lança; o sistema separa regimes; o contador valida; o cliente recebe o DAS com Pix. Cada etapa tem dono, contexto e trilha de auditoria."
            id="workflow-title"
          />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton to="/login">Criar conta beta</PrimaryButton>
            <SecondaryButton to="/planos">Ver planos</SecondaryButton>
          </div>
        </div>

        <div className="premium-card rounded-3xl p-5">
          <ol className="space-y-3" aria-label="Fluxo fiscal do DocFin">
            {fiscalFlow.map((item) => (
              <li key={item.step} className="flex gap-4 rounded-2xl border border-border bg-surface/70 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-xs font-semibold text-primary">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section id="seguranca" className="px-5 py-18 md:px-8 md:py-24" aria-labelledby="security-title">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="premium-card rounded-3xl p-7 md:p-9">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <LockKeyhole className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 id="security-title" className="mt-8 max-w-2xl text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            Controle de acesso desenhado para proteger a base fiscal.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">
            Médico e contador têm jornadas diferentes. A interface respeita essa separação para reduzir vazamento de contexto, erro operacional e retrabalho no fechamento.
          </p>
        </div>

        <div className="grid gap-4">
          <SecurityLine icon={<UsersRound className="h-4 w-4" />} title="Visões por perfil" body="Médico cuida da operação. Contador confere relatórios e valida obrigações fiscais." />
          <SecurityLine icon={<Layers3 className="h-4 w-4" />} title="Regimes isolados" body="Somente PJ_SIMPLES alimenta a base do PGDAS-D; demais receitas seguem separadas." />
          <SecurityLine icon={<FileSpreadsheet className="h-4 w-4" />} title="Exportação auditável" body="CSV com competência fiscal, RBT12, Fator R, pró-labore e imposto devido." />
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-5 py-18 md:px-8 md:py-24" aria-labelledby="final-cta-title">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-primary/30 bg-primary/10 p-6 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Beta DocFin</p>
            <h2 id="final-cta-title" className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Transforme fechamento médico em rotina previsível.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
              Comece com o fluxo essencial: plantões, regimes, caixa, competência fiscal e painel contábil. Sem trocar a paleta, sem prometer milagre, sem esconder a matemática.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <PrimaryButton to="/login">Começar agora</PrimaryButton>
            <SecondaryButton to="/planos">Comparar planos</SecondaryButton>
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
            Inteligência financeira e fiscal para médicos plantonistas e seus contadores.
          </p>
          <p className="mt-5 text-sm text-muted-foreground">contato@docfin.com.br</p>
        </div>

        {[
          ["Produto", "Plantões", "Painel fiscal", "Auditoria 2026", "Planos"],
          ["Perfis", "Médicos", "Contadores", "PJ médica", "Recebíveis"],
          ["Legal", "Privacidade", "Termos", "LGPD", "Segurança"],
        ].map(([title, ...links]) => (
          <div key={title}>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
            <div className="mt-4 space-y-3">
              {links.map((link) => (
                <a key={link} href="#" className="block text-sm text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                  {link}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-5 border-t border-border pt-7 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>© 2026 DocFin. Todos os direitos reservados.</p>
        <p>Projeções gerenciais. Validação final sempre com contador responsável.</p>
      </div>
    </footer>
  );
}

function SectionHeader({ eyebrow, title, body, id }: { eyebrow: string; title: ReactNode; body: string; id?: string }) {
  return (
    <div className="max-w-4xl">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
      <h2 id={id} className="mt-5 text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
        {title}
      </h2>
      <p className="mt-6 max-w-3xl text-base leading-8 text-muted-foreground">{body}</p>
    </div>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="font-mono text-2xl font-semibold tabular-nums text-success">{value}</dt>
      <dd className="mt-1 text-xs text-muted-foreground">{label}</dd>
    </div>
  );
}

function PreviewMetric({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-3 font-mono text-2xl font-semibold tabular-nums md:text-3xl ${muted ? "text-foreground" : "text-success"}`}>{value}</p>
    </div>
  );
}

function PreviewRow({ label, value, success }: { label: string; value: string; success?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm font-semibold tabular-nums ${success ? "text-success" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function SecurityLine({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <article className="premium-card rounded-3xl p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary" aria-hidden="true">
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
    </article>
  );
}

function PrimaryButton({ to, children }: { to: "/login" | "/planos"; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function SecondaryButton({ to, children }: { to: "/login" | "/planos"; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-12 items-center justify-center rounded-xl border border-border px-6 text-sm font-bold text-foreground transition hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      {children}
    </Link>
  );
}
