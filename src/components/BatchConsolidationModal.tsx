import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { TAX_LABELS, type BatchShiftConsolidationData, type PaymentStatus, type TaxRegime } from "@/lib/store";

interface BatchConsolidationModalProps {
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: BatchShiftConsolidationData) => void;
}

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export function BatchConsolidationModal({ count, open, onOpenChange, onConfirm }: BatchConsolidationModalProps) {
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const [taxationType, setTaxationType] = useState<TaxRegime | "">("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PENDING");
  const [expectedPaymentDate, setExpectedPaymentDate] = useState("");
  const [actualPaymentDate, setActualPaymentDate] = useState(todayIso());
  const [paymentDateError, setPaymentDateError] = useState(false);
  const isValid = Boolean(paymentStatus);
  const requiresActualPaymentDate = paymentStatus === "PAID";

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => firstFieldRef.current?.focus());
  }, [open]);

  function save() {
    if (!isValid) return;
    if (requiresActualPaymentDate && !actualPaymentDate) {
      setPaymentDateError(true);
      return;
    }
    onConfirm({
      taxationType: taxationType || undefined,
      paymentStatus,
      expectedPaymentDate: expectedPaymentDate || undefined,
      actualPaymentDate: paymentStatus === "PAID" ? actualPaymentDate : undefined,
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md" />
        <Dialog.Content
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              save();
            }
          }}
          className="premium-modal fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl p-0"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border bg-surface-elevated/70 px-5 py-4">
            <div>
              <Dialog.Title className="font-display text-xl text-foreground">Consolidação em lote</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Aplique dados fiscais compartilhados a {count} rascunho{count === 1 ? "" : "s"} selecionado{count === 1 ? "" : "s"}.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-xl border border-border p-2 text-muted-foreground transition hover:text-foreground" aria-label="Fechar">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-4 p-5">
            <label className="space-y-1.5 block">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Regime fiscal padrão do lote (opcional)</span>
              <select ref={firstFieldRef} value={taxationType} onChange={(event) => setTaxationType(event.target.value as TaxRegime | "")} className={inputCls}>
                <option value="">Usar regime cadastrado em cada hospital</option>
                {Object.entries(TAX_LABELS).map(([regime, label]) => (
                  <option key={regime} value={regime}>{label}</option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 block">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Status de recebimento</span>
                <select
                  value={paymentStatus}
                  onChange={(event) => {
                    const next = event.target.value as PaymentStatus;
                    setPaymentStatus(next);
                    setPaymentDateError(false);
                    if (next === "PAID" && !actualPaymentDate) setActualPaymentDate(todayIso());
                  }}
                  className={inputCls}
                >
                  <option value="PAID">Recebido</option>
                  <option value="PENDING">A receber</option>
                </select>
              </label>
              <label className="space-y-1.5 block">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Previsão de recebimento</span>
                <input type="date" value={expectedPaymentDate} onChange={(event) => setExpectedPaymentDate(event.target.value)} className={inputCls} />
              </label>
            </div>

            {paymentStatus === "PAID" && (
              <label className="space-y-1.5 block">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Data do recebimento</span>
                <input
                  type="date"
                  required
                  value={actualPaymentDate}
                  onChange={(event) => {
                    setActualPaymentDate(event.target.value);
                    setPaymentDateError(false);
                  }}
                  className={`${inputCls} ${paymentDateError ? "border-rose-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-400/20" : ""}`}
                />
                {paymentDateError && (
                  <p className="text-xs text-rose-200">
                    Para marcar como recebido, informe a data exata do pagamento para a contabilidade.
                  </p>
                )}
              </label>
            )}

            <div className="premium-panel rounded-xl p-3 text-xs leading-relaxed text-muted-foreground">
              Hospital, data, duração e valor bruto serão preservados individualmente em cada rascunho.
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
                Cancelar
              </Dialog.Close>
              <button
                type="button"
                onClick={save}
                disabled={!isValid}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                Consolidar {count} selecionado{count === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputCls = "premium-input";
