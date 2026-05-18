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
    title: "Quick Shift Capture",
    label: "Zero fricção",
    body: "Registre plantões em segundos, sem abrir um formulário fiscal no corredor do hospital.",
    icon: <CalendarCheck className="h-5 w-5" />,
  },
  {
    title: "R-Factor Engine",
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
  { title: "Produto", links: ["Dashboard", "Calendário", "Recebíveis", "Dossiê Fiscal"] },
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
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Medical Wealth</p>
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
            Log In
          </Link>
          <Link
            to="/dashboard"
            className="rounded-lg bg-[#0F172A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E293B] hover:shadow-md"
          >
            Get a Demo
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
            Built for medical shifts
          </p>

          <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[#0F172A] md:text-6xl lg:text-[4rem]">
            Accounting intelligence for those who live on{" "}
            <span className="[font-family:'Playfair_Display',serif] italic font-semibold text-[#0284C7]">shifts.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            DocFin turns medical shifts, R-Factor monitoring, deductions and accountant-ready reports into one secure wealth management workflow.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton>Get a Demo</PrimaryButton>
            <SecondaryButton href="#como-funciona">See how it works</SecondaryButton>
          </div>

          <div className="mt-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Trusted routine for teams working with</p>
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
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Inbox</p>
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
              <span className="text-slate-400">R-Factor target</span>
              <span className="font-mono text-sky-200">28%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-[72%] rounded-full bg-[#0284C7]" />
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-400">Projected Anexo III protection for the current month.</p>
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
        <ProofMetric label="shift drafts consolidated" value="3 sec" />
        <ProofMetric label="accountant-ready CSV schema" value="fixed" />
        <ProofMetric label="doctor and accountant permissions" value="isolated" />
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="ferramentas" className="px-5 py-24 md:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          label="High-level tools"
          title={
            <>
              High-level tools for your{" "}
              <span className="[font-family:'Playfair_Display',serif] italic font-semibold text-[#0284C7]">medical routine.</span>
            </>
          }
          body="The product is organized around the exact operational reality of physicians: capture now, review later, close the month with confidence."
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
            label="Onboarding"
            title={
              <>
                Moving to DocFin is{" "}
                <span className="[font-family:'Playfair_Display',serif] italic font-semibold text-[#0D9488]">painless.</span>
              </>
            }
            body="No accounting migration drama. Start with your hospitals, keep capturing shifts, and let the month close itself into an auditable package."
          />

          <div className="mt-10 space-y-5">
            <StepItem number="01" title="Register hospitals" body="Add payment rules, hourly rate, legal regime and accountant-facing details once." />
            <StepItem number="02" title="Log shifts in seconds" body="Capture a shift from the hospital corridor and complete fiscal fields only when you have time." />
            <StepItem number="03" title="Close with your accountant" body="Export a clean monthly dossier with only consolidated records, deductions and payment dates." />
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
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-200">Security & compliance</p>
          <h2 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.04em] md:text-5xl">
            Medical confidentiality meets accounting-grade permissions.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300">
            DocFin keeps doctor operations, accountant access and personal wealth data separated by design. The physician stays in control of what is captured, reviewed and exported.
          </p>

          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            <SecurityPoint icon={<KeyRound className="h-4 w-4" />} title="Isolated permissions" body="Doctor view and accountant view are separated for review-only workflows." />
            <SecurityPoint icon={<Fingerprint className="h-4 w-4" />} title="LGPD-ready posture" body="Structured data, clear consent and controlled access for linked accountants." />
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-200">Private financial command</p>
            <h2 className="mt-5 text-4xl font-black tracking-[-0.04em] md:text-5xl">
              Take control of your financial life today.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300">
              Replace fragmented spreadsheets, WhatsApp receipts and month-end panic with one operational finance system built for doctors.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/dashboard" className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 text-sm font-bold text-[#0F172A] transition hover:bg-slate-100">
                Get a Demo
              </Link>
              <Link to="/dashboard" className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-600 px-6 text-sm font-bold text-white transition hover:border-sky-300">
                Log In
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
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Medical Wealth</p>
            </div>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-6 text-slate-400">
            Premium financial and accounting workflows for medical professionals.
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Dashboard</p>
            <h3 className="mt-1 text-2xl font-bold text-[#0F172A]">May closing</h3>
          </div>
          <BadgeCheck className="h-6 w-6 text-[#0D9488]" />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <MockMetric title="Gross revenue" value="R$ 84.200" />
          <MockMetric title="Net result" value="R$ 52.480" accent />
        </div>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <MockLine label="Einstein · 12h" value="Consolidated" />
          <MockLine label="Sírio · D+30" value="Receivable" />
          <MockLine label="Deductions" value="Reviewed" />
        </div>
      </div>
    </div>
  );
}

function SecurityIllustration() {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-6">
      <div className="grid gap-4">
        <SecureNode icon={<Stethoscope className="h-5 w-5" />} title="Doctor workspace" body="Operational capture and personal wealth." />
        <div className="mx-auto h-10 w-px bg-slate-700" />
        <SecureNode icon={<LockKeyhole className="h-5 w-5" />} title="Permission layer" body="Explicit accountant access and scoped exports." />
        <div className="mx-auto h-10 w-px bg-slate-700" />
        <SecureNode icon={<Building2 className="h-5 w-5" />} title="Accounting office" body="Read-only review, CSV and monthly close." />
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
