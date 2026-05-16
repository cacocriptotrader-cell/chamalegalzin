import { useMemo } from "react";
import { Wallet, Activity, ShieldCheck, ShieldAlert, Target } from "lucide-react";
import {
  useStore, computeShift, monthlyFixedTotal, computedProLaboreMonthly, brl,
  calculateExpectedPaymentDate, getCurrentMonthRegimeTotal,
} from "@/lib/store";
import { Sparkline, trendSeries } from "@/components/Sparkline";

export function ExecutiveOverview() {
  const store = useStore();

  const { netWorth, liquidity30d, factorR, hasPj, wedding } = useMemo(() => {
    const assetsTotal = store.assets.reduce((a, x) => a + (x.currentValue || 0), 0);
    const liabilitiesTotal = store.liabilities.reduce((a, x) => a + (x.remainingBalance || 0), 0);
    const netWorth = assetsTotal - liabilitiesTotal;

    const now = new Date();
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);

    let toReceive = 0;
    store.surgeries.forEach((s) => {
      if (s.myRole === "TITULAR" && !s.receivedFromHospital) {
        const wp = store.workplaces.find((w) => w.id === s.hospitalId);
        const paymentDate = wp ? calculateExpectedPaymentDate(s.date, wp) : new Date(s.date + "T12:00:00");
        if (paymentDate >= now && paymentDate <= in30) toReceive += s.totalGross;
      }
      if (s.myRole === "MEMBRO_EQUIPE" && !s.isReceived) toReceive += s.myExpectedShare;
    });
    store.shifts.forEach((sh) => {
      const wp = store.workplaces.find((w) => w.id === sh.workplaceId);
      const paymentDate = sh.expectedPaymentDate
        ? new Date(sh.expectedPaymentDate + "T12:00:00")
        : wp
          ? calculateExpectedPaymentDate(sh.date, wp)
          : new Date(sh.date + "T12:00:00");
      if (paymentDate >= now && paymentDate <= in30) {
        const m = computeShift(store, sh);
        toReceive += sh.gross - m.tax;
      }
    });

    let obligations = monthlyFixedTotal(store);
    store.surgeries.forEach((s) => {
      if (s.myRole === "TITULAR") {
        s.teamSplit.forEach((t) => {
          if (!t.isPaid) obligations += t.amountDue;
        });
      }
    });
    const liquidity30d = toReceive - obligations;

    const pjSimplesMonth = getCurrentMonthRegimeTotal(store, now.getFullYear(), now.getMonth() + 1, ["PJ_SIMPLES"]);
    const proLaboreMonth = computedProLaboreMonthly(store);
    const factorR = pjSimplesMonth > 0 ? (proLaboreMonth / pjSimplesMonth) * 100 : 0;
    const hasPj = pjSimplesMonth > 0;

    return { netWorth, liquidity30d, factorR, hasPj, wedding: store.wedding };
  }, [store]);

  const fiscalOk = !hasPj || factorR >= 28;
  const weddingPct = wedding.targetAmount > 0
    ? Math.min(100, (wedding.saved / wedding.targetAmount) * 100)
    : 0;

  // Deterministic sparkline series (no Math.random in render → SSR safe)
  const netWorthSeries = useMemo(() => trendSeries(1, netWorth || 1, 24, 0.04, 0.015), [netWorth]);
  const liquiditySeries = useMemo(() => trendSeries(2, Math.abs(liquidity30d) || 1, 24, 0.12, liquidity30d >= 0 ? 0.01 : -0.01), [liquidity30d]);
  const fiscalSeries = useMemo(() => trendSeries(3, factorR || 28, 24, 0.06, fiscalOk ? 0.005 : -0.008), [factorR, fiscalOk]);
  const weddingSeries = useMemo(() => trendSeries(4, weddingPct || 1, 24, 0.05, 0.025), [weddingPct]);

  const emerald = "rgb(52 211 153)";
  const rose = "rgb(244 63 94)";
  const amber = "rgb(251 191 36)";
  const white = "rgb(255 255 255)";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 mb-2">
      <Card icon={<Wallet className="h-4 w-4" />} label="Patrimônio Líquido"
            spark={<Sparkline data={netWorthSeries} color={emerald} />}>
        <p className="font-display text-3xl font-semibold text-white tabular-nums tracking-tight">
          {brl(netWorth)}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
          Ativos − Passivos
        </p>
      </Card>

      <Card icon={<Activity className="h-4 w-4" />} label="Liquidez · 30 dias"
            spark={<Sparkline data={liquiditySeries} color={liquidity30d >= 0 ? emerald : rose} />}>
        <p
          className={`font-display text-3xl font-semibold tabular-nums tracking-tight ${
            liquidity30d >= 0 ? "text-emerald-400" : "text-rose-500"
          }`}
        >
          {brl(liquidity30d)}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
          A receber − Obrigações
        </p>
      </Card>

      <Card
        icon={fiscalOk ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
        label="Eficiência Fiscal"
        spark={<Sparkline data={fiscalSeries} color={fiscalOk ? emerald : amber} />}
      >
        <div className="flex items-center gap-2 mt-1">
          {fiscalOk ? (
            <ShieldCheck className="h-7 w-7 text-emerald-400 shrink-0" strokeWidth={2} />
          ) : (
            <ShieldAlert className="h-7 w-7 text-amber-400 shrink-0" strokeWidth={2} />
          )}
          <p className={`font-display text-2xl font-semibold tracking-tight ${
            fiscalOk ? "text-emerald-400" : "text-amber-400"
          }`}>
            {fiscalOk ? "Otimizado" : "Risco Fiscal"}
          </p>
        </div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 tabular-nums">
          {hasPj ? `Fator R ${factorR.toFixed(1)}% · alvo 28%` : "Sem PJ ativa"}
        </p>
      </Card>

      <Card icon={<Target className="h-4 w-4" />} label="Meta · Projeto Taubaté"
            spark={<Sparkline data={weddingSeries} color={white} />}>
        <p className="font-display text-3xl font-semibold text-white tabular-nums tracking-tight">
          {weddingPct.toFixed(0)}<span className="text-lg text-muted-foreground">%</span>
        </p>
        <div className="h-1 rounded-full bg-white/5 overflow-hidden mt-3">
          <div
            className="h-full bg-white/80 rounded-full transition-all"
            style={{ width: `${weddingPct}%` }}
          />
        </div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1.5 tabular-nums">
          {brl(wedding.saved)} / {brl(wedding.targetAmount)}
        </p>
      </Card>
    </div>
  );
}

function Card({
  icon, label, children, spark,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  spark?: React.ReactNode;
}) {
  return (
    <div className="relative rounded-xl bg-zinc-900/50 border border-white/10 backdrop-blur-md p-4 overflow-hidden">
      <div className="absolute top-3 right-3 text-white opacity-40 z-10">{icon}</div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium relative z-10">
        {label}
      </p>
      <div className="mt-1.5 relative z-10">{children}</div>
      {spark && (
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none opacity-70">
          {spark}
        </div>
      )}
    </div>
  );
}
