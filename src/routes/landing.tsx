import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck,
  ChevronDown,
  FileSpreadsheet,
  Fingerprint,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { DocFinLogo } from "@/components/DocFinLogo";

export const Route = createFileRoute("/landing")({
  component: LandingPage,
});

const navItems = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Otimização Fiscal", href: "#otimizacao-fiscal" },
  { label: "Para Contadores", href: "#contador" },
  { label: "Segurança", href: "#seguranca" },
];

const benefits = [
  {
    title: "Plantões capturados sem fricção",
    body: "Registre o evento no corredor, no repouso ou no estacionamento. O detalhe contábil fica para a triagem.",
    icon: <CalendarCheck className="h-5 w-5" />,
  },
  {
    title: "Fator R sob vigilância",
    body: "Acompanhe a zona de segurança do Anexo III antes do fechamento virar uma surpresa cara.",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    title: "Contabilidade sem WhatsApp infinito",
    body: "Relatórios estruturados para o contador baixar, conferir e fechar a competência com menos atrito.",
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    title: "PF e PJ em fronteiras claras",
    body: "Vida privada, patrimônio e empresa não se misturam na interface nem na leitura financeira.",
    icon: <WalletCards className="h-5 w-5" />,
  },
];

const featureTabs = [
  {
    title: "Captura Imediata",
    label: "Captura rápida",
    body: "O médico lança hospital, duração e transporte em segundos. O registro entra como rascunho e só participa dos cálculos depois da consolidação fiscal.",
    metric: "15s",
    detail: "tempo alvo de registro",
  },
  {
    title: "Motor Fiscal",
    label: "Fator R",
    body: "Uma camada gerencial acompanha Fator R, pró-labore, regimes e alertas do Dossiê Fiscal, com a complexidade escondida até o contador precisar auditar.",
    metric: "28%",
    detail: "zona crítica monitorada",
  },
  {
    title: "Painel Contábil",
    label: "Somente leitura",
    body: "O escritório acessa uma visão segura, exporta CSV/OFX e evita caçar comprovantes em conversas soltas no fim do mês.",
    metric: "0",
    detail: "edições pelo contador",
  },
];

const testimonials = [
  {
    quote: "O DocFin tirou o fechamento mensal da minha cabeça. Eu sei quanto fiz, o que falta receber e o que o contador precisa.",
    author: "Médica anestesiologista, R3",
  },
  {
    quote: "A separação entre rascunho e consolidado é o tipo de detalhe que evita planilha paralela e retrabalho no escritório.",
    author: "Contador especialista em PJ médica",
  },
  {
    quote: "A experiência parece de private banking, mas fala a língua de quem vive plantão, repasse e hospital.",
    author: "Cirurgião parceiro",
  },
];

const faqs = [
  {
    question: "O DocFin substitui meu contador?",
    answer:
      "Não. O DocFin organiza a operação financeira, antecipa riscos e entrega dados estruturados para o contador fechar com mais segurança e menos retrabalho.",
  },
  {
    question: "Meus dados fiscais ficam expostos?",
    answer:
      "A arquitetura separa permissões e visões. O médico controla o acesso, e o contador recebe uma experiência focada em leitura e exportação.",
  },
  {
    question: "Funciona para quem atende em vários hospitais?",
    answer:
      "Sim. O app foi desenhado para múltiplos hospitais, prazos de repasse, regimes fiscais e plantões repetitivos.",
  },
  {
    question: "O Fator R é cálculo contábil definitivo?",
    answer:
      "A tela mostra uma projeção gerencial para decisão rápida. A validação fiscal definitiva depende do fechamento contábil oficial.",
  },
];

const footerColumns = [
  { title: "Produto", links: ["Cockpit", "Calendário", "Dossiê Fiscal", "Patrimônio"] },
  { title: "Soluções", links: ["PJ Médica", "Fator R", "Contadores", "Recebíveis"] },
  { title: "Legal", links: ["Privacidade", "Termos", "LGPD", "Segurança"] },
];

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-gray-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(15,118,110,0.22),transparent_34rem),radial-gradient(circle_at_82%_18%,rgba(4,120,87,0.14),transparent_28rem),linear-gradient(180deg,#050505_0%,#07100d_48%,#050505_100%)]" />
      <LandingHeader />
      <HeroSection />
      <CompanyIntro />
      <BenefitsSection />
      <FeatureTabsSection />
      <TestimonialsSection />
      <FaqSection />
      <LandingFooter />
    </main>
  );
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#1A2332]/80 bg-black/62 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <DocFinLogo className="h-10 w-[142px]" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-500">Gestão Médica Premium</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-gray-400 lg:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition-all duration-300 hover:text-emerald-300">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="hidden rounded-xl border border-gray-800 px-4 py-2.5 text-sm font-semibold text-gray-300 transition-all duration-300 hover:border-emerald-500/55 hover:text-gray-100 sm:inline-flex"
          >
            Entrar
          </Link>
          <Link
            to="/dashboard"
            className="rounded-xl border border-emerald-400/30 bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_40px_rgba(15,118,110,0.22)] transition-all duration-300 hover:border-emerald-300/70 hover:bg-emerald-600"
          >
            Agendar demonstração
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1fr_0.95fr]">
        <div className="animate-fade-in">
          <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Inteligência patrimonial para médicos
          </p>
          <h1 className="max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-gray-100 md:text-6xl lg:text-[4.7rem]">
            O fim do caos financeiro depois do{" "}
            <span className="[font-family:'Playfair_Display',serif] font-semibold italic text-emerald-300">plantão.</span>
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-gray-400 md:text-xl md:leading-9">
            O DocFin transforma plantões, repasses, Fator R e patrimônio em uma experiência de wealth management para médicos especialistas. Menos ruído, mais controle e dados prontos para o contador.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton>Começar agora</PrimaryButton>
            <SecondaryButton>Ver fluxo do produto</SecondaryButton>
          </div>
          <div className="mt-10 grid gap-4 border-t border-gray-800 pt-6 sm:grid-cols-3">
            <HeroMetric label="Tempo alvo de captura" value="15s" />
            <HeroMetric label="Fronteira mental" value="PF/PJ" />
            <HeroMetric label="Dossiê do contador" value="CSV" />
          </div>
        </div>

        <ProductMockup />
      </div>
    </section>
  );
}

function ProductMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] animate-fade-in">
      <div className="absolute -left-14 top-10 h-80 w-80 rounded-full bg-emerald-700/20 blur-3xl" />
      <div className="absolute -right-8 bottom-4 h-72 w-72 rounded-full bg-teal-900/30 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-[#1A2332] bg-[#0A0D14]/92 p-4 shadow-[0_46px_140px_rgba(0,0,0,0.62)]">
        <div className="rounded-[1.5rem] border border-gray-800 bg-black/55 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Cockpit médico</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-gray-100">Dinheiro no bolso</h2>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
              Seguro
            </span>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <MockupCard label="Resultado líquido" value="R$ 42.780" tone="green" />
            <MockupCard label="Fator R" value="31,4%" tone="neutral" />
          </div>

          <div className="mt-4 rounded-2xl border border-gray-800 bg-[#0f1115] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Inbox de plantões</p>
              <span className="text-[10px] text-gray-500">3 pendências</span>
            </div>
            <MockupRow hospital="Einstein" detail="12h · transporte privado" value="R$ 3.360" />
            <MockupRow hospital="Sírio-Libanês" detail="D+30 · repasse previsto" value="R$ 2.940" />
            <MockupRow hospital="Rede D'Or" detail="glosa em revisão" value="R$ 1.680" muted />
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyIntro() {
  return (
    <section className="px-5 py-24 md:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Empresa"
          title="Uma plataforma de gestão financeira desenhada para a rotina médica real."
          body="O DocFin não tenta transformar médicos em analistas financeiros. Ele captura dados operacionais no menor atrito possível e organiza a leitura para decisão, contabilidade e patrimônio."
        />
        <div className="mt-14 overflow-hidden rounded-[2rem] border border-[#1A2332] bg-[#0A0D14] p-4 shadow-[0_40px_120px_rgba(0,0,0,0.44)]">
          <div className="grid gap-4 rounded-[1.5rem] border border-gray-800 bg-black/45 p-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-gray-800 bg-[#0f1115] p-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Timeline financeira</p>
              <div className="mt-5 space-y-3">
                {["Rascunho capturado", "Consolidação fiscal", "Recebível previsto", "Contabilidade exportada"].map((item, index) => (
                  <div key={item} className="flex items-center gap-4 rounded-2xl border border-gray-800 bg-black/35 p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 font-mono text-xs text-emerald-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="text-sm font-medium text-gray-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-[#040D14] p-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Visão consolidada</p>
              <p className="mt-5 font-mono text-5xl font-semibold text-emerald-300">R$ 128k</p>
              <p className="mt-3 text-sm leading-6 text-gray-400">Receita operacional organizada por hospital, regime e status de pagamento.</p>
              <div className="mt-8 h-2 overflow-hidden rounded-full bg-gray-800">
                <div className="h-full w-[72%] rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section id="funcionalidades" className="bg-[#040D14] px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Diferenciais"
          title="A precisão de uma tesouraria, com a velocidade de quem vive entre hospitais."
          body="Cada fluxo reduz uma forma diferente de desperdício: tempo perdido, imposto mal calibrado, recibo esquecido ou patrimônio invisível."
        />
        <div className="mt-12 grid overflow-hidden rounded-[2rem] border border-[#1A2332] bg-[#0A0D14] shadow-[0_32px_100px_rgba(0,0,0,0.42)] lg:grid-cols-4">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="border-b border-[#1A2332] p-6 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                {benefit.icon}
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-gray-100">{benefit.title}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-400">{benefit.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureTabsSection() {
  const [active, setActive] = useState(0);
  const selected = featureTabs[active];

  return (
    <section id="otimizacao-fiscal" className="px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <SectionHeader
            eyebrow="Serviços"
            title="Um sistema por trás da rotina, não mais uma tarefa na sua agenda."
            body="Navegue entre os motores do DocFin. Todos compartilham a mesma premissa: dados entram rápido, decisões saem limpas."
          />
          <div className="mt-8 space-y-3">
            {featureTabs.map((feature, index) => (
              <button
                key={feature.title}
                type="button"
                onClick={() => setActive(index)}
                className={`w-full rounded-2xl border p-4 text-left transition-all duration-300 ${
                  active === index
                    ? "border-emerald-500/45 bg-emerald-500/10 text-gray-100"
                    : "border-gray-800 bg-[#0f1115] text-gray-400 hover:border-emerald-500/30 hover:text-gray-100"
                }`}
              >
                <span className="font-mono text-xs text-emerald-300">{String(index + 1).padStart(2, "0")}</span>
                <span className="ml-4 text-sm font-semibold">{feature.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#1A2332] bg-[#0A0D14] p-6 shadow-[0_34px_110px_rgba(0,0,0,0.44)]">
          <div className="rounded-[1.5rem] border border-gray-800 bg-black/45 p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{selected.label}</p>
            <h3 className="mt-4 text-4xl font-semibold tracking-tight text-gray-100">{selected.title}</h3>
            <p className="mt-5 max-w-2xl text-base leading-8 text-gray-400">{selected.body}</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-800 bg-[#0f1115] p-5">
                <p className="font-mono text-5xl font-semibold text-emerald-300">{selected.metric}</p>
                <p className="mt-2 text-sm text-gray-400">{selected.detail}</p>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-[#040D14] p-5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Camada operacional</p>
                <div className="mt-5 space-y-3">
                  <div className="h-2 rounded-full bg-emerald-500/80" />
                  <div className="h-2 w-4/5 rounded-full bg-gray-700" />
                  <div className="h-2 w-3/5 rounded-full bg-gray-800" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section id="contador" className="bg-[#040D14] px-5 py-24 md:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Prova de confiança"
          title="Construído para médicos e validado pelo olhar contábil."
          body="A autoridade do produto vem do encontro entre rotina hospitalar, compliance fiscal e leitura patrimonial."
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.author} className="rounded-2xl border border-[#1A2332] bg-[#0A0D14] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.30)]">
              <p className="text-base leading-7 text-gray-300">“{item.quote}”</p>
              <p className="mt-6 text-sm font-semibold text-emerald-300">{item.author}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const [open, setOpen] = useState(0);

  return (
    <section id="seguranca" className="px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-[#1A2332] bg-[#0A0D14] p-7 shadow-[0_34px_110px_rgba(0,0,0,0.42)]">
          <div className="rounded-[1.5rem] border border-gray-800 bg-black/45 p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h2 className="mt-8 text-4xl font-semibold tracking-tight text-gray-100">Segurança institucional, linguagem médica.</h2>
            <p className="mt-5 text-base leading-8 text-gray-400">
              O produto foi desenhado para separar permissões, preservar dados sensíveis e dar controle para quem vive a operação: o médico.
            </p>
            <div className="mt-8 grid gap-3">
              <SecurityLine icon={<Fingerprint className="h-4 w-4" />} text="Row Level Security por usuário" />
              <SecurityLine icon={<Building2 className="h-4 w-4" />} text="Visão contábil segregada" />
              <SecurityLine icon={<MessageSquareText className="h-4 w-4" />} text="Dados operacionais prontos para auditoria" />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Dúvidas</p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-gray-100 md:text-5xl">Perguntas antes de entregar seus dados financeiros.</h2>
          <div className="mt-10 divide-y divide-gray-800 rounded-[2rem] border border-[#1A2332] bg-[#0A0D14]">
            {faqs.map((faq, index) => (
              <button
                key={faq.question}
                type="button"
                onClick={() => setOpen(open === index ? -1 : index)}
                className="block w-full p-5 text-left"
              >
                <span className="flex items-center justify-between gap-4">
                  <span className="text-base font-semibold text-gray-100">{faq.question}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${open === index ? "rotate-180" : ""}`} />
                </span>
                {open === index && <span className="mt-4 block text-sm leading-7 text-gray-400">{faq.answer}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-[#1A2332] bg-black px-5 py-14 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.35fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <div className="flex items-center gap-3">
            <DocFinLogo className="h-10 w-[142px]" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-500">Gestão Médica Premium</p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-6 text-gray-400">
            Inteligência financeira de alta performance para médicos especialistas.
          </p>
          <p className="mt-5 text-sm text-gray-500">contato@docfin.com.br</p>
        </div>

        {footerColumns.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{column.title}</p>
            <div className="mt-4 space-y-3">
              {column.links.map((link) => (
                <a key={link} href="#" className="block text-sm text-gray-400 transition-all duration-300 hover:text-emerald-300">
                  {link}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-5 border-t border-gray-900 pt-7 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
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
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">{eyebrow}</p>
      <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-gray-100 md:text-5xl">{title}</h2>
      <p className="mt-6 max-w-3xl text-base leading-8 text-gray-400">{body}</p>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-2xl font-semibold text-emerald-300">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}

function MockupCard({ label, value, tone }: { label: string; value: string; tone: "green" | "neutral" }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0f1115] p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <p className={`mt-3 font-mono text-3xl font-semibold ${tone === "green" ? "text-emerald-300" : "text-gray-100"}`}>{value}</p>
    </div>
  );
}

function MockupRow({ hospital, detail, value, muted }: { hospital: string; detail: string; value: string; muted?: boolean }) {
  return (
    <div className={`mt-3 rounded-2xl border p-4 ${muted ? "border-gray-800 bg-black/30 opacity-70" : "border-[#1A2332] bg-black/45"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-100">{hospital}</p>
          <p className="mt-1 text-xs text-gray-500">{detail}</p>
        </div>
        <p className="font-mono text-sm font-semibold text-emerald-300">{value}</p>
      </div>
    </div>
  );
}

function SecurityLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-800 bg-[#0f1115] px-4 py-3 text-sm text-gray-300">
      <span className="text-emerald-300">{icon}</span>
      {text}
    </div>
  );
}

function SocialIcon({ label, children }: { label: string; children: ReactNode }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-800 text-gray-500 transition-all duration-300 hover:border-emerald-500/50 hover:text-emerald-300"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </a>
  );
}

function PrimaryButton({ children }: { children: ReactNode }) {
  return (
    <Link
      to="/dashboard"
      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-700 px-6 text-sm font-bold text-white shadow-[0_0_42px_rgba(15,118,110,0.22)] transition-all duration-300 hover:border-emerald-300/60 hover:bg-emerald-600"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function SecondaryButton({ children }: { children: ReactNode }) {
  return (
    <Link
      to="/dashboard"
      className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-800 px-6 text-sm font-bold text-gray-200 transition-all duration-300 hover:border-emerald-500/50 hover:text-emerald-300"
    >
      {children}
    </Link>
  );
}
