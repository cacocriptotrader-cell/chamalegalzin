import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  brl,
  brl2,
  useStore,
  monthlyFixedTotal,
  monthlyFixedIncomeNet,
  globalIncomeMonthly,
  isAboveIRPFExemption,
  IRPF_EXEMPTION_MONTHLY,
  estimateAnnualIRPF2026,
  calculatePGBLAdvantage,
  isPJFocused,
} from "@/lib/store";
import { Section } from "@/components/Section";
import {
  Sparkles, Target, TrendingUp, Info, Flame, Skull, ShieldCheck, CheckCircle2, Landmark, Wallet, Home, Lock,
} from "lucide-react";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip";
import { Stethoscope, Scissors, Zap, Crown } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const compact = (n: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const Route = createFileRoute("/futuro")({
  head: () => ({
    meta: [
      { title: "Futuro — Previdência & Wealth | Docfin" },
      { name: "description", content: "PGBL vs VGBL, amortização vs investir, simulador de independência e meta casamento." },
    ],
  }),
  component: Future,
});

function Future() {
  return (
    <>
      <SmartAllocator />
      <FireSimulator />
      <TaxSimulator />
    </>
  );
}

// =================== PGBL INSIGHT CARD ===================
function PGBLInsightCard() {
  const store = useStore();
  const pgblAdvantage = calculatePGBLAdvantage(store);

  const renderScenario = () => {
    switch (pgblAdvantage.scenario) {
      case "A":
        return (
          <p className="text-zinc-200 text-sm leading-relaxed">
            Insight: O seu volume de faturamento PF atual é melhor atendido pela Declaração Simplificada do IR. O PGBL não trará vantagem fiscal neste cenário. Concentre os seus aportes em CDB, LCI ou LCA.
          </p>
        );
      case "B":
        return (
          <p className="text-zinc-200 text-sm leading-relaxed">
            Insight: Atenção Fiscal. O seu faturamento PF atingiu a zona de transição para a Declaração Completa. Um aporte de até <strong className="text-emerald-300">{brl2(pgblAdvantage.idealLimit)}</strong> em PGBL pode otimizar a sua restituição. Analise com o seu contador.
          </p>
        );
      case "C":
        return (
          <p className="text-zinc-200 text-sm leading-relaxed">
            Insight: Oportunidade Fiscal. O seu volume de faturamento PF exige a Declaração Completa. Aportar o teto de <strong className="text-emerald-300">{brl2(pgblAdvantage.idealLimit)}</strong> em PGBL este ano garante uma economia direta de <strong className="text-emerald-300">{brl2(pgblAdvantage.taxSavings)}</strong> em impostos. Para valores acima desse teto, utilize CDB.
          </p>
        );
    }
  };

  return (
    <div className="mt-8 p-5 bg-gradient-to-br from-slate-900/60 to-zinc-900/60 border border-slate-700/40 rounded-lg shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 pt-0.5">
          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-slate-700/50" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">Análise Fiscal Personalizada</h3>
          {renderScenario()}
        </div>
      </div>
    </div>
  );
}

// =================== SMART ALLOCATOR ===================
function SmartAllocator() {
  const store = useStore();
  const global = globalIncomeMonthly(store);
  const pgblEligible = isAboveIRPFExemption(store);
  const suggestedFree = Math.max(
    0,
    Math.round(
      (global > 0 ? global : monthlyFixedIncomeNet(store)) - monthlyFixedTotal(store),
    ),
  );
  const [free, setFree] = useState<number>(suggestedFree > 0 ? suggestedFree : 5000);

  // Pesos brutos de cada bucket; normalizamos para 100% na renderização.
  // Se PGBL não for elegível, começa com 0 nesse bucket e o slider fica trancado.
  const [w, setW] = useState<[number, number, number]>(
    pgblEligible ? [40, 35, 25] : [0, 60, 40],
  );

  const total = w[0] + w[1] + w[2] || 1;
  const pct: [number, number, number] = [w[0] / total, w[1] / total, w[2] / total];
  const values: [number, number, number] = [free * pct[0], free * pct[1], free * pct[2]];

  const setBucket = (i: 0 | 1 | 2, v: number) => {
    if (i === 0 && !pgblEligible) return;
    const next: [number, number, number] = [...w] as [number, number, number];
    next[i] = v;
    setW(next);
  };

  // Impacto da amortização: usa a maior taxa de dívida cadastrada (ou fallback 14% a.a.)
  const debtRate =
    store.debts.reduce((max, d) => Math.max(max, d.annualRate || 0), 0) || 14;
  // Estimativa: economia de juros em 5 anos ao acelerar a amortização desse aporte.
  const interestSaved = values[1] * 12 * (debtRate / 100) * 5;
  // Economia de IR via PGBL calculada pela tabela progressiva de IRPF 2026.
  const annualGross = Math.max(0, global * 12);
  const pgblContribution = Math.min(values[0] * 12, annualGross * 0.12);
  const irSaved = Math.max(0, estimateAnnualIRPF2026(annualGross) - estimateAnnualIRPF2026(annualGross, pgblContribution));

  return (
    <Section
      title="Smart Allocation"
      subtitle="Distribua seu fluxo de caixa livre — o sistema traduz em impacto real."
    >
      <div className="max-w-2xl mx-auto rounded-3xl bg-zinc-900 border border-white/5 p-6 md:p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
        {/* Header */}
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            Fluxo de Caixa Livre Sugerido
          </p>
          <div className="mt-2 inline-flex items-baseline gap-2">
            <span className="text-zinc-500 text-2xl">R$</span>
            <input
              type="text"
              inputMode="numeric"
              value={new Intl.NumberFormat("pt-BR").format(free)}
              onChange={(e) => {
                const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                setFree(isNaN(n) ? 0 : n);
              }}
              className="bg-transparent outline-none border-none text-emerald-400 font-light tabular-nums tracking-tight text-5xl md:text-6xl text-center w-[7ch] focus:w-[9ch] transition-all"
            />
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            por mês · {global > 0 ? "renda global (PJ + CLT + RPA + Particular) − custos fixos" : suggestedFree > 0 ? "estimado a partir das suas receitas e custos fixos" : "informe seu excedente mensal"}
          </p>
        </div>

        {/* Buckets */}
        <div className="mt-10 grid grid-cols-3 gap-3 md:gap-4">
          <Bucket
            icon={pgblEligible ? <Landmark className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            label="PGBL / Fator R"
            pct={pct[0]}
            value={values[0]}
            onChange={(v) => setBucket(0, v)}
            sliderValue={w[0]}
            tone="emerald"
            disabled={!pgblEligible}
            disabledHint="Sua renda global está abaixo da faixa de IRPF — PGBL não traria abatimento."
          />
          <Bucket
            icon={<Wallet className="h-4 w-4" />}
            label="Amortização"
            pct={pct[1]}
            value={values[1]}
            onChange={(v) => setBucket(1, v)}
            sliderValue={w[1]}
            tone="amber"
          />
          <Bucket
            icon={<Home className="h-4 w-4" />}
            label="Projetos de Vida"
            pct={pct[2]}
            value={values[2]}
            onChange={(v) => setBucket(2, v)}
            sliderValue={w[2]}
            tone="sky"
          />
        </div>

        {/* Aviso de elegibilidade */}
        <p className="mt-6 text-[11px] text-zinc-500 leading-relaxed text-center">
          Otimização sugerida baseada na sua renda global (PJ + CLT + Outros).{" "}
          {pgblEligible ? (
            <>O aporte em PGBL é opcional para reduzir seu IRPF anual.</>
          ) : (
            <>Sua renda mensal global ({brl(global || 0)}) está abaixo da faixa de IRPF ({brl(IRPF_EXEMPTION_MONTHLY)}) — o bucket PGBL fica indisponível pois não há IR a abater.</>
          )}
        </p>

        {/* PGBL Insight Card */}
        <PGBLInsightCard />

        {/* Veredito de Máquina */}
        <div className="mt-8 space-y-2">
          {values[1] > 0 && (
            <Verdict>
              A alocação de <strong className="text-emerald-400 tabular-nums">{brl(values[1])}</strong>/mês
              economiza aproximadamente{" "}
              <strong className="text-emerald-400 tabular-nums">{brl(interestSaved)}</strong> em juros futuros (5 anos · {debtRate.toFixed(1)}% a.a.).
            </Verdict>
          )}
          {values[0] > 0 && pgblEligible && (
            <Verdict>
              Alocação otimizada para redução na base de cálculo do IRPF — economia anual estimada de{" "}
              <strong className="text-emerald-400 tabular-nums">{brl(irSaved)}</strong>.
            </Verdict>
          )}
          {values[2] > 0 && (
            <Verdict>
              <strong className="text-emerald-400 tabular-nums">{brl(values[2] * 12)}</strong>/ano direcionados
              para reserva e projetos de vida (imóvel, casamento, liberdade).
            </Verdict>
          )}
        </div>
      </div>
    </Section>
  );
}

function Bucket({
  icon, label, pct, value, sliderValue, onChange, tone, disabled, disabledHint,
}: {
  icon: React.ReactNode;
  label: string;
  pct: number;
  value: number;
  sliderValue: number;
  onChange: (v: number) => void;
  tone: "emerald" | "amber" | "sky";
  disabled?: boolean;
  disabledHint?: string;
}) {
  const accent =
    tone === "emerald" ? "rgb(16 185 129)" : tone === "amber" ? "rgb(245 158 11)" : "rgb(56 189 248)";
  const pctMax = 100;
  const trackPct = (sliderValue / pctMax) * 100;
  return (
    <div
      className={`rounded-2xl bg-zinc-950/60 border border-white/5 p-4 flex flex-col items-center text-center ${disabled ? "opacity-50" : ""}`}
      title={disabled ? disabledHint : undefined}
    >
      <div className="flex items-center gap-1.5 text-zinc-400">
        <span style={{ color: disabled ? "rgb(113 113 122)" : accent }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p
        className="font-display text-xl md:text-2xl font-light tabular-nums mt-2"
        style={{ color: disabled ? "rgb(113 113 122)" : accent }}
      >
        {brl(value)}
      </p>
      <p className="text-[11px] text-zinc-500 tabular-nums">{(pct * 100).toFixed(0)}%</p>
      <input
        type="range"
        min={0}
        max={pctMax}
        step={1}
        value={sliderValue}
        disabled={disabled}
        onChange={(e) => onChange(+e.target.value)}
        className={`mt-3 w-full h-1 appearance-none rounded-full ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
        style={{
          background: disabled
            ? "rgb(39 39 42)"
            : `linear-gradient(to right, ${accent} 0%, ${accent} ${trackPct}%, rgb(39 39 42) ${trackPct}%, rgb(39 39 42) 100%)`,
        }}
      />
      {disabled && disabledHint && (
        <p className="mt-2 text-[10px] text-zinc-500 leading-snug">{disabledHint}</p>
      )}
    </div>
  );
}

function Verdict({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2.5">
      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
      <p className="text-xs text-zinc-300 leading-relaxed">{children}</p>
    </div>
  );
}

// =================== FIRE — Simulador Patrimonial Interativo ===================
function FireSimulator() {
  const [age, setAge] = useState(35);
  const [target, setTarget] = useState(55);
  const [income, setIncome] = useState(30000);
  const [rate, setRate] = useState(8);

  const { targetWealth, monthly, years, chartData, totalContrib, totalInterest } = useMemo(() => {
    const yrs = Math.max(1, target - age);
    const months = yrs * 12;
    const annualReal = rate / 100;
    const monthlyReal = Math.pow(1 + annualReal, 1 / 12) - 1;
    const targetWealth = (income * 12) / Math.max(0.0001, annualReal);
    const monthly = monthlyReal === 0
      ? targetWealth / months
      : (targetWealth * monthlyReal) / (Math.pow(1 + monthlyReal, months) - 1);

    let balance = 0;
    const data: { ageLabel: number; invested: number; juros: number; total: number }[] = [
      { ageLabel: age, invested: 0, juros: 0, total: 0 },
    ];
    for (let y = 1; y <= yrs; y++) {
      for (let m = 0; m < 12; m++) {
        balance = balance * (1 + monthlyReal) + monthly;
      }
      const invested = monthly * 12 * y;
      data.push({
        ageLabel: age + y,
        invested: Math.round(invested),
        juros: Math.max(0, Math.round(balance - invested)),
        total: Math.round(balance),
      });
    }
    return {
      targetWealth, monthly, years: yrs, chartData: data,
      totalContrib: monthly * months,
      totalInterest: balance - monthly * months,
    };
  }, [age, target, income, rate]);

  return (
    <Section title="Independência Financeira" subtitle="Simulador patrimonial interativo — arraste e veja a bola de neve crescer">
      <TooltipProvider delayDuration={150}>
        <div className="rounded-2xl bg-zinc-900/50 backdrop-blur-md border border-white/10 p-5 md:p-6 space-y-6">
          {/* HERO RESULT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Aporte mensal necessário
              </p>
              <p className="font-display text-5xl md:text-6xl font-light tabular-nums tracking-tight text-emerald-400 mt-1 drop-shadow-[0_0_30px_rgba(16,185,129,0.35)]">
                {brl(monthly)}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                por <span className="text-emerald-400/80">{years} anos</span> · alvo {brl(targetWealth)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Total aportado" value={brl(totalContrib)} tone="neutral" />
              <MiniStat label="Juros compostos" value={brl(totalInterest)} tone="emerald" />
            </div>
          </div>

          <EffortConverter amount={monthly} period="mês" />

          {/* SLIDERS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            <SliderField
              label="Idade atual" suffix=" anos"
              value={age} min={18} max={70} step={1}
              onChange={(v) => { setAge(v); if (target <= v) setTarget(v + 1); }}
            />
            <SliderField
              label="Idade alvo" suffix=" anos"
              value={target} min={age + 1} max={85} step={1} onChange={setTarget}
            />
            <SliderField
              label="Renda mensal desejada" prefix="R$ " format
              value={income} min={3000} max={150000} step={500} onChange={setIncome}
            />
            <SliderField
              label="Taxa real" suffix="% a.a."
              tooltip="Taxa de retorno descontada da inflação. Ações brasileiras: ~6–9% reais; Tesouro IPCA+: ~5–7%."
              value={rate} min={2} max={15} step={0.5} onChange={setRate}
            />
          </div>

          {/* SNOWBALL CHART */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">O Efeito Bola de Neve</p>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="h-2 w-2 rounded-full bg-zinc-500" /> Aportes
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> Juros compostos
                </span>
              </div>
            </div>
            <div className="h-64 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(113 113 122)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="rgb(113 113 122)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gInterest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(39 39 42)" vertical={false} />
                  <XAxis dataKey="ageLabel" tick={{ fontSize: 12, fill: "rgb(113 113 122)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "rgb(113 113 122)" }} />
                  <RTooltip
                    contentStyle={{ backgroundColor: "rgb(24 24 27)", border: "1px solid rgb(63 63 70)" }}
                    labelStyle={{ color: "rgb(212 212 216)" }}
                    formatter={(value: number) => brl(value)}
                  />
                  <Area type="monotone" dataKey="invested" stackId="1" stroke="none" fill="url(#gInvested)" />
                  <Area type="monotone" dataKey="juros" stackId="1" stroke="none" fill="url(#gInterest)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* INSIGHTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InsightBox>
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Aporte total em {years} anos</p>
              <p className="text-2xl font-light text-zinc-100 mt-1 tabular-nums">{brl(totalContrib)}</p>
            </InsightBox>
            <InsightBox>
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Ganho com juros compostos</p>
              <p className="text-2xl font-light text-emerald-400 mt-1 tabular-nums">{brl(totalInterest)}</p>
            </InsightBox>
          </div>
        </div>
      </TooltipProvider>
    </Section>
  );
}

// =================== TAX SIMULATOR ===================
function TaxSimulator() {
  const store = useStore();
  const [irSemPgbl, setIrSemPgbl] = useState(0);
  const [irComPgbl, setIrComPgbl] = useState(0);

  useMemo(() => {
    const annualGross = Math.max(0, globalIncomeMonthly(store) * 12);
    const irSem = estimateAnnualIRPF2026(annualGross);
    setIrSemPgbl(irSem);

    const pgblContribution = Math.min(annualGross * 0.12, 16754);
    const irCom = estimateAnnualIRPF2026(annualGross, pgblContribution);
    setIrComPgbl(irCom);
  }, [store]);

  const taxSaving = Math.max(0, irSemPgbl - irComPgbl);
  const pctSaved = irSemPgbl > 0 ? (taxSaving / irSemPgbl) * 100 : 0;

  // Simulação de crescimento patrimonial com a economia de IR reinvestida.
  const { docfinWealth } = useMemo(() => {
    let docfinWealth = 0;
    const rate = 0.08;
    for (let y = 1; y <= 30; y++) {
      docfinWealth = docfinWealth * (1 + rate) + taxSaving;
    }
    return { docfinWealth };
  }, [irSemPgbl, taxSaving]);

  return (
    <Section
      title="Simulador de Imposto"
      subtitle="Visualize o impacto fiscal de uma estratégia PGBL vs sem PGBL."
    >
      <div className="rounded-2xl bg-zinc-900/50 backdrop-blur-md border border-white/10 p-5 md:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-zinc-950/60 border border-white/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">IR sem PGBL (ano)</p>
            <p className="text-3xl font-light text-zinc-100 mt-2 tabular-nums">{brl(irSemPgbl)}</p>
          </div>
          <div className="rounded-xl bg-zinc-950/60 border border-white/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">IR com PGBL (ano)</p>
            <p className="text-3xl font-light text-emerald-400 mt-2 tabular-nums">{brl(irComPgbl)}</p>
          </div>
          <div className="rounded-xl bg-zinc-950/60 border border-white/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Economia anual</p>
            <p className="text-3xl font-light text-emerald-400 mt-2 tabular-nums">{brl(taxSaving)}</p>
            <p className="text-[10px] text-zinc-500 mt-1">({pctSaved.toFixed(1)}% de redução)</p>
          </div>
        </div>

        <EffortConverter amount={taxSaving} period="ano" kind="saved" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-gradient-to-br from-emerald-900/20 to-transparent border border-emerald-500/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-emerald-400">Reinvestimento de 30 anos</p>
            <p className="text-2xl font-light text-emerald-300 mt-2 tabular-nums">{brl(docfinWealth)}</p>
            <p className="text-xs text-zinc-400 mt-1">
              Isso são <strong className="tabular-nums">{brl(taxSaving)}</strong> que continuam rendendo na sua previdência —
              juros compostos a 8% a.a. durante 30 anos.
            </p>
          </div>
          <div className="rounded-xl bg-zinc-950/60 border border-white/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Limite de Dedução Simplificada</p>
            <p className="text-2xl font-light text-zinc-100 mt-2 tabular-nums">R$ 16.754,00</p>
            <p className="text-xs text-zinc-400 mt-1">
              Teto anual para dedução na Declaração Simplificada do IRPF.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

// =================== HELPERS ===================
function MiniStat({ label, value, tone }: { label: string; value: string; tone: "neutral" | "emerald" }) {
  const color = tone === "emerald" ? "text-emerald-400" : "text-zinc-400";
  return (
    <div className="rounded-lg bg-zinc-950/60 border border-white/5 p-3 text-center">
      <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">{label}</p>
      <p className={`text-lg font-light mt-1 tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function InsightBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-950/60 border border-white/5 p-4">
      {children}
    </div>
  );
}

function EffortConverter({ amount, period, kind }: { amount: number; period: "mês" | "ano"; kind?: "saved" }) {
  const conversions = [
    { label: "Consultas médicas", value: Math.round(amount / 250) },
    { label: "Horas de plantão", value: Math.round(amount / 280) },
    { label: "Dias de folga", value: Math.round((amount / 280) / 12) },
  ];
  return (
    <div className="rounded-lg bg-zinc-950/60 border border-white/5 p-4">
      <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-3">
        {kind === "saved" ? "Equivalência de" : "Esforço equivalente"}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {conversions.map((c) => (
          <div key={c.label} className="text-center">
            <p className="text-lg font-light text-emerald-400 tabular-nums">{nf0.format(c.value)}</p>
            <p className="text-[10px] text-zinc-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SliderField({
  label, value, min, max, step, onChange, suffix, prefix, format, tooltip,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
  prefix?: string;
  format?: boolean;
  tooltip?: string;
}) {
  const formatted = format ? new Intl.NumberFormat("pt-BR").format(value) : value;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm text-zinc-400">
          {label}
          {tooltip && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="inline h-3 w-3 ml-1 text-zinc-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </label>
        <span className="text-sm font-light text-emerald-400 tabular-nums">
          {prefix}{formatted}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full h-1 appearance-none rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 cursor-pointer"
        style={{
          background: `linear-gradient(to right, rgb(16 185 129) 0%, rgb(16 185 129) ${((value - min) / (max - min)) * 100}%, rgb(39 39 42) ${((value - min) / (max - min)) * 100}%, rgb(39 39 42) 100%)`,
        }}
      />
    </div>
  );
}
