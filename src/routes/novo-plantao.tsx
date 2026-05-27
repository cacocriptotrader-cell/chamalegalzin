import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, computeShift, brl2, TAX_LABELS, type Shift, type ShiftTransportMode } from "@/lib/store";
import { Section } from "@/components/Section";
import { Calendar } from "@/components/ui/calendar";
import { MapPin, Navigation, Save, Info, CalendarDays, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/novo-plantao")({
  head: () => ({
    meta: [
      { title: "Novo Plantão — Docfin" },
      { name: "description", content: "Registre um plantão com cálculo dinâmico de logística e lucro líquido do dia." },
    ],
  }),
  component: NewShift,
});

function NewShift() {
  const store = useStore();
  const nav = useNavigate();
  const today = useMemo(() => startOfToday(), []);
  const [workplaceId, setWorkplaceId] = useState(store.workplaces[0]?.id ?? "");
  const [originId, setOriginId] = useState("home");
  const [hours, setHours] = useState(12);
  const [gross, setGross] = useState(0);
  const [extraCost, setExtraCost] = useState(40);
  const [transportMode, setTransportMode] = useState<ShiftTransportMode>("PERSONAL_VEHICLE");
  const [privateTransportCost, setPrivateTransportCost] = useState(0);
  const [selectedDates, setSelectedDates] = useState<Date[]>([today]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const wp = store.workplaces.find((w) => w.id === workplaceId);
  const suggestedGross = gross || (wp?.hourlyRate ?? 0) * hours;
  const sortedDates = useMemo(
    () => selectedDates.map(startOfLocalDay).sort((a, b) => a.getTime() - b.getTime()),
    [selectedDates],
  );
  const selectedDateIso = sortedDates[0] ? toLocalIsoDate(sortedDates[0]) : toLocalIsoDate(today);
  const totalShifts = sortedDates.length;
  const batchGross = suggestedGross * totalShifts;

  const preview = useMemo<Shift>(() => ({
    id: "preview",
    entityDomain: "PJ",
    date: selectedDateIso,
    workplaceId,
    originId,
    hours,
    gross: suggestedGross,
    extraCost: transportMode === "PERSONAL_VEHICLE" ? extraCost : 0,
    transportMode,
    privateTransportCost,
  }), [selectedDateIso, workplaceId, originId, hours, suggestedGross, extraCost, transportMode, privateTransportCost]);
  const math = wp ? computeShift(store, preview) : { km: 0, fuelCost: 0, wearCost: 0, tax: 0, net: 0, logistics: 0, settlementAdjustment: 0 };

  async function save() {
    if (!wp || saving) return;
    if (sortedDates.length === 0) {
      setFormError("Selecione pelo menos uma data para salvar o plantão.");
      return;
    }

    setSaving(true);
    setFormError(null);
    await store.addShifts(sortedDates.map((date) => ({
      date: toLocalIsoDate(date),
      workplaceId,
      originId,
      hours,
      gross: suggestedGross,
      extraCost: transportMode === "PERSONAL_VEHICLE" ? extraCost : 0,
      transportMode,
      privateTransportCost: transportMode === "PRIVATE_TRANSPORT" ? privateTransportCost : 0,
      paymentStatus: "PENDING",
    })));
    setSaving(false);
    nav({ to: "/dashboard" });
  }

  function removeSelectedDate(dateToRemove: Date) {
    const iso = toLocalIsoDate(dateToRemove);
    setSelectedDates((current) => current.filter((date) => toLocalIsoDate(date) !== iso));
  }

  return (
    <>
      <Section title="Novo plantão" subtitle="Cálculo dinâmico de rota, imposto e líquido">
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <Field label="Datas do lote" icon={<CalendarDays className="h-3.5 w-3.5" />}>
            <div className="rounded-2xl border border-border bg-surface-elevated/30 p-2">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => {
                  setSelectedDates(dates ?? []);
                  setFormError(null);
                }}
                className="mx-auto max-w-full"
              />
            </div>
            <div className="mt-3 rounded-2xl border border-border bg-card/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-foreground">Datas selecionadas</p>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {totalShifts} plantão{totalShifts === 1 ? "" : "es"}
                </span>
              </div>
              {sortedDates.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {sortedDates.map((selectedDate) => (
                    <button
                      key={toLocalIsoDate(selectedDate)}
                      type="button"
                      onClick={() => removeSelectedDate(selectedDate)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3 text-xs font-medium text-foreground transition hover:border-destructive/50 hover:text-destructive"
                    >
                      {formatChipDate(selectedDate)}
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-warning">Nenhuma data selecionada. Escolha pelo menos um dia no calendário.</p>
              )}
            </div>
          </Field>

          <Field label="Origem" icon={<MapPin className="h-3.5 w-3.5" />}>
            <select value={originId} onChange={(e) => setOriginId(e.target.value)} className={inputCls}>
              <option value="home">{store.base.label}</option>
              {store.workplaces.filter((w) => w.id !== workplaceId).map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Destino (Hospital)" icon={<Navigation className="h-3.5 w-3.5" />}>
            <select value={workplaceId} onChange={(e) => setWorkplaceId(e.target.value)} className={inputCls}>
              {store.workplaces.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Modalidade de transporte">
            <SegmentedTransportControl value={transportMode} onChange={setTransportMode} />
          </Field>

          <Field label="Valor total do plantão (R$)">
            <input type="number" min={0} value={suggestedGross || ""} onChange={(e) => setGross(+e.target.value)} className={inputCls} />
          </Field>

          <div className="grid grid-cols-3 gap-2">
            {[6, 12, 24].map((h) => (
              <button key={h} type="button" onClick={() => setHours(h)} className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${hours === h ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface-elevated/40 text-muted-foreground hover:text-foreground"}`}>
                {h}h
              </button>
            ))}
          </div>

          {transportMode === "PERSONAL_VEHICLE" ? (
            <Field label="Gastos extras (R$)">
              <input type="number" min={0} value={extraCost} onChange={(e) => setExtraCost(+e.target.value)} className={inputCls} />
            </Field>
          ) : (
            <Field label="Custo Direto (Ida e Volta)">
              <input type="number" min={0} value={privateTransportCost || ""} onChange={(e) => setPrivateTransportCost(+e.target.value)} placeholder="0,00" className={inputCls} />
            </Field>
          )}

          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-primary">Total do lote</p>
                <p className="text-sm text-foreground">
                  {totalShifts} plantão{totalShifts === 1 ? "" : "es"} · {hours}h cada
                </p>
              </div>
              <p className="font-mono text-lg font-semibold text-primary tabular-nums">{brl2(batchGross)}</p>
            </div>
          </div>

          {formError && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              {formError}
            </div>
          )}
        </div>
      </Section>

      <Section title="Resumo do dia" subtitle={wp ? TAX_LABELS[wp.regime] : ""}>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
            <span>{store.workplaces.find((w) => w.id === originId)?.name ?? store.base.label}</span>
            <span>→</span>
            <span>{wp?.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {transportMode === "PERSONAL_VEHICLE" ? (
              <>
                <Metric label="Distância (ida+volta)" value={`${math.km.toFixed(1)} km`} />
                <Metric label="Gasolina (deduzida)" value={brl2(math.fuelCost)} accent="warning" />
                <Metric label="Desgaste (deprec.+manut.)" value={brl2(math.wearCost)} accent="warning" />
              </>
            ) : (
              <>
                <Metric label="Transporte privado" value="Ativo" />
                <Metric label="Custo direto" value={brl2(math.logistics)} accent="warning" />
                <Metric label="Distância" value="Ignorada" />
              </>
            )}
            <Metric label="Imposto estimado" value={brl2(math.tax)} accent="warning" />
            <div className="col-span-2 bg-surface-elevated/40 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Logística total</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-primary">
                        <Info className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-[11px] leading-snug">
                      {transportMode === "PERSONAL_VEHICLE"
                        ? "Inclui combustível, depreciação e manutenção da rota, mais gastos extras informados."
                        : "Custo direto informado para transporte privado ida e volta."}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="font-mono text-sm text-warning">{brl2(math.logistics)}</p>
            </div>
          </div>
          <div className="border-t border-border pt-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Lucro líquido do plantão</p>
              <p className={`font-display text-3xl mt-0.5 ${math.net >= 0 ? "text-gradient" : "text-destructive"}`}>
                {brl2(math.net)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">Bruto: {brl2(suggestedGross)}</p>
            </div>
            <button onClick={save} disabled={!wp || sortedDates.length === 0 || saving}
              className="rounded-xl px-5 py-3 text-sm font-medium text-primary-foreground inline-flex items-center gap-2 disabled:opacity-50"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
              <Save className="h-4 w-4" />
              {saving
                ? "Salvando..."
                : `Salvar ${totalShifts} Plantão${totalShifts === 1 ? "" : "es"}`}
            </button>
          </div>
        </div>
      </Section>
    </>
  );
}

const inputCls = "w-full bg-input/60 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function startOfToday() {
  return startOfLocalDay(new Date());
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

function SegmentedTransportControl({
  value,
  onChange,
}: {
  value: ShiftTransportMode;
  onChange: (value: ShiftTransportMode) => void;
}) {
  const options: Array<{ value: ShiftTransportMode; label: string }> = [
    { value: "PERSONAL_VEHICLE", label: "Veículo Pessoal" },
    { value: "PRIVATE_TRANSPORT", label: "Transporte Privado" },
  ];

  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface-elevated/40 p-1">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${
              active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}
function Metric({ label, value, accent }: { label: string; value: string; accent?: "warning" }) {
  return (
    <div className="bg-surface-elevated/40 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono text-sm mt-1 ${accent === "warning" ? "text-warning" : ""}`}>{value}</p>
    </div>
  );
}
