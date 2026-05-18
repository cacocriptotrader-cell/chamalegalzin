import { useState } from "react";
import { brl2, calculateTotalDeductions, type Deduction, type DeductionType } from "@/lib/store";

interface DeductionManagerProps {
  deductions?: Deduction[];
  onChange: (deductions: Deduction[]) => void;
}

const DEDUCTION_TYPES: DeductionType[] = ["ISS_RETIDO", "IRRF", "CRF", "GLOSA", "TAXA_ADMIN", "REPASSE", "OUTRO"];

const DEDUCTION_LABELS: Record<DeductionType, string> = {
  ISS_RETIDO: "ISS retido",
  IRRF: "IRRF",
  CRF: "CRF/PIS/COFINS/CSLL",
  GLOSA: "Glosa",
  TAXA_ADMIN: "Taxa administrativa",
  REPASSE: "Repasse",
  OUTRO: "Outro",
};

export function DeductionManager({ deductions = [], onChange }: DeductionManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [type, setType] = useState<DeductionType>("GLOSA");
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState("");

  const total = calculateTotalDeductions({ deductions });

  function addDeduction() {
    if (amount <= 0) return;
    onChange([
      ...deductions,
      {
        id: `deduction-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        amount: Math.max(0, amount),
        notes: notes.trim() || undefined,
      },
    ]);
    setAmount(0);
    setNotes("");
    setType("GLOSA");
    setIsAdding(false);
  }

  function removeDeduction(id: string) {
    onChange(deductions.filter((deduction) => deduction.id !== id));
  }

  return (
    <div className="premium-panel grid gap-3 rounded-xl p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Retenções e descontos</p>
          <h4 className="font-display text-base mt-1">Deduções estruturadas</h4>
        </div>
        <p className="font-mono text-sm text-warning tabular-nums">{brl2(total)}</p>
      </div>

      {deductions.length > 0 && (
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {deductions.map((deduction) => (
            <div key={deduction.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{getDeductionLabel(deduction.type)}</p>
                {deduction.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{deduction.notes}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-sm text-warning tabular-nums">{brl2(deduction.amount)}</span>
                <button
                  type="button"
                  onClick={() => removeDeduction(deduction.id)}
                  className="rounded-lg border border-border px-2 py-1 text-[10px] text-muted-foreground transition hover:text-destructive"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="grid gap-2 md:grid-cols-[180px_150px_1fr_auto]">
          <select value={type} onChange={(event) => setType(event.target.value as DeductionType)} className={inputCls}>
            {DEDUCTION_TYPES.map((deductionType) => (
              <option key={deductionType} value={deductionType}>
                {DEDUCTION_LABELS[deductionType]}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={amount || ""}
            onChange={(event) => setAmount(Math.max(0, +event.target.value || 0))}
            placeholder="Valor"
            className={`${inputCls} text-right tabular-nums`}
          />
          <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observação opcional" className={inputCls} />
          <button
            type="button"
            onClick={addDeduction}
            disabled={amount <= 0}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        >
          + Adicionar Desconto
        </button>
      )}
    </div>
  );
}

function getDeductionLabel(type: DeductionType) {
  return DEDUCTION_LABELS[type] ?? "Outro";
}

const inputCls = "premium-input";
