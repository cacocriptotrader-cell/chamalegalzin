import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, type ReactNode } from "react";
import {
  brl,
  brl2,
  calculateIRRF2026,
  calculateRPAWithholding,
  computeShift,
  computedProLaboreMonthly,
  FATOR_R_PROLABORE_RATIO,
  getEffectiveSimpleRate,
  getCurrentMonthRegimeTotal,
  PROLABORE_INSS_RATE,
  remainingINSSBaseAfterCLT,
  round2,
  TAX_RATE,
  useStore,
  type StoreState,
  type TaxRegime,
} from "@/lib/store";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  FileText,
  PieChart,
  PlusCircle,
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
  const financialSummary = useMemo(() => getFinancialSummarySnapshot(store, now), [store, now]);
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
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
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
          <FinancialSummaryWidget summary={financialSummary} />
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
            <div key={event.id} className="rounded-2xl border border-border bg-surface-elevated p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${event.tone === "emerald" ? "bg-success" : event.tone === "blue" ? "bg-sky-300" : "bg-amber-300"}`} />
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {event.kind} · {formatEventDate(event.date)}
                    </p>
                  </div>
                  <h3 className="text-base font-semibold mt-2 truncate">{event.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.subtitle}</p>
                </div>
                <p className="font-display text-xl text-success tabular-nums shrink-0">{brl(event.value)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </CockpitCard>
  );
}

function FinancialSummaryWidget({ summary }: { summary: ReturnType<typeof getFinancialSummarySnapshot> }) {
  const totalContribution = Math.abs(summary.pjNet) + Math.abs(summary.pfNet);
  const pjShare = totalContribution > 0 ? (Math.abs(summary.pjNet) / totalContribution) * 100 : 50;
  const pfShare = totalContribution > 0 ? 100 - pjShare : 50;
  const resultTone = summary.consolidatedNet >= 0 ? "text-primary" : "text-rose-200";
  const badgeClass = summary.factorTone === "safe"
    ? "border-success/30 bg-success/10 text-success"
    : summary.factorTone === "risk"
      ? "border-amber-300/25 bg-amber-400/10 text-amber-200"
      : "border-border bg-surface-elevated text-muted-foreground";

  return (
    <CockpitCard
      eyebrow="Bottom line"
      title="Resultado líquido do mês"
      icon={<CircleDollarSign className="h-5 w-5" />}
      action={<CardLink to="/fechamento">Dossiê</CardLink>}
    >
      <div className="rounded-2xl border border-border bg-surface-elevated p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Resultado consolidado</p>
            <p className={`font-display text-4xl mt-2 tabular-nums ${resultTone}`}>
              {brl(summary.consolidatedNet)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Líquido PJ + líquido PF no mês atual.</p>
          </div>
          <div className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${badgeClass}`}>
            {summary.factorBadge}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <FinancialBreakdownRow label="Líquido PJ" value={summary.pjNet} />
          <FinancialBreakdownRow label="Líquido PF" value={summary.pfNet} />
        </div>

        <div className="mt-5">
          <div className="h-3 rounded-full bg-surface overflow-hidden flex border border-border">
            <div className="h-full bg-primary" style={{ width: `${pjShare}%` }} />
            <div className="h-full bg-sky-300" style={{ width: `${pfShare}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
            <span>PJ {pjShare.toFixed(0)}%</span>
            <span>PF {pfShare.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <MiniMetric label="Faturamento PJ" value={brl2(summary.pjRevenue)} />
        <MiniMetric label="Impostos" value={brl2(summary.totalTaxes)} tone="danger" />
        <MiniMetric label="Custos PJ" value={brl2(summary.pjCosts)} />
        <MiniMetric label="Pró-labore líquido" value={brl2(summary.proLaboreNet)} tone="success" />
      </div>
    </CockpitCard>
  );
}

function FinancialBreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm font-semibold tabular-nums ${value >= 0 ? "text-foreground" : "text-rose-200"}`}>
        {brl2(value)}
      </span>
    </div>
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
        className="rounded-2xl p-5 border border-border overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(222,255,154,0.14), rgba(38,38,38,0.92) 55%, rgba(212,175,55,0.10))",
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Patrimônio líquido</p>
        <p className={`font-display text-4xl mt-2 tabular-nums ${wealth.netWorth >= 0 ? "text-success" : "text-rose-200"}`}>
          {brl(wealth.netWorth)}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Última visão consolidada a partir dos bens e dívidas salvos no Cofre.
        </p>

        {hasWealthData ? (
          <div className="mt-5">
            <div className="h-3 rounded-full bg-surface overflow-hidden flex border border-border">
              <div className="h-full bg-success" style={{ width: `${wealth.assetShare}%` }} />
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
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
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
          <div className="h-11 w-11 rounded-2xl border border-border bg-card flex items-center justify-center text-primary">
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
      className="glass-card rounded-2xl border border-border/60 p-4 flex items-center justify-between gap-3 hover:border-primary/40 hover:bg-primary/[0.04] transition"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
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
    <Link to={to} className="text-xs text-primary inline-flex items-center gap-1 hover:text-primary/80 transition">
      {children}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

function MiniMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "success" | "danger" }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono text-sm font-semibold mt-1 tabular-nums ${tone === "success" ? "text-success" : tone === "danger" ? "text-rose-200" : "text-foreground"}`}>
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
    <div className="rounded-2xl border border-dashed border-border/70 bg-card min-h-[260px] flex flex-col items-center justify-center text-center px-6">
      <div className="h-12 w-12 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center text-muted-foreground">
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

function getFinancialSummarySnapshot(store: StoreState, now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const manualProLabore = store.proLabores.reduce((sum, item) => sum + (item.monthly || 0), 0);
  const automaticProLabore = computedProLaboreMonthly(store, now);
  const proLaboreGross = Math.max(manualProLabore, automaticProLabore);
  const proLaboreInssBase = Math.min(proLaboreGross, remainingINSSBaseAfterCLT(store));
  const proLaboreInss = round2(proLaboreInssBase * PROLABORE_INSS_RATE);
  const proLaboreIrrf = calculateIRRF2026(proLaboreGross, proLaboreInss);
  const proLaboreTaxes = round2(proLaboreInss + proLaboreIrrf);
  const proLaboreNet = round2(Math.max(0, proLaboreGross - proLaboreTaxes));
  const simplesRevenue = getCurrentMonthRegimeTotal(store, year, month, ["PJ_SIMPLES"]);
  const pjRevenue = getCurrentMonthRegimeTotal(store, year, month, ["PJ_SIMPLES", "PJ_LUCRO_PRESUMIDO"]);
  const simpleRate = getEffectiveSimpleRate(simplesRevenue, proLaboreGross);
  const factorTarget = simplesRevenue * FATOR_R_PROLABORE_RATIO;
  const factorSafe = simplesRevenue > 0 && proLaboreGross >= factorTarget;
  const factorBadge = simplesRevenue <= 0 ? "Sem PJ Simples" : factorSafe ? "Anexo III (OK)" : "Anexo V (risco)";
  const factorTone = simplesRevenue <= 0 ? "neutral" : factorSafe ? "safe" : "risk";

  let pjTax = 0;
  let pfWorkRevenue = 0;
  let pfTax = 0;

  const addRevenueByRegime = (gross: number, regime: TaxRegime) => {
    const amount = Math.max(0, gross || 0);
    if (amount <= 0) return;

    if (regime === "PJ_SIMPLES") {
      pjTax += amount * simpleRate;
      return;
    }

    if (regime === "PJ_LUCRO_PRESUMIDO") {
      pjTax += amount * TAX_RATE.PJ_LUCRO_PRESUMIDO;
      return;
    }

    pfWorkRevenue += amount;
    if (regime === "PF" || regime === "RPA") {
      pfTax += calculateRPAWithholding(amount, store).total;
    } else if (regime === "CLT") {
      pfTax += calculateIRRF2026(amount, 0);
    }
  };

  for (const shift of store.shifts) {
    if (!isInMonth(shift.date, year, month)) continue;
    const workplace = store.workplaces.find((item) => item.id === shift.workplaceId);
    if (!workplace) continue;
    addRevenueByRegime(shift.gross, workplace.regime);
  }

  for (const surgery of store.surgeries) {
    if (!isInMonth(surgery.date, year, month)) continue;
    if (surgery.myRole === "TITULAR") {
      const workplace = store.workplaces.find((item) => item.id === surgery.hospitalId);
      if (workplace) addRevenueByRegime(surgery.totalGross, workplace.regime);
    } else {
      pfWorkRevenue += Math.max(0, surgery.myExpectedShare || 0);
      pfTax += calculateRPAWithholding(surgery.myExpectedShare, store).total;
    }
  }

  const pjCosts = store.fixedCosts
    .filter((cost) => cost.entityDomain === "PJ")
    .reduce((sum, cost) => sum + (cost.monthly || 0), 0);
  const pjNet = round2(pjRevenue - pjTax - pjCosts);
  const pfWorkNet = round2(pfWorkRevenue - pfTax);
  const pfRevenue = round2(proLaboreNet + pfWorkRevenue);
  const pfNet = round2(proLaboreNet + pfWorkNet);

  return {
    pjRevenue: round2(pjRevenue),
    pjTax: round2(pjTax),
    pjCosts: round2(pjCosts),
    pjNet,
    pfRevenue,
    pfWorkRevenue: round2(pfWorkRevenue),
    pfTax: round2(pfTax),
    pfNet,
    proLaboreGross: round2(proLaboreGross),
    proLaboreNet,
    proLaboreTaxes,
    totalTaxes: round2(pjTax + pfTax + proLaboreTaxes),
    consolidatedNet: round2(pjNet + pfNet),
    factorBadge,
    factorTone,
  };
}

function isInMonth(iso: string, year: number, month: number) {
  const date = new Date(`${iso}T12:00:00`);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

function formatEventDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}
