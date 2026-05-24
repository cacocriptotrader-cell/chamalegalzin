import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BriefcaseBusiness,
  Calculator,
  CircleDollarSign,
  Landmark,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  brl,
  brl2,
  calculatePGBLAdvantage,
  computeShift,
  estimateAnnualIRPF2026,
  getRollingFatorRSnapshot,
  globalIncomeMonthly,
  inssCeilingReachedByCLT,
  isPJFocused,
  monthlyFixedIncomeNet,
  monthlyFixedTotal,
  useStore,
  type StoreState,
} from "@/lib/store";

export const Route = createFileRoute("/futuro")({
  head: () => ({
    meta: [
      { title: "Projeções — Wealth & Tax Advisory | DocFin" },
      {
        name: "description",
        content:
          "Cockpit gerencial para fluxo de caixa livre, otimização fiscal, amortização de dívidas e projeções patrimoniais.",
      },
    ],
  }),
  component: Future,
});

const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

function Future() {
  return <WealthProjectionCockpit />;
}

export function WealthProjectionCockpit() {
  const store = useStore();
  const snapshot = buildWealthSnapshot(store);

  return (
    <main className="space-y-6 pb-24">
      <WealthHero snapshot={snapshot} />
      <OpportunityRadar snapshot={snapshot} />
      <CashflowComposition snapshot={snapshot} />
      <SmartAllocationPlan snapshot={snapshot} />
      <ScenarioProjection snapshot={snapshot} />
      <TaxGuardrails snapshot={snapshot} />
    </main>
  );
}

type ConfidenceLevel = "Alta" | "Média" | "Baixa";
type RecommendationState =
  | "PGBL recomendado"
  | "PGBL condicional"
  | "Evitar PGBL por enquanto"
  | "Priorizar amortização"
  | "Priorizar reserva";

type Opportunity = {
  title: string;
  body: string;
  cta: string;
  tone: "emerald" | "amber" | "red" | "cyan";
};

type AllocationItem = {
  label: string;
  amount: number;
  percent: number;
  icon: ReactNode;
  tone: "emerald" | "amber" | "cyan" | "slate";
};

type WealthSnapshot = {
  monthLabel: string;
  netMedicalIncome: number;
  fixedIncome: number;
  personalExpenses: number;
  debtInstallments: number;
  fixedCosts: number;
  freeCashflow: number;
  confidence: ConfidenceLevel;
  nextAction: string;
  annualOpportunity: number;
  equivalentShiftHours: number;
  hourlyAverage: number;
  opportunities: Opportunity[];
  allocation: AllocationItem[];
  fatorRPercent: number;
  fatorRSafe: boolean;
  fatorRHasRevenue: boolean;
  pgblState: RecommendationState;
  pgblLimit: number;
  pgblTaxSavings: number;
  debtRate: number;
  chart: Array<{ month: string; manter: number; amortizar: number; otimizar: number }>;
  waterfall: Array<{ name: string; value: number }>;
};

function WealthHero({ snapshot }: { snapshot: WealthSnapshot }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-zinc-950 via-[#07120f] to-black p-5 shadow-[0_30px_120px_-55px_rgba(15,118,110,0.7)] md:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            Projeções inteligentes
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-50 md:text-5xl">
            Sua próxima decisão financeira, sem virar uma planilha.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 md:text-base">
            O DocFin cruza plantões, despesas, dívidas, regimes fiscais e Índice de Otimização Tributária para sugerir a melhor próxima ação gerencial.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Confiança dos dados</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-50">{snapshot.confidence}</p>
          <p className="mt-1 max-w-[260px] text-xs leading-5 text-zinc-500">
            {snapshot.confidence === "Baixa"
              ? "Ainda faltam dados de despesas, dívidas ou receitas consolidadas."
              : "Estimativa construída a partir dos dados já cadastrados no DocFin."}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <ExecutiveKpi
          label="Caixa livre estimado"
          value={brl(snapshot.freeCashflow)}
          tone={snapshot.freeCashflow >= 0 ? "emerald" : "red"}
          icon={<Wallet className="h-4 w-4" />}
        />
        <ExecutiveKpi
          label="Melhor próxima ação"
          value={snapshot.nextAction}
          tone="cyan"
          icon={<Target className="h-4 w-4" />}
        />
        <ExecutiveKpi
          label="Economia/risco anual"
          value={brl(snapshot.annualOpportunity)}
          tone="emerald"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <ExecutiveKpi
          label="Esforço equivalente"
          value={`${nf0.format(snapshot.equivalentShiftHours)}h`}
          helper={`centro cirúrgico/mês · ${brl(snapshot.hourlyAverage)}/h`}
          tone="amber"
          icon={<BriefcaseBusiness className="h-4 w-4" />}
        />
      </div>
    </section>
  );
}

function OpportunityRadar({ snapshot }: { snapshot: WealthSnapshot }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#0A0D14] p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Radar de Oportunidades
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-50">O que merece sua atenção agora</h2>
        </div>
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600">
          Validar estratégia com especialista
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {snapshot.opportunities.map((item) => (
          <OpportunityCard key={item.title} item={item} />
        ))}
      </div>
    </section>
  );
}

function CashflowComposition({ snapshot }: { snapshot: WealthSnapshot }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-3xl border border-white/10 bg-[#0A0D14] p-5 md:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Ver composição</p>
        <h2 className="mt-1 text-2xl font-semibold text-zinc-50">Fluxo de Caixa Livre Inteligente</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Valor sugerido automaticamente a partir do mês atual. Você pode usar como ponto de partida e ajustar manualmente se houver renda ou despesa fora do DocFin.
        </p>

        <div className="mt-5 space-y-3">
          <CompositionLine label="Receita líquida médica" value={snapshot.netMedicalIncome} positive />
          <CompositionLine label="Renda fixa líquida" value={snapshot.fixedIncome} positive />
          <CompositionLine label="Despesas pessoais" value={snapshot.personalExpenses} />
          <CompositionLine label="Parcelas virtuais de dívidas" value={snapshot.debtInstallments} />
          <CompositionLine label="Custos fixos" value={snapshot.fixedCosts} />
          <div className="border-t border-white/10 pt-3">
            <CompositionLine label="Caixa livre estimado" value={snapshot.freeCashflow} positive={snapshot.freeCashflow >= 0} strong />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#0A0D14] p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Waterfall gerencial</p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-50">De onde vem seu caixa</h2>
          </div>
          <Badge tone={snapshot.confidence === "Baixa" ? "amber" : "emerald"}>{snapshot.confidence}</Badge>
        </div>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={snapshot.waterfall} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={(value) => `${Number(value) / 1000}k`} />
              <ChartTooltip
                cursor={{ fill: "rgba(15,118,110,0.08)" }}
                contentStyle={{ background: "#050505", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 14 }}
                formatter={(value: number) => brl(value)}
              />
              <Bar dataKey="value" radius={[10, 10, 2, 2]} fill="#0F766E" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function SmartAllocationPlan({ snapshot }: { snapshot: WealthSnapshot }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#0A0D14] p-5 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Plano de Alocação Inteligente
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-50">Ações, não buckets genéricos</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            A recomendação evita armadilhas: dívida cara vem antes de investimento; Fator R em risco vem antes de PGBL; caixa instável pede reserva.
          </p>
        </div>
        <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-zinc-100 transition hover:border-emerald-400/40 hover:text-emerald-200">
          Gerar resumo para meu contador
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {snapshot.allocation.map((item) => (
          <AllocationCard key={item.label} item={item} />
        ))}
      </div>
    </section>
  );
}

function ScenarioProjection({ snapshot }: { snapshot: WealthSnapshot }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#0A0D14] p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Cenários patrimoniais</p>
        <h2 className="text-2xl font-semibold text-zinc-50">Manter, amortizar ou otimizar imposto</h2>
      </div>
      <div className="mt-5 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={snapshot.chart} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="keepScenario" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#94A3B8" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="debtScenario" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.42} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="taxScenario" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#0F766E" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#0F766E" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={(value) => `${Number(value) / 1000}k`} />
            <ChartTooltip
              contentStyle={{ background: "#050505", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 14 }}
              formatter={(value: number) => brl(value)}
            />
            <Area type="monotone" dataKey="manter" stroke="#94A3B8" fill="url(#keepScenario)" strokeWidth={2} name="Manter como está" />
            <Area type="monotone" dataKey="amortizar" stroke="#F59E0B" fill="url(#debtScenario)" strokeWidth={2} name="Amortizar dívida" />
            <Area type="monotone" dataKey="otimizar" stroke="#0F766E" fill="url(#taxScenario)" strokeWidth={3} name="Otimizar imposto" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function TaxGuardrails({ snapshot }: { snapshot: WealthSnapshot }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-3xl border border-white/10 bg-[#0A0D14] p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-300">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Prevenção de armadilha</p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-50">{snapshot.pgblState}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Limite gerencial de PGBL: <strong className="text-zinc-100">{brl2(snapshot.pgblLimit)}</strong>. Economia fiscal estimada:{" "}
              <strong className="text-emerald-300">{brl2(snapshot.pgblTaxSavings)}</strong>.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#0A0D14] p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-300">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Aviso técnico</p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-50">Projeção gerencial, não recomendação final</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Isto é uma projeção gerencial. A decisão final depende do seu contador/assessor e da declaração anual.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExecutiveKpi({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: string;
  helper?: string;
  icon: ReactNode;
  tone: "emerald" | "cyan" | "amber" | "red";
}) {
  const toneClass = {
    emerald: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
    cyan: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
    amber: "text-amber-300 bg-amber-400/10 border-amber-400/20",
    red: "text-rose-300 bg-rose-400/10 border-rose-400/20",
  }[tone];

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className={`inline-flex rounded-xl border p-2 ${toneClass}`}>{icon}</div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-1 min-h-[2.25rem] text-2xl font-semibold tabular-nums text-zinc-50">{value}</p>
      {helper && <p className="mt-1 text-xs text-zinc-500">{helper}</p>}
    </article>
  );
}

function OpportunityCard({ item }: { item: Opportunity }) {
  const toneClass = {
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    red: "border-rose-400/20 bg-rose-400/10 text-rose-300",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
  }[item.tone];

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClass}`}>
        Prioridade
      </div>
      <h3 className="mt-3 text-base font-semibold text-zinc-50">{item.title}</h3>
      <p className="mt-2 min-h-[4rem] text-sm leading-6 text-zinc-400">{item.body}</p>
      <button className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm font-semibold text-zinc-100 transition hover:border-emerald-400/40 hover:text-emerald-200">
        {item.cta}
        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  );
}

function CompositionLine({
  label,
  value,
  positive,
  strong,
}: {
  label: string;
  value: number;
  positive?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`${strong ? "text-sm font-semibold text-zinc-100" : "text-sm text-zinc-400"}`}>{label}</span>
      <span className={`font-semibold tabular-nums ${positive ? "text-emerald-300" : "text-zinc-200"} ${strong ? "text-lg" : "text-sm"}`}>
        {positive ? "+" : "-"} {brl(Math.abs(value))}
      </span>
    </div>
  );
}

function AllocationCard({ item }: { item: AllocationItem }) {
  const toneClass = {
    emerald: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
    amber: "text-amber-300 bg-amber-400/10 border-amber-400/20",
    cyan: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
    slate: "text-zinc-300 bg-white/5 border-white/10",
  }[item.tone];

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className={`inline-flex rounded-xl border p-2 ${toneClass}`}>{item.icon}</div>
      <p className="mt-3 text-sm font-semibold text-zinc-50">{item.label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-50">{brl(item.amount)}</p>
      <div className="mt-3 h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.max(4, Math.min(100, item.percent))}%` }} />
      </div>
      <p className="mt-2 text-xs tabular-nums text-zinc-500">{item.percent.toFixed(0)}% do caixa livre</p>
    </article>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "emerald" | "amber" }) {
  const className =
    tone === "emerald"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : "border-amber-400/20 bg-amber-400/10 text-amber-300";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function buildWealthSnapshot(store: StoreState): WealthSnapshot {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const inCurrentMonth = (iso: string) => {
    const date = new Date(`${iso}T12:00:00`);
    return date.getFullYear() === year && date.getMonth() === month;
  };

  const currentShifts = store.shifts.filter((shift) => shift.recordStatus === "consolidated" && inCurrentMonth(shift.date));
  const allShiftsWithHours = store.shifts.filter((shift) => shift.hours > 0 && shift.gross > 0);
  const netMedicalIncome = currentShifts.reduce((sum, shift) => sum + Math.max(0, computeShift(store, shift).net), 0);
  const fixedIncome = monthlyFixedIncomeNet(store);
  const personalExpenses = store.expenses
    .filter((expense) => inCurrentMonth(expense.date))
    .reduce((sum, expense) => sum + Math.abs(expense.amount || 0), 0);
  const debtInstallments = store.debts
    .filter((debt) => debt.balance > 0)
    .reduce((sum, debt) => sum + Math.max(0, debt.monthlyPayment || 0), 0);
  const fixedCosts = monthlyFixedTotal(store);
  const freeCashflow = Math.round(netMedicalIncome + fixedIncome - personalExpenses - debtInstallments - fixedCosts);
  const hourlyAverage =
    allShiftsWithHours.length > 0
      ? allShiftsWithHours.reduce((sum, shift) => sum + shift.gross, 0) / allShiftsWithHours.reduce((sum, shift) => sum + shift.hours, 0)
      : 280;
  const equivalentShiftHours = Math.max(0, Math.round(Math.abs(freeCashflow) / Math.max(1, hourlyAverage)));

  const fatorR = getRollingFatorRSnapshot(store, year, month + 1);
  const pgbl = calculatePGBLAdvantage(store);
  const debtRate = store.debts.reduce((max, debt) => Math.max(max, debt.annualRate || 0), 0);
  const rpaMonthly = store.taxProfile.sources.RPA.enabled ? store.taxProfile.sources.RPA.monthly || 0 : 0;
  const annualGross = Math.max(0, globalIncomeMonthly(store) * 12);
  const pgblContribution = Math.min(pgbl.idealLimit, annualGross * 0.12);
  const pgblSavings = Math.max(0, estimateAnnualIRPF2026(annualGross) - estimateAnnualIRPF2026(annualGross, pgblContribution));
  const debtInterestRisk = debtInstallments * 12 * (Math.max(0, debtRate) / 100);
  const fatorRRisk = fatorR.hasRevenue && !fatorR.safe ? fatorR.missingProLabore * 0.095 : 0;
  const rpaRisk = rpaMonthly >= 12000 ? rpaMonthly * 12 * 0.08 : 0;
  const annualOpportunity = Math.round(Math.max(pgblSavings, 0) + Math.max(debtInterestRisk, 0) + Math.max(fatorRRisk, 0) + Math.max(rpaRisk, 0));
  const confidence = resolveConfidence(currentShifts.length, store.expenses.length, store.debts.length, store.taxProfile.completed);
  const pgblState = resolvePgblState(store, debtRate, freeCashflow, pgbl.scenario);
  const nextAction = resolveNextAction(freeCashflow, debtRate, fatorR.safe, fatorR.hasRevenue, rpaMonthly);
  const opportunities = buildOpportunities({
    freeCashflow,
    debtRate,
    fatorRSafe: fatorR.safe,
    fatorRHasRevenue: fatorR.hasRevenue,
    rpaMonthly,
    inssCeiling: inssCeilingReachedByCLT(store),
    pjFocused: isPJFocused(store),
    confidence,
  });
  const allocation = buildAllocation(freeCashflow, debtRate, fatorR.safe, fatorR.hasRevenue);
  const chart = buildScenarioChart(Math.max(0, freeCashflow), annualOpportunity, debtRate);

  return {
    monthLabel,
    netMedicalIncome: Math.round(netMedicalIncome),
    fixedIncome: Math.round(fixedIncome),
    personalExpenses: Math.round(personalExpenses),
    debtInstallments: Math.round(debtInstallments),
    fixedCosts: Math.round(fixedCosts),
    freeCashflow,
    confidence,
    nextAction,
    annualOpportunity,
    equivalentShiftHours,
    hourlyAverage,
    opportunities,
    allocation,
    fatorRPercent: fatorR.factorPercent,
    fatorRSafe: fatorR.safe,
    fatorRHasRevenue: fatorR.hasRevenue,
    pgblState,
    pgblLimit: pgbl.idealLimit,
    pgblTaxSavings: pgblSavings,
    debtRate,
    chart,
    waterfall: [
      { name: "Receita", value: Math.round(netMedicalIncome + fixedIncome) },
      { name: "Despesas", value: -Math.round(personalExpenses) },
      { name: "Dívidas", value: -Math.round(debtInstallments) },
      { name: "Fixos", value: -Math.round(fixedCosts) },
      { name: "Livre", value: freeCashflow },
    ],
  };
}

function resolveConfidence(shifts: number, expenses: number, debts: number, taxProfileCompleted: boolean): ConfidenceLevel {
  const score = [shifts > 0, expenses > 0, debts > 0, taxProfileCompleted].filter(Boolean).length;
  if (score >= 3) return "Alta";
  if (score >= 2) return "Média";
  return "Baixa";
}

function resolveNextAction(
  freeCashflow: number,
  debtRate: number,
  fatorRSafe: boolean,
  fatorRHasRevenue: boolean,
  rpaMonthly: number,
): string {
  if (freeCashflow < 0) return "Priorizar reserva";
  if (debtRate >= 18) return "Amortizar dívida";
  if (fatorRHasRevenue && !fatorRSafe) return "Blindar imposto";
  if (rpaMonthly >= 12000) return "Rever RPA/PJ";
  return "Construir reserva";
}

function resolvePgblState(
  store: StoreState,
  debtRate: number,
  freeCashflow: number,
  scenario: "A" | "B" | "C",
): RecommendationState {
  if (freeCashflow <= 0) return "Priorizar reserva";
  if (debtRate >= 18) return "Priorizar amortização";
  if (isPJFocused(store)) return "Evitar PGBL por enquanto";
  if (scenario === "C") return "PGBL recomendado";
  if (scenario === "B") return "PGBL condicional";
  return "Evitar PGBL por enquanto";
}

function buildOpportunities(input: {
  freeCashflow: number;
  debtRate: number;
  fatorRSafe: boolean;
  fatorRHasRevenue: boolean;
  rpaMonthly: number;
  inssCeiling: boolean;
  pjFocused: boolean;
  confidence: ConfidenceLevel;
}): Opportunity[] {
  const items: Opportunity[] = [];

  if (input.freeCashflow < 0) {
    items.push({
      title: "Caixa livre negativo",
      body: "Recomendações de investimento ficam bloqueadas até reorganizar despesas, parcelas e custos fixos.",
      cta: "Resolver no app",
      tone: "red",
    });
  }

  if (input.debtRate >= 18) {
    items.push({
      title: "Dívida cara consumindo plantões",
      body: "A maior taxa anual cadastrada supera o retorno real esperado de uma carteira conservadora.",
      cta: "Falar com especialista patrimonial",
      tone: "amber",
    });
  }

  if (input.fatorRHasRevenue && !input.fatorRSafe) {
    items.push({
      title: "Índice tributário abaixo da meta",
      body: "Antes de pensar em investimento, vale calibrar pró-labore para proteger o Anexo III.",
      cta: "Falar com contador parceiro",
      tone: "emerald",
    });
  }

  if (input.rpaMonthly >= 12000) {
    items.push({
      title: "RPA pode estar custando caro",
      body: "Plantões recorrentes em PF/RPA podem pagar mais imposto que uma estrutura PJ otimizada.",
      cta: "Falar com contador parceiro",
      tone: "cyan",
    });
  }

  if (input.inssCeiling && input.rpaMonthly > 0) {
    items.push({
      title: "Possível INSS duplicado",
      body: "Se CLT/concurso já atinge o teto, retenções em RPA precisam ser conferidas com cuidado.",
      cta: "Falar com contador parceiro",
      tone: "amber",
    });
  }

  if (items.length === 0) {
    items.push({
      title: "Próximo dado útil",
      body:
        input.confidence === "Baixa"
          ? "Cadastre suas despesas, dívidas ou perfil fiscal para aumentar a precisão das projeções."
          : "Seu cockpit está estável. O próximo ganho vem de revisar metas e carteira.",
      cta: input.confidence === "Baixa" ? "Completar dados" : "Validar estratégia",
      tone: "emerald",
    });
  }

  return items.slice(0, 3);
}

function buildAllocation(
  freeCashflow: number,
  debtRate: number,
  fatorRSafe: boolean,
  fatorRHasRevenue: boolean,
): AllocationItem[] {
  const base = Math.max(0, freeCashflow);
  if (base === 0) {
    return [
      { label: "Construir reserva", amount: 0, percent: 0, icon: <ShieldCheck className="h-4 w-4" />, tone: "emerald" },
      { label: "Amortizar dívida", amount: 0, percent: 0, icon: <CircleDollarSign className="h-4 w-4" />, tone: "amber" },
      { label: "Blindar imposto", amount: 0, percent: 0, icon: <Landmark className="h-4 w-4" />, tone: "cyan" },
      { label: "Projetos de vida", amount: 0, percent: 0, icon: <PiggyBank className="h-4 w-4" />, tone: "slate" },
    ];
  }

  const debtPct = debtRate >= 18 ? 45 : debtRate >= 12 ? 25 : 10;
  const taxPct = fatorRHasRevenue && !fatorRSafe ? 35 : 20;
  const reservePct = debtRate >= 18 ? 25 : 35;
  const projectPct = Math.max(10, 100 - debtPct - taxPct - reservePct);

  return [
    { label: "Blindar imposto", amount: Math.round(base * (taxPct / 100)), percent: taxPct, icon: <Landmark className="h-4 w-4" />, tone: "cyan" },
    { label: "Amortizar dívida", amount: Math.round(base * (debtPct / 100)), percent: debtPct, icon: <CircleDollarSign className="h-4 w-4" />, tone: "amber" },
    { label: "Construir reserva", amount: Math.round(base * (reservePct / 100)), percent: reservePct, icon: <ShieldCheck className="h-4 w-4" />, tone: "emerald" },
    { label: "Projetos de vida", amount: Math.round(base * (projectPct / 100)), percent: projectPct, icon: <PiggyBank className="h-4 w-4" />, tone: "slate" },
  ];
}

function buildScenarioChart(monthlyFree: number, annualOpportunity: number, debtRate: number) {
  const monthlyRate = Math.pow(1.006, 1) - 1;
  const debtBoost = debtRate >= 18 ? 1.22 : 1.08;
  const taxBoost = annualOpportunity > 0 ? annualOpportunity / 12 : 0;
  let manter = 0;
  let amortizar = 0;
  let otimizar = 0;

  return Array.from({ length: 12 }, (_, index) => {
    manter = manter * (1 + monthlyRate) + monthlyFree;
    amortizar = amortizar * (1 + monthlyRate) + monthlyFree * debtBoost;
    otimizar = otimizar * (1 + monthlyRate) + monthlyFree + taxBoost;
    return {
      month: `${index + 1}m`,
      manter: Math.round(manter),
      amortizar: Math.round(amortizar),
      otimizar: Math.round(otimizar),
    };
  });
}
