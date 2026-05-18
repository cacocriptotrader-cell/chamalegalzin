import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  Command,
  FileSpreadsheet,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  component: LandingPage,
});

const NAV_ITEMS = [
  { label: "Produto", href: "#produto" },
  { label: "Ferramentas", href: "#ferramentas" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Segurança", href: "#seguranca" },
];

const HOSPITALS = ["Einstein", "Sírio-Libanês", "Rede D'Or", "BP"];

const FEATURES = [
  {
    title: "Captura Rápida de Plantão",
    label: "Zero fricção",
    body: "Registre plantões em segundos, sem abrir um formulário fiscal no corredor do hospital.",
    icon: <CalendarCheck className="h-5 w-5" />,
  },
  {
    title: "Motor do Fator R",
    label: "Otimização tributária",
    body: "Acompanhe o risco de Anexo V e a proteção do Anexo III com leitura clara para você e seu contador.",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    title: "Conciliação automatizada",
    label: "Para a contabilidade",
    body: "Recebíveis, pagamentos e CSV institucional prontos para reduzir retrabalho no fechamento mensal.",
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    title: "Deduções e glosas",
    label: "Auditoria centavo a centavo",
    body: "Separe retenções, glosas, taxas administrativas e repasses sem misturar caixa com competência.",
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
];

const FOOTER_COLUMNS = [
  { title: "Produto", links: ["Painel", "Calendário", "Recebíveis", "Dossiê Fiscal"] },
  { title: "Fiscal", links: ["Fator R", "Deduções", "CSV Contábil", "Conciliação"] },
  { title: "Empresa", links: ["Segurança", "LGPD", "Termos", "Privacidade"] },
];

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <LandingHeader />
      <HeroSection />
      <SocialProof />
      <FeaturesSection />
      <HowItWorksSection />
      <SecuritySection />
      <FinalCta />
      <LandingFooter />
    </main>
  );
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F172A] text-white shadow-sm">
            <Command className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-[#0F172A]">DocFin</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Wealth Médico</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-[#0F172A]">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="hidden rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-[#0F172A] transition hover:border-[#0F172A] hover:bg-slate-50 sm:inline-flex"
          >
            Entrar
          </Link>
          <Link
            to="/dashboard"
            className="rounded-lg bg-[#0F172A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E293B] hover:shadow-md"
          >
            Solicitar demonstração
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section id="produto" className="overflow-hidden bg-[#F8FAFC] px-5 py-24 md:py-28 lg:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1fr_0.92fr]">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-[#0284C7]" />
            Construído para a rotina de plantões
          </p>

          <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[#0F172A] md:text-6xl lg:text-[4rem]">
            Inteligência contábil para quem vive de{" "}
            <span className="[font-family:'Playfair_Display',serif] italic font-semibold text-[#0284C7]">plantões.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            O DocFin transforma plantões, monitoramento do Fator R, deduções e relatórios prontos para o contador em um fluxo seguro de gestão financeira médica.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton>Solicitar demonstração</PrimaryButton>
            <SecondaryButton href="#como-funciona">Ver como funciona</SecondaryButton>
          </div>

          <div className="mt-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Rotina de confiança para quem atua em</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {HOSPITALS.map((hospital) => (
                <div key={hospital} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 shadow-sm">
                  {hospital}
                </div>
              ))}
            </div>
          </div>
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[430px]">
      <div className="absolute -left-10 top-12 hidden h-56 w-56 rounded-full bg-[#0284C7]/10 blur-3xl md:block" />
      <div className="relative mx-auto w-[min(100%,360px)] rounded-[2.2rem] border border-slate-300 bg-[#0F172A] p-3 shadow-[0_34px_90px_rgba(15,23,42,0.25)]">
        <div className="rounded-[1.65rem] bg-[#020817] p-5 text-white">
          <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-slate-700" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Pendências</p>
              <h2 className="mt-1 text-xl font-bold">Pendências</h2>
            </div>
            <div className="rounded-full bg-[#0284C7]/15 px-3 py-1 text-xs font-bold text-sky-200">Fator R 31%</div>
          </div>

          <div className="mt-5 space-y-3">
            <PhoneInboxRow hospital="Einstein" detail="12h · transporte privado" value="R$ 3.360" />
            <PhoneInboxRow hospital="Sírio" detail="6h · glosa em revisão" value="R$ 1.680" muted />
            <PhoneInboxRow hospital="Rede D'Or" detail="Recebível D+30" value="R$ 2.940" />
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Meta do Fator R</span>
              <span className="font-mono text-sky-200">28%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-[72%] rounded-full bg-[#0284C7]" />
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-400">Projeção de proteção no Anexo III para o mês atual.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialProof() {
  return (
    <section className="border-y border-slate-200 bg-white px-5 py-10">
      <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
        <ProofMetric label="rascunhos de plantão consolidados" value="3 seg" />
        <ProofMetric label="CSV pronto para contabilidade" value="fixo" />
        <ProofMetric label="permissões de médico e contador" value="isoladas" />
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="ferramentas" className="px-5 py-24 md:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          label="Ferramentas de alto nível"
          title={
            <>
              Ferramentas de alto nível para a sua{" "}
              <span className="[font-family:'Playfair_Display',serif] italic font-semibold text-[#0284C7]">rotina médica.</span>
            </>
          }
          body="O produto foi organizado em torno da realidade operacional do médico: capture agora, revise depois e feche o mês com confiança."
        />

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="como-funciona" className="bg-white px-5 py-24 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeader
            label="Implantação"
            title={
              <>
                Migrar para o DocFin é{" "}
                <span className="[font-family:'Playfair_Display',serif] italic font-semibold text-[#0D9488]">sem atrito.</span>
              </>
            }
            body="Sem drama de migração contábil. Cadastre seus hospitais, siga registrando plantões e deixe o mês se transformar em um pacote auditável."
          />

          <div className="mt-10 space-y-5">
            <StepItem number="01" title="Cadastre os hospitais" body="Informe regras de pagamento, valor-hora, regime fiscal e dados que o contador precisa uma única vez." />
            <StepItem number="02" title="Registre plantões em segundos" body="Capture um plantão no corredor do hospital e complete os dados fiscais apenas quando tiver tempo." />
            <StepItem number="03" title="Feche o mês com o contador" body="Exporte um dossiê mensal limpo, apenas com registros consolidados, deduções e datas de pagamento." />
          </div>
        </div>

        <PlatformMockup />
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section id="seguranca" className="bg-[#0F172A] px-5 py-24 text-white md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_0.88fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-200">Segurança & compliance</p>
          <h2 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.04em] md:text-5xl">
            Sigilo médico com permissões de nível contábil.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300">
            O DocFin separa, por desenho, operação médica, acesso contábil e patrimônio pessoal. O médico mantém controle sobre o que é capturado, revisado e exportado.
          </p>

          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            <SecurityPoint icon={<KeyRound className="h-4 w-4" />} title="Permissões isoladas" body="A visão do médico e a visão do contador são separadas para fluxos de conferência somente leitura." />
            <SecurityPoint icon={<Fingerprint className="h-4 w-4" />} title="Postura aderente à LGPD" body="Dados estruturados, consentimento claro e acesso controlado para contadores vinculados." />
          </div>
        </div>

        <SecurityIllustration />
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-[#F8FAFC] px-5 py-24">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#0F172A] p-8 text-white shadow-[0_28px_90px_rgba(15,23,42,0.24)] md:p-14">
        <div className="relative">
          <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border border-sky-400/20" />
          <div className="absolute -right-6 top-20 h-44 w-44 rotate-12 border border-slate-700" />
          <div className="relative max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-200">Comando financeiro privado</p>
            <h2 className="mt-5 text-4xl font-black tracking-[-0.04em] md:text-5xl">
              Assuma o controle da sua vida financeira hoje.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300">
              Substitua planilhas quebradas, comprovantes no WhatsApp e pânico no fim do mês por um sistema financeiro operacional criado para médicos.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/dashboard" className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 text-sm font-bold text-[#0F172A] transition hover:bg-slate-100">
                Solicitar demonstração
              </Link>
              <Link to="/dashboard" className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-600 px-6 text-sm font-bold text-white transition hover:border-sky-300">
                Entrar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="bg-[#020817] px-5 py-14 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.1fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#020817]">
              <Command className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-bold">DocFin</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Wealth Médico</p>
            </div>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-6 text-slate-400">
            Fluxos financeiros e contábeis premium para profissionais médicos.
          </p>
          <div className="mt-6 flex gap-3">
            {["in", "x", "yt"].map((item) => (
              <span key={item} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-xs font-bold text-slate-400">
                {item}
              </span>
            ))}
          </div>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{column.title}</p>
            <div className="mt-4 space-y-3">
              {column.links.map((link) => (
                <a key={link} href="#" className="block text-sm text-slate-400 transition hover:text-white">
                  {link}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}

function SectionHeader({ label, title, body }: { label: string; title: ReactNode; body: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0284C7]">{label}</p>
      <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#0F172A] md:text-5xl">{title}</h2>
      <p className="mt-5 text-base leading-8 text-slate-600">{body}</p>
    </div>
  );
}

function FeatureCard({ title, label, body, icon }: { title: string; label: string; body: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-[#0284C7]">
        {icon}
      </div>
      <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <h3 className="mt-3 text-2xl font-bold tracking-[-0.025em] text-[#0F172A]">{title}</h3>
      <p className="mt-4 text-base leading-7 text-slate-600">{body}</p>
    </div>
  );
}

function StepItem({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F172A] font-mono text-sm font-bold text-white">{number}</div>
      <div>
        <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      </div>
    </div>
  );
}

function PlatformMockup() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-[0_28px_80px_rgba(15,23,42,0.14)]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Painel</p>
            <h3 className="mt-1 text-2xl font-bold text-[#0F172A]">Fechamento de maio</h3>
          </div>
          <BadgeCheck className="h-6 w-6 text-[#0D9488]" />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <MockMetric title="Faturamento bruto" value="R$ 84.200" />
          <MockMetric title="Resultado líquido" value="R$ 52.480" accent />
        </div>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <MockLine label="Einstein · 12h" value="Consolidado" />
          <MockLine label="Sírio · D+30" value="A receber" />
          <MockLine label="Deduções" value="Revisadas" />
        </div>
      </div>
    </div>
  );
}

function SecurityIllustration() {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-6">
      <div className="grid gap-4">
        <SecureNode icon={<Stethoscope className="h-5 w-5" />} title="Área do médico" body="Captura operacional e patrimônio pessoal." />
        <div className="mx-auto h-10 w-px bg-slate-700" />
        <SecureNode icon={<LockKeyhole className="h-5 w-5" />} title="Camada de permissões" body="Acesso explícito do contador e exportações delimitadas." />
        <div className="mx-auto h-10 w-px bg-slate-700" />
        <SecureNode icon={<Building2 className="h-5 w-5" />} title="Escritório contábil" body="Conferência somente leitura, CSV e fechamento mensal." />
      </div>
    </div>
  );
}

function ProofMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5 text-center">
      <p className="font-mono text-2xl font-bold text-[#0F172A]">{value}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
    </div>
  );
}

function PhoneInboxRow({ hospital, detail, value, muted }: { hospital: string; detail: string; value: string; muted?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${muted ? "border-slate-800 bg-slate-900/45" : "border-slate-700 bg-slate-900"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{hospital}</p>
          <p className="mt-1 text-xs text-slate-400">{detail}</p>
        </div>
        <p className="font-mono text-sm font-bold text-sky-200">{value}</p>
      </div>
    </div>
  );
}

function MockMetric({ title, value, accent }: { title: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className={`mt-2 font-mono text-xl font-bold ${accent ? "text-[#0D9488]" : "text-[#0F172A]"}`}>{value}</p>
    </div>
  );
}

function MockLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 py-3 last:border-0">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">{value}</span>
    </div>
  );
}

function SecureNode({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-[#0F172A] p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-200">{icon}</div>
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p>
        </div>
      </div>
    </div>
  );
}

function SecurityPoint({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-200">{icon}</div>
      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
    </div>
  );
}

function PrimaryButton({ children }: { children: ReactNode }) {
  return (
    <Link
      to="/dashboard"
      className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#1E293B] hover:shadow-md"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function SecondaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-bold text-[#0F172A] transition hover:border-[#0F172A] hover:bg-slate-50"
    >
      {children}
    </a>
  );
}
