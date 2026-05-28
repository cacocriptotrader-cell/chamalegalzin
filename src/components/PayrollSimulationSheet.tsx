import * as Dialog from "@radix-ui/react-dialog";
import { Calculator, CheckCircle2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { brl2 } from "@/lib/store";
import { simulateProLabore, type ProLaboreResult } from "@/lib/payrollEngine";

type PayrollSimulationSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialGrossAmount: number;
  initialDependents?: number;
  rbt12: number;
  payroll12ExcludingCurrent: number;
  onApply: (payload: {
    grossAmount: number;
    dependents: number;
    result: ProLaboreResult;
  }) => void;
};

const inputCls = "w-full min-h-11 rounded-xl border border-border bg-card px-3 py-2.5 text-base text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25";

export function PayrollSimulationSheet({
  open,
  onOpenChange,
  initialGrossAmount,
  initialDependents = 0,
  rbt12,
  payroll12ExcludingCurrent,
  onApply,
}: PayrollSimulationSheetProps) {
  const [grossAmount, setGrossAmount] = useState(String(initialGrossAmount || ""));
  const [dependents, setDependents] = useState(String(initialDependents || ""));

  useEffect(() => {
    if (!open) return;
    setGrossAmount(String(initialGrossAmount || ""));
    setDependents(String(initialDependents || ""));
  }, [initialDependents, initialGrossAmount, open]);

  const normalizedGross = parseDecimal(grossAmount);
  const normalizedDependents = Math.max(0, Math.floor(parseDecimal(dependents)));
  const result = useMemo(
    () => simulateProLabore(normalizedGross, normalizedDependents),
    [normalizedDependents, normalizedGross],
  );

  const projectedPayroll12 = Math.max(0, payroll12ExcludingCurrent) + result.grossAmount;
  const projectedFatorR = rbt12 > 0 ? projectedPayroll12 / rbt12 : result.grossAmount > 0 ? 0.28 : 0.01;
  const projectedFatorRPercent = projectedFatorR * 100;
  const fatorRSafe = projectedFatorR >= 0.28;

  function applySimulation() {
    onApply({
      grossAmount: result.grossAmount,
      dependents: result.dependents,
      result,
    });
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-md" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl outline-none sm:w-[520px]">
          <div className="border-b border-border bg-surface-elevated/80 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                  <Calculator className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <Dialog.Title className="font-display text-xl text-foreground">Simular Pró-labore</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Calcule INSS, IRRF e impacto no Fator R antes de aplicar a folha na guia.
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close className="rounded-xl border border-border p-2 text-muted-foreground transition hover:text-foreground" aria-label="Fechar">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <section className="premium-panel rounded-2xl p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Pró-labore bruto</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={grossAmount}
                    onChange={(event) => setGrossAmount(event.target.value)}
                    data-testid="tax-payroll-input"
                    className={`${inputCls} text-right font-mono tabular-nums`}
                    placeholder="0,00"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Dependentes</span>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    inputMode="numeric"
                    value={dependents}
                    onChange={(event) => setDependents(event.target.value)}
                    className={`${inputCls} text-right font-mono tabular-nums`}
                    placeholder="0"
                  />
                </label>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <PayrollMetric label="INSS retido" value={brl2(result.inssAmount)} detail={`Base limitada: ${brl2(result.inssBase)}`} />
              <div className="premium-panel rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">IRRF retido</p>
                <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-foreground">
                  {brl2(result.irrfAmount)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Base IRRF: {brl2(result.irrfTaxableBase)}</p>
                {result.additionalReducer > 0 && (
                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      Redutor Adicional (Lei 15.270)
                    </span>
                    <span className="font-mono text-emerald-400">
                      + R$ {result.additionalReducer.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
              <PayrollMetric
                label="Dedução escolhida"
                value={brl2(result.selectedDeduction)}
                detail={result.deductionStrategy === "simplified" ? "Desconto simplificado aplicado" : "INSS + dependentes aplicado"}
              />
              <PayrollMetric label="Líquido estimado" value={brl2(result.netAmount)} detail={`Retenção total: ${brl2(result.totalWithheld)}`} accent="success" />
            </section>

            <section className="premium-panel rounded-2xl p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Impacto no Fator R</p>
                  <p className={`mt-1 font-mono text-3xl font-semibold tabular-nums ${fatorRSafe ? "text-success" : "text-destructive"}`}>
                    {formatPercent(projectedFatorRPercent)}
                  </p>
                </div>
                <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${fatorRSafe ? "border-success/35 bg-success/10 text-success" : "border-destructive/35 bg-destructive/10 text-destructive"}`}>
                  {fatorRSafe ? "Anexo III provável" : "Risco Anexo V"}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Projeção com RBT12 de {brl2(rbt12)} e folha acumulada anterior de {brl2(payroll12ExcludingCurrent)}.
              </p>
            </section>
          </div>

          <div className="border-t border-border bg-surface-elevated/75 px-5 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
                Cancelar
              </Dialog.Close>
              <button
                type="button"
                onClick={applySimulation}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                <CheckCircle2 className="h-4 w-4" />
                Aplicar na guia
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PayrollMetric({
  label,
  value,
  detail,
  accent = "default",
}: {
  label: string;
  value: string;
  detail: string;
  accent?: "default" | "success";
}) {
  return (
    <div className="premium-panel rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={`mt-2 font-mono text-xl font-semibold tabular-nums ${accent === "success" ? "text-success" : "text-foreground"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function parseDecimal(value: string) {
  const normalized = Number(value.replace(",", "."));
  return Number.isFinite(normalized) ? Math.max(0, normalized) : 0;
}

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  })}%`;
}
