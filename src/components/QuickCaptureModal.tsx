import { useEffect, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Clock, X } from "lucide-react";
import { brl2, useStore, type ShiftTransportMode } from "@/lib/store";

export interface QuickCapturePrefill {
  date?: string;
  workplaceId: string;
  hours: number;
  procedure?: string;
  transportMode?: ShiftTransportMode;
  privateTransportCost?: number;
  extraCost?: number;
}

interface QuickCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: QuickCapturePrefill | null;
}

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export function QuickCaptureModal({ open, onOpenChange, prefill }: QuickCaptureModalProps) {
  const store = useStore();
  const isRepeatMode = Boolean(prefill);
  const [date, setDate] = useState(todayIso());
  const [workplaceId, setWorkplaceId] = useState(store.workplaces[0]?.id ?? "");
  const [hours, setHours] = useState(12);
  const [procedure, setProcedure] = useState("");
  const [transportMode, setTransportMode] = useState<ShiftTransportMode>("PRIVATE_TRANSPORT");
  const [privateTransportCost, setPrivateTransportCost] = useState(0);
  const [extraCost, setExtraCost] = useState(0);

  useEffect(() => {
    if (!open) return;
    setDate(prefill?.date ?? todayIso());
    setWorkplaceId(prefill?.workplaceId ?? store.workplaces[0]?.id ?? "");
    setHours(prefill?.hours ?? 12);
    setProcedure(prefill?.procedure ?? "");
    setTransportMode(prefill?.transportMode ?? "PRIVATE_TRANSPORT");
    setPrivateTransportCost(prefill?.privateTransportCost ?? 0);
    setExtraCost(prefill?.extraCost ?? 0);
  }, [open, prefill, store.workplaces]);

  const workplace = store.workplaces.find((item) => item.id === workplaceId);
  const gross = Math.max(0, (workplace?.hourlyRate ?? 0) * hours);
  const canSave = Boolean(workplaceId) && hours > 0;

  function saveDraft() {
    if (!canSave) return;
    store.addShift({
      recordStatus: "draft",
      date: isRepeatMode ? date : todayIso(),
      workplaceId,
      originId: "home",
      hours,
      gross,
      procedure: procedure.trim() || undefined,
      extraCost: transportMode === "PERSONAL_VEHICLE" ? extraCost : 0,
      transportMode,
      privateTransportCost: transportMode === "PRIVATE_TRANSPORT" ? privateTransportCost : 0,
    });
    setDate(todayIso());
    setProcedure("");
    setPrivateTransportCost(0);
    setExtraCost(0);
    setTransportMode("PRIVATE_TRANSPORT");
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-card/95 p-5 shadow-[0_28px_90px_rgba(2,6,23,0.34)] backdrop-blur md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl border border-primary/20 bg-primary/10 flex items-center justify-center text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <Dialog.Title className="font-display text-xl">Quick Capture</Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground mt-1">
                  {isRepeatMode
                    ? "Revise a data e salve este plantão repetido como pendência."
                    : "Capture o plantão agora. A revisão completa fica para depois."}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close className="rounded-xl border border-border p-2 text-muted-foreground hover:text-foreground transition" aria-label="Fechar">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="mt-5 space-y-4">
            {isRepeatMode && (
              <label className="space-y-1.5 block">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Data do novo plantão</span>
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputCls} />
              </label>
            )}

            <label className="space-y-1.5 block">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Hospital/Local</span>
              <select value={workplaceId} onChange={(event) => setWorkplaceId(event.target.value)} className={inputCls}>
                {store.workplaces.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
              <label className="space-y-1.5 block">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Duração</span>
                <input type="number" min={1} value={hours || ""} onChange={(event) => setHours(+event.target.value || 0)} className={inputCls} />
              </label>
              <label className="space-y-1.5 block">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Procedimento</span>
                <input value={procedure} onChange={(event) => setProcedure(event.target.value)} placeholder="Opcional" className={inputCls} />
              </label>
            </div>

            <div className="rounded-2xl border border-border bg-surface-elevated/50 p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Transporte</p>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
                <TransportButton active={transportMode === "PRIVATE_TRANSPORT"} onClick={() => setTransportMode("PRIVATE_TRANSPORT")}>
                  Transporte Privado
                </TransportButton>
                <TransportButton active={transportMode === "PERSONAL_VEHICLE"} onClick={() => setTransportMode("PERSONAL_VEHICLE")}>
                  Veículo Pessoal
                </TransportButton>
              </div>
              {transportMode === "PRIVATE_TRANSPORT" && (
                <label className="mt-3 space-y-1.5 block">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Valor do Uber</span>
                  <input
                    type="number"
                    min={0}
                    value={privateTransportCost || ""}
                    onChange={(event) => setPrivateTransportCost(+event.target.value || 0)}
                    placeholder="0,00"
                    className={`${inputCls} text-right tabular-nums`}
                  />
                </label>
              )}
              {isRepeatMode && transportMode === "PERSONAL_VEHICLE" && (
                <label className="mt-3 space-y-1.5 block">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Gastos extras</span>
                  <input
                    type="number"
                    min={0}
                    value={extraCost || ""}
                    onChange={(event) => setExtraCost(+event.target.value || 0)}
                    placeholder="0,00"
                    className={`${inputCls} text-right tabular-nums`}
                  />
                </label>
              )}
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-elevated/50 px-3 py-2.5">
              <span className="text-xs text-muted-foreground">Bruto estimado</span>
              <span className="font-mono text-sm text-primary tabular-nums">{brl2(gross)}</span>
            </div>

            <button
              type="button"
              onClick={saveDraft}
              disabled={!canSave}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition"
            >
              Salvar pendência
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TransportButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${
        active ? "border border-primary/40 bg-primary/10 text-primary" : "border border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

const inputCls = "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
