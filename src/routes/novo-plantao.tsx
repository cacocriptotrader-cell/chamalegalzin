import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, computeShift, brl2, TAX_LABELS, type Shift } from "@/lib/store";
import { Section } from "@/components/Section";
import { MapPin, Navigation, Save, Info } from "lucide-react";
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
  const [workplaceId, setWorkplaceId] = useState(store.workplaces[0]?.id ?? "");
  const [originId, setOriginId] = useState("home");
  const [hours, setHours] = useState(12);
  const [gross, setGross] = useState(0);
  const [extraCost, setExtraCost] = useState(40);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const wp = store.workplaces.find((w) => w.id === workplaceId);
  const suggestedGross = gross || (wp?.hourlyRate ?? 0) * hours;

  const preview = useMemo<Shift>(() => ({
    id: "preview", date, workplaceId, originId, hours, gross: suggestedGross, extraCost,
  }), [date, workplaceId, originId, hours, suggestedGross, extraCost]);
  const math = wp ? computeShift(store, preview) : { km: 0, fuelCost: 0, wearCost: 0, tax: 0, net: 0, logistics: 0 };

  function save() {
    if (!wp) return;
    store.addShift({ date, workplaceId, originId, hours, gross: suggestedGross, extraCost });
    nav({ to: "/" });
  }

  return (
    <>
      <Section title="Novo plantão" subtitle="Cálculo dinâmico de rota, imposto e líquido">
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <Field label="Data">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
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

          <Field label="Gastos extras (R$)">
            <input type="number" min={0} value={extraCost} onChange={(e) => setExtraCost(+e.target.value)} className={inputCls} />
          </Field>
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
            <Metric label="Distância (ida+volta)" value={`${math.km.toFixed(1)} km`} />
            <Metric label="Gasolina (deduzida)" value={brl2(math.fuelCost)} accent="warning" />
            <Metric label="Desgaste (deprec.+manut.)" value={brl2(math.wearCost)} accent="warning" />
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
                      Inclui combustível, depreciação e manutenção da rota, mais gastos extras informados.
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
            <button onClick={save} disabled={!wp}
              className="rounded-xl px-5 py-3 text-sm font-medium text-primary-foreground inline-flex items-center gap-2 disabled:opacity-50"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
              <Save className="h-4 w-4" /> Salvar
            </button>
          </div>
        </div>
      </Section>
    </>
  );
}

const inputCls = "w-full bg-input/60 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

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
