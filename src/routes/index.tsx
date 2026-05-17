import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, type ReactNode } from "react";
import {
  brl,
  brl2,
  computeShift,
  computedProLaboreMonthly,
  FATOR_R_PROLABORE_RATIO,
  getCurrentMonthRegimeTotal,
  useStore,
  type StoreState,
} from "@/lib/store";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  PieChart,
  PlusCircle,
  ShieldAlert,
  Stethoscope,
  UploadCloud,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cockpit — Docfin" },
      { name: "description", content: "Central de comando com operação, fiscal e patrimônio do médico." },
    ],
  }),
  component: Dashboard,
});

type OperationEvent = {
  id: string;
  date: string;
  kind: "Plantão" | "Cirurgia";
  title: string;
  subtitle: string;
  value: number;
  tone: "emerald" | "blue" | "gold";
};

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function Dashboard() {
  const store = useStore();
  const firstName = store.userProfile.fullName.trim().split(/\s+/)[0] || "Doutor(a)";
  const now = new Date();

  const operationEvents = useMemo(() => getUpcomingOperationEvents(store), [store]);
  const fiscal = useMemo(() => getFiscalSnapshot(store, now), [store, now]);
  const wealth = useMemo(() => getWealthSnapshot(store), [store]);

  return (
    <div className="px-0 py-5 md:py-7 space-y-5 animate-fade-in">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Central de comando</p>
          <h1 className="font-display text-3xl md:text-4xl text-gradient mt-1">Hoje, {firstName}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Operação médica, backoffice fiscal e vida patrimonial consolidados em uma leitura de elevador.
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-white/[0.035] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Mês atual</p>
          <p className="text-sm font-medium capitalize">
            {now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
        </div>
      </header>

      <QuickActions />

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <OperationWidget events={operationEvents} />
        </div>
        <div className="lg:col-span-5 grid gap-4">
          <FiscalWidget fiscal={fiscal} />
          <WealthWidget wealth={wealth} />
        </div>
      </section>
    </div>
  );
}

function QuickActions() {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <QuickAction
        to="/novo-registro"
        icon={<PlusCircle className="h-4 w-4" />}
        label="Lançar Plantão"
        description="Plantão ou cirurgia"
      />
      <QuickAction
        to="/patrimonio"
        icon={<UploadCloud className="h-4 w-4" />}
        label="Importar PDF"
        description="DIRPF e patrimônio"
      />
      <QuickAction
        to="/fechamento"
        icon={<FileText className="h-4 w-4" />}
        label="Ver Dossiê Fiscal"
        description="Fechamento mensal"
      />
    </section>
  );
}

function OperationWidget({ events }: { events: OperationEvent[] }) {
  return (
    <CockpitCard
      eyebrow="Operação médica"
      title="Próximos compromissos"
      icon={<CalendarDays className="h-5 w-5" />}
      action={<CardLink to="/calendario">Ver calendário</CardLink>}
      className="h-full"
    >
      {events.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-5 w-5" />}
          title="Nenhum plantão futuro"
          body="Registre seus próximos plantões ou cirurgias para enxergar receita projetada e fluxo operacional."
          to="/novo-registro"
          cta="Lançar primeiro registro"
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${event.tone === "emerald" ? "bg-emerald-300" : event.tone === "blue" ? "bg-sky-300" : "bg-amber-300"}`} />
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {event.kind} · {formatEventDate(event.date)}
                    </p>
                  </div>
                  <h3 className="text-base font-semibold mt-2 truncate">{event.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.subtitle}</p>
                </div>
                <p className="font-display text-xl text-emerald-200 tabular-nums shrink-0">{brl(event.value)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </CockpitCard>
  );
}

function FiscalWidget({ fiscal }: { fiscal: ReturnType<typeof getFiscalSnapshot> }) {
  const tone = !fiscal.hasRevenue ? "neutral" : fiscal.isSafe ? "safe" : "risk";
  const statusLabel = !fiscal.hasRevenue ? "Sem PJ Simples" : fiscal.isSafe ? "Anexo III" : "Anexo V";
  const statusText = !fiscal.hasRevenue
    ? "Sem faturamento PJ Simples no mês."
    : fiscal.isSafe
      ? "Fator R atingido. Tributação estimada no Anexo III."
      : `Faltam ${brl2(fiscal.missing)} de pró-labore para voltar ao Anexo III.`;

  return (
    <CockpitCard
      eyebrow="Backoffice PJ"
      title="Monitor Fator R"
      icon={fiscal.isSafe ? <CheckCircle2 className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
      action={<CardLink to="/fechamento">Dossiê</CardLink>}
    >
      <div className={`rounded-2xl border p-4 ${tone === "safe" ? "border-emerald-300/25 bg-emerald-400/10" : tone === "risk" ? "border-amber-300/25 bg-amber-400/10" : "border-white/[0.07] bg-black/20"}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Status atual</p>
            <p className={`font-display text-2xl mt-1 ${tone === "safe" ? "text-emerald-200" : tone === "risk" ? "text-amber-200" : "text-muted-foreground"}`}>
              {statusLabel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Fator R</p>
            <p className="font-mono text-sm mt-1">{fiscal.factorPercent.toFixed(1)}%</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
            <span>Progresso até 28%</span>
            <span>{Math.min(100, fiscal.progress).toFixed(0)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-black/30 overflow-hidden border border-white/[0.06]">
            <div
              className={`h-full rounded-full transition-all ${tone === "safe" ? "bg-emerald-300" : tone === "risk" ? "bg-amber-300" : "bg-muted-foreground/50"}`}
              style={{ width: `${fiscal.progress}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">{statusText}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <MiniMetric label="Faturamento mês" value={brl2(fiscal.pjRevenue)} />
        <MiniMetric label="Pró-labore" value={brl2(fiscal.currentProLabore)} />
      </div>
    </CockpitCard>
  );
}

function WealthWidget({ wealth }: { wealth: ReturnType<typeof getWealthSnapshot> }) {
  const hasWealthData = wealth.totalAssets > 0 || wealth.totalLiabilities > 0;

  return (
    <CockpitCard
      eyebrow="Vida PF"
      title="Net Worth"
      icon={<PieChart className="h-5 w-5" />}
      action={<CardLink to="/patrimonio">Patrimônio</CardLink>}
    >
      <div
        className="rounded-2xl p-5 border border-emerald-300/15 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.16), rgba(15,23,42,0.74) 55%, rgba(202,169,92,0.12))",
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-100/70">Patrimônio líquido</p>
        <p className={`font-display text-4xl mt-2 tabular-nums ${wealth.netWorth >= 0 ? "text-emerald-100" : "text-rose-200"}`}>
          {brl(wealth.netWorth)}
        </p>
        <p className="text-xs text-emerald-50/65 mt-2">
          Última visão consolidada a partir dos bens e dívidas salvos no Cofre.
        </p>

        {hasWealthData ? (
          <div className="mt-5">
            <div className="h-3 rounded-full bg-black/30 overflow-hidden flex border border-white/10">
              <div className="h-full bg-emerald-300" style={{ width: `${wealth.assetShare}%` }} />
              <div className="h-full bg-rose-300" style={{ width: `${wealth.liabilityShare}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <MiniMetric label={`${wealth.assetCount} bens`} value={brl(wealth.totalAssets)} tone="success" />
              <MiniMetric label={`${wealth.liabilityCount} dívidas`} value={brl(wealth.totalLiabilities)} tone="danger" />
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <Link
              to="/patrimonio"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-200 transition"
            >
              <UploadCloud className="h-4 w-4" />
              Importar DIRPF
            </Link>
          </div>
        )}
      </div>
    </CockpitCard>
  );
}

function CockpitCard({
  eyebrow,
  title,
  icon,
  action,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass-card rounded-3xl border border-border/60 p-5 md:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/[0.045] flex items-center justify-center text-emerald-200">
            {icon}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
            <h2 className="font-display text-xl mt-0.5">{title}</h2>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function QuickAction({
  to,
  icon,
  label,
  description,
}: {
  to: "/" | "/novo-registro" | "/patrimonio" | "/fechamento";
  icon: ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="glass-card rounded-2xl border border-border/60 p-4 flex items-center justify-between gap-3 hover:border-emerald-300/30 hover:bg-emerald-400/[0.04] transition"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-emerald-400/10 border border-emerald-300/15 flex items-center justify-center text-emerald-200">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

function CardLink({ to, children }: { to: "/" | "/calendario" | "/fechamento" | "/patrimonio"; children: ReactNode }) {
  return (
    <Link to={to} className="text-xs text-emerald-200 inline-flex items-center gap-1 hover:text-emerald-100 transition">
      {children}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

function MiniMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "success" | "danger" }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono text-sm font-semibold mt-1 tabular-nums ${tone === "success" ? "text-emerald-200" : tone === "danger" ? "text-rose-200" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
  to,
  cta,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  to: "/novo-registro" | "/patrimonio";
  cta: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-white/[0.025] min-h-[260px] flex flex-col items-center justify-center text-center px-6">
      <div className="h-12 w-12 rounded-2xl bg-white/[0.045] border border-white/10 flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <h3 className="font-display text-lg mt-4">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mt-2">{body}</p>
      <Link
        to={to}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border/70 px-4 py-2 text-sm font-medium hover:bg-muted/40 transition"
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function getUpcomingOperationEvents(store: StoreState): OperationEvent[] {
  const today = todayIso();
  const events: OperationEvent[] = [];

  for (const shift of store.shifts) {
    if (shift.date < today) continue;
    const workplace = store.workplaces.find((item) => item.id === shift.workplaceId);
    const math = computeShift(store, shift);
    events.push({
      id: `shift-${shift.id}`,
      date: shift.date,
      kind: "Plantão",
      title: workplace?.name ?? "Hospital não cadastrado",
      subtitle: `${shift.hours}h · líquido projetado`,
      value: math.net,
      tone: "emerald",
    });
  }

  for (const surgery of store.surgeries) {
    if (surgery.date < today) continue;
    if (surgery.myRole === "TITULAR") {
      const workplace = store.workplaces.find((item) => item.id === surgery.hospitalId);
      events.push({
        id: `surgery-${surgery.id}`,
        date: surgery.date,
        kind: "Cirurgia",
        title: workplace?.name ?? "Hospital não cadastrado",
        subtitle: surgery.procedure || "Procedimento titular",
        value: surgery.totalGross,
        tone: "blue",
      });
    } else {
      events.push({
        id: `surgery-${surgery.id}`,
        date: surgery.date,
        kind: "Cirurgia",
        title: surgery.payingSurgeonName || "Repasse de equipe",
        subtitle: surgery.procedure || "Procedimento como membro",
        value: surgery.myExpectedShare,
        tone: "gold",
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || b.value - a.value).slice(0, 3);
}

function getFiscalSnapshot(store: StoreState, now: Date) {
  const pjRevenue = getCurrentMonthRegimeTotal(store, now.getFullYear(), now.getMonth() + 1, ["PJ_SIMPLES"]);
  const manualProLabore = store.proLabores.reduce((sum, item) => sum + (item.monthly || 0), 0);
  const automaticProLabore = computedProLaboreMonthly(store, now);
  const currentProLabore = Math.max(manualProLabore, automaticProLabore);
  const target = pjRevenue * FATOR_R_PROLABORE_RATIO;
  const factorPercent = pjRevenue > 0 ? (currentProLabore / pjRevenue) * 100 : 0;
  const progress = target > 0 ? Math.min(100, (currentProLabore / target) * 100) : 0;

  return {
    pjRevenue,
    currentProLabore,
    target,
    factorPercent,
    progress,
    missing: Math.max(0, target - currentProLabore),
    hasRevenue: pjRevenue > 0,
    isSafe: pjRevenue > 0 && currentProLabore >= target,
  };
}

function getWealthSnapshot(store: StoreState) {
  const totalAssets = store.assets.reduce((sum, item) => sum + item.currentValue, 0);
  const totalLiabilities = store.liabilities.reduce((sum, item) => sum + item.remainingBalance, 0);
  const denominator = totalAssets + totalLiabilities;
  const assetShare = denominator > 0 ? (totalAssets / denominator) * 100 : 0;
  const liabilityShare = denominator > 0 ? (totalLiabilities / denominator) * 100 : 0;

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    assetCount: store.assets.length,
    liabilityCount: store.liabilities.length,
    assetShare,
    liabilityShare,
  };
}

function formatEventDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}
