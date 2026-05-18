import { useEffect, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Clock, X } from "lucide-react";
import { toast } from "sonner";
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
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const workplaceSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    submittingRef.current = false;
    setSubmitting(false);
    if (!open) return;
    setDate(prefill?.date ?? todayIso());
    setWorkplaceId(prefill?.workplaceId ?? store.workplaces[0]?.id ?? "");
    setHours(prefill?.hours ?? 12);
    setProcedure(prefill?.procedure ?? "");
    setTransportMode(prefill?.transportMode ?? "PRIVATE_TRANSPORT");
    setPrivateTransportCost(prefill?.privateTransportCost ?? 0);
    setExtraCost(prefill?.extraCost ?? 0);
    window.requestAnimationFrame(() => workplaceSelectRef.current?.focus());
  }, [open, prefill, store.workplaces]);

  const workplace = store.workplaces.find((item) => item.id === workplaceId);
  const gross = Math.max(0, (workplace?.hourlyRate ?? 0) * hours);
  const canSave = Boolean(workplaceId) && hours > 0;

  async function saveDraft() {
    if (submittingRef.current || submitting || !canSave) return;
    submittingRef.current = true;
    setSubmitting(true);
    const persistenceStatus = await store.addShift({
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
    if (persistenceStatus === "synced") {
      toast.success("Rascunho salvo no Inbox e sincronizado.");
    } else {
      toast.warning("Rascunho salvo localmente. Sincronização pendente.");
    }
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-md" />
        <Dialog.Content
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void saveDraft();
            }
          }}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl shadow-slate-900/20 backdrop-blur md:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl border border-sky-100 bg-sky-50 flex items-center justify-center text-sky-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <Dialog.Title className="font-display text-xl text-slate-900">Captura rápida</Dialog.Title>
                <Dialog.Description className="text-sm text-slate-500 mt-1">
                  {isRepeatMode
                    ? "Revise a data e salve este plantão repetido como pendência."
                    : "Capture o plantão agora. A revisão completa fica para depois."}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-900" aria-label="Fechar">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="mt-5 space-y-4">
            {isRepeatMode && (
              <label className="space-y-1.5 block">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Data do novo plantão</span>
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputCls} />
              </label>
            )}

            <label className="space-y-1.5 block">
              <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Hospital/Local</span>
              <select ref={workplaceSelectRef} value={workplaceId} onChange={(event) => setWorkplaceId(event.target.value)} className={inputCls}>
                {store.workplaces.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
              <label className="space-y-1.5 block">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Duração</span>
                <input type="number" min={1} value={hours || ""} onChange={(event) => setHours(+event.target.value || 0)} className={inputCls} />
              </label>
              <label className="space-y-1.5 block">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Procedimento</span>
                <input value={procedure} onChange={(event) => setProcedure(event.target.value)} placeholder="Opcional" className={inputCls} />
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-2">Transporte</p>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1">
                <TransportButton active={transportMode === "PRIVATE_TRANSPORT"} onClick={() => setTransportMode("PRIVATE_TRANSPORT")}>
                  Transporte Privado
                </TransportButton>
                <TransportButton active={transportMode === "PERSONAL_VEHICLE"} onClick={() => setTransportMode("PERSONAL_VEHICLE")}>
                  Veículo Pessoal
                </TransportButton>
              </div>
              {transportMode === "PRIVATE_TRANSPORT" && (
                <label className="mt-3 space-y-1.5 block">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Valor do Uber</span>
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
                  <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Gastos extras</span>
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

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <span className="text-xs text-slate-500">Bruto estimado</span>
              <span className="font-mono text-sm text-slate-900 tabular-nums">{brl2(gross)}</span>
            </div>

            <button
              type="button"
              onClick={saveDraft}
              disabled={!canSave || submitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {submitting ? "Salvando..." : "Salvar pendência"}
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
        active ? "border border-sky-200 bg-sky-50 text-sky-700" : "border border-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

const inputCls = "w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20";
