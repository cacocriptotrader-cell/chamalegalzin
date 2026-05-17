import {
  brl2,
  computedProLaboreMonthly,
  FATOR_R_PROLABORE_RATIO,
  getCurrentMonthRegimeTotal,
  useStore,
} from "@/lib/store";
import { AlertTriangle, CheckCircle2, Gauge } from "lucide-react";

interface FatorRMonitorProps {
  month?: number;
  year?: number;
}

export function FatorRMonitor({ month, year }: FatorRMonitorProps) {
  const store = useStore();
  const now = new Date();
  const refYear = year ?? now.getFullYear();
  const refMonth = month ?? now.getMonth() + 1;
  const refDate = new Date(refYear, refMonth - 1, 1);

  const pjRevenue = getCurrentMonthRegimeTotal(store, refYear, refMonth, ["PJ_SIMPLES"]);
  const targetProLabore = pjRevenue * FATOR_R_PROLABORE_RATIO;
  const manualProLabore = store.proLabores.reduce((sum, item) => sum + (item.monthly || 0), 0);
  const automaticProLabore = computedProLaboreMonthly(store, refDate);
  const currentProLabore = Math.max(manualProLabore, automaticProLabore);
  const missing = Math.max(0, targetProLabore - currentProLabore);
  const progress = targetProLabore > 0 ? Math.min(100, (currentProLabore / targetProLabore) * 100) : 0;
  const factorPercent = pjRevenue > 0 ? (currentProLabore / pjRevenue) * 100 : 0;
  const isSafe = pjRevenue > 0 && currentProLabore >= targetProLabore;
  const hasRevenue = pjRevenue > 0;

  const tone = !hasRevenue ? "neutral" : isSafe ? "safe" : "risk";
  const statusClasses = {
    neutral: {
      border: "border-border/70",
      bg: "bg-card",
      text: "text-muted-foreground",
      bar: "bg-muted-foreground/50",
      icon: <Gauge className="h-5 w-5 text-muted-foreground" />,
    },
    safe: {
      border: "border-success/35",
      bg: "bg-success/10",
      text: "text-success",
      bar: "bg-success",
      icon: <CheckCircle2 className="h-5 w-5 text-success" />,
    },
    risk: {
      border: "border-warning/40",
      bg: "bg-warning/10",
      text: "text-warning",
      bar: "bg-warning",
      icon: <AlertTriangle className="h-5 w-5 text-warning" />,
    },
  }[tone];

  return (
    <section className="px-5 pt-5">
      <div className={`rounded-2xl border ${statusClasses.border} ${statusClasses.bg} p-5 overflow-hidden`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-1.5">
              {statusClasses.icon}
              Monitor do Fator R
            </p>
            <h2 className="font-display text-xl mt-2">
              {!hasRevenue
                ? "Sem faturamento PJ Simples no mês"
                : isSafe
                  ? "Fator R Atingido: Você está no Anexo III (Imposto reduzido: ~6%)"
                  : `Risco Tributário: Você está caindo no Anexo V (Imposto: ~15.5%). Aumente seu Pró-Labore em ${brl2(missing)} para economizar.`}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
              O alvo fiscal é manter o pró-labore em pelo menos 28% do faturamento PJ Simples do mês.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
            <Metric label="Faturamento PJ" value={brl2(pjRevenue)} />
            <Metric label="Alvo 28%" value={brl2(targetProLabore)} />
            <Metric label="Pró-labore" value={brl2(currentProLabore)} accent={statusClasses.text} />
            <Metric label="Fator R" value={`${factorPercent.toFixed(1)}%`} accent={statusClasses.text} />
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
            <span>Progresso até 28%</span>
            <span className={statusClasses.text}>{Math.min(100, progress).toFixed(0)}%</span>
          </div>
          <div className="h-3 rounded-full bg-surface border border-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${statusClasses.bar}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            <span>28% mínimo</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, accent = "text-foreground" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono text-sm font-semibold mt-1 tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}
