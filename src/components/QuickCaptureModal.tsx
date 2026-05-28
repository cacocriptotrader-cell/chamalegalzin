import { useEffect, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { brl2, useStore, type ShiftTransportMode } from "@/lib/store";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { showMicroFeedbackToast } from "@/components/MicroFeedbackPrompt";

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
  const navigate = useNavigate();
  const isRepeatMode = Boolean(prefill);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [workplaceId, setWorkplaceId] = useState(store.workplaces[0]?.id ?? "");
  const [hospitalName, setHospitalName] = useState(store.workplaces[0]?.name ?? "");
  const [hours, setHours] = useState(12);
  const [gross, setGross] = useState(0);
  const [grossTouched, setGrossTouched] = useState(false);
  const [procedure, setProcedure] = useState("");
  const [transportMode, setTransportMode] = useState<ShiftTransportMode>("PRIVATE_TRANSPORT");
  const [privateTransportCost, setPrivateTransportCost] = useState(0);
  const [extraCost, setExtraCost] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const hospitalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    submittingRef.current = false;
    setSubmitting(false);
    if (!open) return;
    const initialWorkplace = store.workplaces.find((item) => item.id === prefill?.workplaceId) ?? store.workplaces[0];
    const initialHours = prefill?.hours ?? 12;
    setSelectedDates([parseIsoDate(prefill?.date ?? todayIso())]);
    setWorkplaceId(initialWorkplace?.id ?? "");
    setHospitalName(initialWorkplace?.name ?? "");
    setHours(initialHours);
    setGross((initialWorkplace?.hourlyRate ?? 0) * initialHours);
    setGrossTouched(false);
    setProcedure(prefill?.procedure ?? "");
    setTransportMode(prefill?.transportMode ?? "PRIVATE_TRANSPORT");
    setPrivateTransportCost(prefill?.privateTransportCost ?? 0);
    setExtraCost(prefill?.extraCost ?? 0);
    window.requestAnimationFrame(() => hospitalInputRef.current?.focus());
  }, [open, prefill, store.workplaces]);

  const normalizedHospitalName = hospitalName.trim();
  const matchedWorkplace = store.workplaces.find((item) => item.name.trim().toLowerCase() === normalizedHospitalName.toLowerCase());
  const selectedWorkplace = matchedWorkplace ?? store.workplaces.find((item) => item.id === workplaceId);
  const suggestedGross = Math.max(0, (selectedWorkplace?.hourlyRate ?? 0) * hours);
  const finalGross = grossTouched ? Math.max(0, gross) : suggestedGross;
  const isNewHospital = Boolean(normalizedHospitalName) && !matchedWorkplace;
  const canSave = Boolean(normalizedHospitalName) && hours > 0 && finalGross > 0 && selectedDates.length > 0;

  function updateHospitalName(nextName: string) {
    setHospitalName(nextName);
    const existing = store.workplaces.find((item) => item.name.trim().toLowerCase() === nextName.trim().toLowerCase());
    setWorkplaceId(existing?.id ?? "");
    if (!grossTouched) {
      setGross(Math.max(0, (existing?.hourlyRate ?? 0) * hours));
    }
  }

  function updateHours(nextHours: number) {
    setHours(nextHours);
    if (!grossTouched) {
      const existing = store.workplaces.find((item) => item.name.trim().toLowerCase() === hospitalName.trim().toLowerCase());
      setGross(Math.max(0, (existing?.hourlyRate ?? 0) * nextHours));
    }
  }

  async function saveDraft() {
    if (submittingRef.current || submitting || !canSave) return;
    submittingRef.current = true;
    setSubmitting(true);
    const workplace = matchedWorkplace ?? store.addWorkplace(createQuickHospital(normalizedHospitalName));
    const actionId = `shift_capture:${Date.now()}`;
    const persistenceTask = store.addShifts(selectedDates.map((selectedDate) => ({
      recordStatus: "draft",
      date: toLocalIsoDate(selectedDate),
      workplaceId: workplace.id,
      originId: "home",
      hours,
      gross: finalGross,
      procedure: procedure.trim() || undefined,
      extraCost: transportMode === "PERSONAL_VEHICLE" ? extraCost : 0,
      transportMode,
      privateTransportCost: transportMode === "PRIVATE_TRANSPORT" ? privateTransportCost : 0,
    })));

    onOpenChange(false);
    toast.success("Rascunho salvo no Inbox e sincronizado.", {
      duration: 4000,
      action: {
        label: "Ver pendência",
        onClick: () => navigate({ to: "/dashboard" }),
      },
    });
    window.setTimeout(() => {
      showMicroFeedbackToast({
        actionId,
        context: "shift_capture",
        type: "CES",
        question: "Foi rápido registrar esse plantão?",
      });
    }, 650);

    setSelectedDates([parseIsoDate(todayIso())]);
    setHospitalName(store.workplaces[0]?.name ?? "");
    setWorkplaceId(store.workplaces[0]?.id ?? "");
    setGross(0);
    setGrossTouched(false);
    setProcedure("");
    setPrivateTransportCost(0);
    setExtraCost(0);
    setTransportMode("PRIVATE_TRANSPORT");
    void persistenceTask.catch(() => undefined);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md" />
        <Dialog.Content
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void saveDraft();
            }
          }}
          className="premium-modal fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl p-0 backdrop-blur"
        >
          <div className="flex items-start justify-between gap-4 p-5 pb-0 md:p-6 md:pb-0">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl border border-primary/25 bg-primary/10 flex items-center justify-center text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <Dialog.Title className="font-display text-xl text-foreground">Captura rápida</Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground mt-1">
                  {isRepeatMode
                    ? "Revise a data e salve este plantão repetido como pendência."
                    : "Capture o plantão agora. A revisão completa fica para depois."}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close className="rounded-xl border border-border p-2 text-muted-foreground transition hover:text-foreground" aria-label="Fechar">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-5 pb-4 md:px-6">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {isRepeatMode ? "Datas do novo plantão" : "Datas"}
              </span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`${inputCls} flex items-center justify-between text-left`}
                  >
                    <span className={selectedDates.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                      {selectedDates.length > 0
                        ? `${selectedDates.length} data${selectedDates.length === 1 ? "" : "s"} selecionada${selectedDates.length === 1 ? "" : "s"}`
                        : "Selecionar datas..."}
                    </span>
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-2">
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => setSelectedDates(dates ?? [])}
                    className="max-w-full"
                  />
                </PopoverContent>
              </Popover>
              {selectedDates.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedDates
                    .map(startOfLocalDay)
                    .sort((a, b) => a.getTime() - b.getTime())
                    .map((selectedDate) => (
                      <span
                        key={toLocalIsoDate(selectedDate)}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 text-xs font-medium text-primary"
                      >
                        <CalendarDays className="h-3 w-3" />
                        {formatChipDate(selectedDate)}
                      </span>
                    ))}
                </div>
              ) : (
                <p className="pt-2 text-xs text-warning">Selecione pelo menos uma data para salvar.</p>
              )}
            </div>

            <label className="space-y-1.5 block">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Hospital/Local</span>
              <input
                ref={hospitalInputRef}
                value={hospitalName}
                onChange={(event) => updateHospitalName(event.target.value)}
                list="quick-capture-hospitals"
                placeholder="Digite o hospital, mesmo que ainda não exista"
                className={inputCls}
              />
              <datalist id="quick-capture-hospitals">
                {store.workplaces.map((item) => (
                  <option key={item.id} value={item.name} />
                ))}
              </datalist>
              {isNewHospital && (
                <p className="text-xs leading-relaxed text-primary">
                  Hospital novo será criado como rascunho administrativo. CNPJ, regime e regras fiscais ficam para a consolidação.
                </p>
              )}
            </label>

            <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
              <label className="space-y-1.5 block">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Duração</span>
                <input type="number" min={1} value={hours || ""} onChange={(event) => updateHours(+event.target.value || 0)} className={inputCls} />
              </label>
              <label className="space-y-1.5 block">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Procedimento</span>
                <input value={procedure} onChange={(event) => setProcedure(event.target.value)} placeholder="Opcional" className={inputCls} />
              </label>
            </div>
            <label className="space-y-1.5 block">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Valor bruto</span>
              <input
                type="number"
                min={0}
                value={finalGross || ""}
                onChange={(event) => {
                  setGross(+event.target.value || 0);
                  setGrossTouched(true);
                }}
                placeholder="0,00"
                className={`${inputCls} text-right font-mono tabular-nums`}
              />
            </label>

            <div className="premium-panel rounded-2xl p-3">
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

            <div className="premium-panel flex items-center justify-between rounded-xl px-3 py-2.5">
              <span className="text-xs text-muted-foreground">Bruto estimado</span>
              <span className="font-mono text-sm text-success tabular-nums">{brl2(finalGross)}</span>
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-background/95 p-4 backdrop-blur md:px-6">
            <button
              type="button"
              onClick={saveDraft}
              disabled={!canSave || submitting}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_rgba(15,118,110,0.18)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
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
        active ? "border border-primary/40 bg-primary/10 text-primary" : "border border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

const inputCls = "w-full min-h-11 rounded-xl border border-border bg-card px-3 py-2.5 text-base text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25";

function createQuickHospital(name: string) {
  return {
    name,
    address: "",
    lat: 0,
    lng: 0,
    regime: "PJ_SIMPLES" as const,
    hourlyRate: 0,
    paymentRule: "",
    cutOffDay: 20,
    paymentDay: 5,
    paymentTermDays: 30,
  };
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return startOfLocalDay(new Date());
  return new Date(year, month - 1, day);
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toLocalIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatChipDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
