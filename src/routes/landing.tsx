import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck,
  Command,
  FileSpreadsheet,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  component: LandingPage,
});

const NAV_ITEMS = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Otimização Fiscal", href: "#otimizacao-fiscal" },
  { label: "Para Contadores", href: "#para-contadores" },
  { label: "Segurança", href: "#seguranca" },
];

const TRUST_LOGOS = ["Einstein", "Sírio-Libanês", "Rede D'Or", "BP", "Mater Dei"];

const VALUE_PROPS = [
  {
    title: "Captura Efêmera de Plantões",
    description:
      "Registre fluxos de caixas e plantões em 3 segundos direto do hospital. Fricção zero na rotina médica, eliminando planilhas obsoletas e perdas financeiras por esquecimento.",
    icon: <CalendarCheck className="h-5 w-5" />,
  },
  {
    title: "Algoritmo de Blindagem Fiscal (Fator R)",
    description:
      "Cálculo em tempo real do seu RBT12 e FS12. O sistema avisa o momento exato de calibrar seu pró-labore para manter sua clínica no Anexo III, pagando a menor alíquota legal de imposto.",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    title: "Cockpit do Contador (Fricção Zero)",
    description:
      "Um portal exclusivo de leitura (Read-Only) para o seu escritório contábil. Seu contador baixa relatórios consolidados em lote (CSV/OFX) sem precisar te enviar mensagens cobrando comprovantes no fim do mês.",
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    title: "Raio-X de Endividamento e Patrimônio",
    description:
      "Análise de balanço patrimonial via inteligência artificial com processamento efêmero da sua DIRPF. Entenda seu patrimônio líquido real sem que seus dados sensíveis fiquem armazenados de forma permanente na nuvem.",
    icon: <WalletCards className="h-5 w-5" />,
  },
];

const FOOTER_COLUMNS = [
  { title: "Produto", links: ["Funcionalidades", "Cockpit Médico", "Dossiê Fiscal", "Painel Contábil"] },
  { title: "Soluções", links: ["Fator R", "Recebíveis", "DIRPF", "Exportação CSV/OFX"] },
  { title: "Legal", links: ["Termos", "Privacidade", "LGPD", "Segurança"] },
];

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0A1128] text-[#F8FAFC]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_6%,rgba(6,182,212,0.14),transparent_32rem),radial-gradient(circle_at_82%_18%,rgba(16,185,129,0.10),transparent_28rem),linear-gradient(180deg,#0A1128_0%,#020617_100%)]" />
      <LandingHeader />
      <HeroSection />
      <TrustBand />
      <ValuePropositionSection />
      <HowItWorksSection />
      <SecuritySection />
      <FinalCta />
      <LandingFooter />
    </main>
  );
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#020617]/78 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300 shadow-[0_0_34px_rgba(6,182,212,0.18)]">
            <Command className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight text-slate-50">DocFin</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Premium Medical Finance</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-400 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-cyan-300">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="hidden rounded-xl border border-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/50 hover:text-slate-50 sm:inline-flex"
          >
            Entrar
          </Link>
          <Link
            to="/dashboard"
            className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 shadow-[0_0_34px_rgba(6,182,212,0.16)] transition hover:border-cyan-300/70 hover:bg-cyan-400/15"
          >
            Agendar Demonstração
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section id="produto" className="px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.03fr_0.97fr]">
        <div>
          <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-300">
            <ShieldCheck className="h-4 w-4" />
            INTELIGÊNCIA PATRIMONIAL PARA MÉDICOS
          </p>

          <h1 className="max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-slate-50 md:text-6xl lg:text-[4.55rem]">
            A engenharia contábil que protege o seu faturamento entre um{" "}
            <span className="[font-family:'Playfair_Display',serif] font-semibold italic text-cyan-300">plantão</span>{" "}
            e outro.
          </h1>

          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-400 md:text-xl md:leading-9">
            Automatize a captura dos seus recebíveis, blinde sua empresa contra o Leão e reduza em até 60% os seus impostos médicos através do monitoramento inteligente do Fator R.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton>Começar Agora Gratuitamente</PrimaryButton>
            <SecondaryButton>Falar com Especialista</SecondaryButton>
          </div>
        </div>

        <HeroPhoneMockup />
      </div>
    </section>
  );
}

function HeroPhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="absolute -left-10 top-12 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute -right-8 bottom-8 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative mx-auto w-[min(100%,390px)] rounded-[2.25rem] border border-slate-700/90 bg-[#020617] p-3 shadow-[0_42px_120px_rgba(0,0,0,0.52)]">
        <div className="overflow-hidden rounded-[1.7rem] border border-slate-800 bg-[#0A1128] p-5">
          <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-slate-700" />

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Cockpit Fiscal</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-50">Fator R</h2>
            </div>
            <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-300">
              Anexo III Garantido
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0F172A] p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Fator R - Anexo III Garantido</p>
                <p className="mt-2 font-mono text-4xl font-semibold text-emerald-300">31,4%</p>
              </div>
              <Sparkles className="h-5 w-5 text-cyan-300" />
            </div>
            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300" />
            </div>
            <div className="mt-3 flex justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <span>Alvo 28%</span>
              <span>Seguro</span>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Inbox de Plantões</p>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold text-cyan-300">3 pendências</span>
            </div>
            <div className="space-y-3">
              <PhoneInboxRow hospital="Einstein" detail="12h · transporte privado" value="R$ 3.360" />
              <PhoneInboxRow hospital="Sírio-Libanês" detail="D+30 · aguardando repasse" value="R$ 2.940" />
              <PhoneInboxRow hospital="Rede D'Or" detail="glosa em revisão" value="R$ 1.680" muted />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustBand() {
  return (
    <section className="border-y border-slate-800/80 bg-[#020617]/62 px-5 py-12 md:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-sm font-medium text-slate-400">
          Consolidando a contabilidade médica nos principais centros hospitalares do país.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TRUST_LOGOS.map((logo) => (
            <div
              key={logo}
              className="flex h-16 items-center justify-center rounded-2xl border border-slate-800 bg-[#0F172A]/72 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 grayscale transition hover:border-cyan-400/30 hover:text-slate-300"
            >
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ValuePropositionSection() {
  return (
    <section id="funcionalidades" className="px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Arquitetura de valor"
          title={
            <>
              O sistema operacional financeiro do médico{" "}
              <span className="[font-family:'Playfair_Display',serif] font-semibold italic text-cyan-300">especialista.</span>
            </>
          }
          body="Cada módulo foi desenhado para proteger receita, reduzir ruído contábil e transformar plantões dispersos em inteligência patrimonial acionável."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {VALUE_PROPS.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="otimizacao-fiscal" className="border-y border-slate-800/70 bg-[#0F172A]/60 px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeader
            eyebrow="Onboarding de elite"
            title="Sua transição para o topo da eficiência financeira."
            body="A implantação preserva sua rotina. O DocFin entende a separação PJ/PF, reduz digitação e entrega o fechamento organizado para quem precisa auditar."
          />
        </div>

        <div className="space-y-4">
          <StepItem number="01" text="Conecte sua estrutura jurídica (PJ/PF)" />
          <StepItem number="02" text="Alimente os plantões com um clique ou comando de voz" />
          <StepItem number="03" text="Deixe o sistema orquestrar o fechamento com seu contador" />
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section id="seguranca" className="bg-[#030712] px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1fr_0.85fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Segurança & Privacidade</p>
          <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-slate-50 md:text-5xl">
            Segurança institucional de nível bancário.
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-400 md:text-lg">
            Criptografia de ponta a ponta e isolamento absoluto de dados com Row Level Security (RLS). Suas informações operacionais e relatórios contábeis são protegidos sob as mais rígidas diretrizes da LGPD, garantindo que o controle de visibilidade esteja sempre em suas mãos.
          </p>
        </div>

        <SecurityPanel />
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-5 py-24 md:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[#0F172A] p-8 shadow-[0_44px_120px_rgba(0,0,0,0.36)] md:p-16">
        <div className="relative">
          <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full border border-cyan-400/20" />
          <div className="absolute -right-4 top-16 h-52 w-52 rotate-12 border border-emerald-400/15" />
          <div className="relative max-w-4xl">
            <h2 className="text-4xl font-semibold tracking-[-0.04em] text-slate-50 md:text-6xl">
              O padrão ouro da gestão financeira médica está aqui.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              Junte-se aos profissionais médicos que escalaram o controle de seus ativos.
            </p>
            <div className="mt-10">
              <PrimaryButton>Quero Blindar Meu Faturamento</PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="bg-[#020617] px-5 py-14 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.35fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
              <Command className="h-4.5 w-4.5" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-semibold text-slate-50">DocFin</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Premium Medical Finance</p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
            Inteligência financeira de alta performance para a medicina moderna.
          </p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{column.title}</p>
            <div className="mt-4 space-y-3">
              {column.links.map((link) => (
                <a key={link} href="#" className="block text-sm text-slate-400 transition hover:text-cyan-300">
                  {link}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-5 border-t border-slate-900 pt-7 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>© 2026 DocFin. Todos os direitos reservados. Website institucional corporativo. DOCFIN_INSTITUTIONAL_NAVY_2026-05-17-19_WORK.</p>
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
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">{eyebrow}</p>
      <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-slate-50 md:text-5xl">{title}</h2>
      <p className="mt-6 max-w-3xl text-base leading-8 text-slate-400">{body}</p>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: ReactNode }) {
  return (
    <div className="group rounded-2xl border border-slate-800 bg-[#16223E]/88 p-7 shadow-[0_20px_70px_rgba(0,0,0,0.22)] transition hover:-translate-y-1 hover:border-cyan-400/35 hover:bg-[#1E2B4B]/88">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 transition group-hover:border-cyan-300/50">
        {icon}
      </div>
      <h3 className="mt-7 text-2xl font-semibold tracking-[-0.03em] text-slate-50">{title}</h3>
      <p className="mt-4 text-base leading-7 text-slate-400">{description}</p>
    </div>
  );
}

function StepItem({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-5 rounded-2xl bg-[#16223E]/72 px-5 py-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 font-mono text-sm font-semibold text-cyan-300">
        {number}
      </span>
      <p className="text-base font-medium text-slate-200">{text}</p>
    </div>
  );
}

function SecurityPanel() {
  return (
    <div className="relative rounded-[2rem] border border-slate-800 bg-[#0A1128] p-6 shadow-[0_34px_100px_rgba(0,0,0,0.34)]">
      <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.16),transparent_18rem)]" />
      <div className="relative space-y-4">
        <SecurityNode icon={<LockKeyhole className="h-5 w-5" />} title="Criptografia de ponta a ponta" body="Dados operacionais e contábeis protegidos em todas as camadas do fluxo." />
        <SecurityNode icon={<Fingerprint className="h-5 w-5" />} title="Row Level Security (RLS)" body="Cada médico acessa apenas seu próprio perímetro financeiro e patrimonial." />
        <SecurityNode icon={<Building2 className="h-5 w-5" />} title="Permissões isoladas" body="O contador opera em visão de leitura, sem alterar a rotina médica." />
      </div>
    </div>
  );
}

function PhoneInboxRow({ hospital, detail, value, muted }: { hospital: string; detail: string; value: string; muted?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${muted ? "border-slate-800 bg-slate-900/45" : "border-slate-700 bg-slate-900"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-50">{hospital}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <p className="font-mono text-sm font-semibold text-emerald-300">{value}</p>
      </div>
    </div>
  );
}

function SecurityNode({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-slate-50">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p>
        </div>
      </div>
    </div>
  );
}

function SocialIcon({ label, children }: { label: string; children: ReactNode }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 text-slate-500 transition hover:border-cyan-400/50 hover:text-cyan-300"
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
      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/12 px-6 text-sm font-bold text-emerald-200 shadow-[0_0_34px_rgba(16,185,129,0.16)] transition hover:border-emerald-300/55 hover:bg-emerald-400/18"
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
      className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 px-6 text-sm font-bold text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-200"
    >
      {children}
    </Link>
  );
}
