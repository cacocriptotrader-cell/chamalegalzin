import {
  brl2,
  getRollingFatorRSnapshot,
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
  const fatorR = getRollingFatorRSnapshot(store, refYear, refMonth);
  const isSafe = fatorR.safe;
  const hasRevenue = fatorR.hasRevenue;

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
              Fator R FS12/RBT12
            </p>
            <h2 className="font-display text-xl mt-2">
              {!hasRevenue
                ? "Sem faturamento PJ Simples na janela fiscal"
                : isSafe
                  ? "Janela móvel em zona de Anexo III"
                  : `Janela móvel em risco de Anexo V. Aumente a folha/pró-labore acumulado em ${brl2(fatorR.missingProLabore)} para reduzir o risco.`}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
              A razão agora usa FS12/RBT12: folha e pró-labore acumulados divididos pela receita bruta PJ Simples acumulada nos 12 meses até a competência selecionada.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
            <Metric label="RBT12" value={brl2(fatorR.accumulatedRevenue)} />
            <Metric label="Alvo 28%" value={brl2(fatorR.targetProLabore)} />
            <Metric label="FS12" value={brl2(fatorR.accumulatedProLabore)} accent={statusClasses.text} />
            <Metric label="Fator R" value={`${fatorR.factorPercent.toFixed(1)}%`} accent={statusClasses.text} />
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
            <span>Progresso FS12 até 28% da RBT12</span>
            <span className={statusClasses.text}>{Math.min(100, fatorR.progressPercent).toFixed(0)}%</span>
          </div>
          <div className="h-3 rounded-full bg-surface border border-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${statusClasses.bar}`}
              style={{ width: `${fatorR.progressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            <span>28% mínimo</span>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-surface-elevated/60 p-4">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Calibragem de Histórico Fiscal</p>
            <p className="text-xs text-muted-foreground">
              Informe os acumulados dos 11 meses anteriores ao início do uso do DocFin. Esses valores entram na base FS12/RBT12 junto com os meses registrados no aplicativo.
            </p>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Receita bruta dos 11 meses anteriores</span>
              <input
                type="number"
                min={0}
                value={store.fatorRHistorySetup.previous11MonthsRevenue || ""}
                onChange={(event) => store.updateFatorRHistorySetup(+event.target.value || 0, store.fatorRHistorySetup.previous11MonthsProLabore)}
                className={inputCls}
                placeholder="0,00"
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Soma de tudo que você faturou nos últimos 12 meses.
              </p>
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Folha/pró-labore dos 11 meses anteriores</span>
              <input
                type="number"
                min={0}
                value={store.fatorRHistorySetup.previous11MonthsProLabore || ""}
                onChange={(event) => store.updateFatorRHistorySetup(store.fatorRHistorySetup.previous11MonthsRevenue, +event.target.value || 0)}
                className={inputCls}
                placeholder="0,00"
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Soma de todo o Pró-labore pago nos últimos 12 meses. Usado para blindar seu imposto no Anexo III.
              </p>
            </label>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <Metric label="Mês atual" value={brl2(fatorR.currentMonthRevenue)} />
            <Metric label="11 meses no app" value={brl2(fatorR.previous11MonthsRevenueFromStore)} />
            <Metric label="Histórico receita" value={brl2(fatorR.setupRevenue)} />
            <Metric label="Histórico folha" value={brl2(fatorR.setupProLabore)} />
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

const inputCls = "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
