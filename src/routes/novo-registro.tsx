import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useStore, computeShift, brl2, TAX_LABELS, computeTaxForRegime,
  checkTaxOptimization, getCurrentMonthPJTotal, computedProLaboreMonthly,
  calculateExpectedPaymentDate, didSkipCycle, fmtDate, fmtISO,
  type Shift, type TeamMember, type SurgeryRecord, type InvoiceMode,
  type TaxRegime,
} from "@/lib/store";
import { Section } from "@/components/Section";
import {
  MapPin, Navigation, Save, Info, Stethoscope, Scissors, Plus, Trash2,
  AlertTriangle, ShieldCheck, Users, Crown, UserCheck, ShieldAlert,
  CalendarClock, Zap, TrendingUp,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/novo-registro")({
  head: () => ({
    meta: [
      { title: "Novo Registro — Docfin" },
      { name: "description", content: "Registre plantões padrão ou cirurgias com ledger de repasses da equipe." },
    ],
  }),
  component: NovoRegistro,
});

type Tab = "shift" | "surgery";

function NovoRegistro() {
  const [tab, setTab] = useState<Tab>("shift");
  return (
    <>
      <Section title="Novo registro" subtitle="Plantão padrão ou cirurgia/procedimento com equipe">
        <div className="glass-card rounded-2xl p-1.5 grid grid-cols-2 gap-1">
          <TabBtn active={tab === "shift"} onClick={() => setTab("shift")} icon={<Stethoscope className="h-4 w-4" />} label="Plantão Padrão" />
          <TabBtn active={tab === "surgery"} onClick={() => setTab("surgery")} icon={<Scissors className="h-4 w-4" />} label="Cirurgia/Procedimento" />
        </div>
      </Section>
      {tab === "shift" ? <ShiftForm /> : <SurgeryForm />}
    </>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl py-3 text-sm font-medium inline-flex items-center justify-center gap-2 transition ${
        active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
      style={active ? { background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" } : undefined}
    >
      {icon} {label}
    </button>
  );
}

function RoleBtn({ active, onClick, icon, label, sub }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl p-3 text-left transition ${
        active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
      style={active ? { background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" } : undefined}
    >
      <div className="inline-flex items-center gap-2 text-sm font-medium">{icon} {label}</div>
      <div className="text-[11px] opacity-80 mt-0.5">{sub}</div>
    </button>
  );
}

/* ============ SHIFT FORM (Motor de Projeção de Caixa Implementado) ============ */
function ShiftForm() {
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

  // Regime override (Smart Tax Router): default = regime do workplace
  const [regimeOverride, setRegimeOverride] = useState<TaxRegime | null>(null);
  const effectiveRegime: TaxRegime = regimeOverride ?? (wp?.regime ?? "PJ_SIMPLES");
  // reset override when workplace changes
  useMemo(() => { setRegimeOverride(null); }, [workplaceId]);

  const preview = useMemo<Shift>(() => ({
    id: "preview", date, workplaceId, originId, hours, gross: suggestedGross, extraCost,
  }), [date, workplaceId, originId, hours, suggestedGross, extraCost]);
  const baseMath = wp ? computeShift(store, preview) : { km: 0, fuelCost: 0, wearCost: 0, tax: 0, net: 0, logistics: 0 };
  // recompute tax/net usando o regime efetivo (override)
  const math = useMemo(() => {
    const tax = computeTaxForRegime(suggestedGross, effectiveRegime, store);
    return { ...baseMath, tax, net: suggestedGross - tax - baseMath.logistics };
  }, [baseMath, suggestedGross, effectiveRegime, store]);

  // Smart Tax Router — somente avalia se o regime efetivo é PJ
  const today = new Date(date + "T12:00:00");
  const monthPJTotal = useMemo(
    () => getCurrentMonthPJTotal(store as any, today.getFullYear(), today.getMonth() + 1),
    [store, date],
  );
  const proLaboreTotal = computedProLaboreMonthly(store, today);
  const isPJ = effectiveRegime === "PJ_SIMPLES" || effectiveRegime === "PJ_LUCRO_PRESUMIDO";
  const taxAlert = isPJ
    ? checkTaxOptimization(suggestedGross, monthPJTotal, proLaboreTotal)
    : { triggered: false, projectedPJTotal: 0, requiredProLabore: 0, proLaboreShortfall: 0 };

  function save() {
    if (!wp) return;
    const payDate = calculateExpectedPaymentDate(date, wp);
    store.addShift({ 
      date, 
      workplaceId, 
      originId, 
      hours, 
      gross: suggestedGross, 
      extraCost,
      projectedNet: math.net,
      projectedPaymentDate: fmtISO(payDate)
    });
    nav({ to: "/" });
  }

  return (
    <>
      <Section title="Dados do plantão" subtitle="Cálculo dinâmico de rota, imposto e líquido">
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
          <Field label="Regime / Origem">
            <select value={effectiveRegime} onChange={(e) => setRegimeOverride(e.target.value as TaxRegime)} className={inputCls}>
              {Object.entries(TAX_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Resumo do dia" subtitle={wp ? TAX_LABELS[wp.regime] : ""}>
        <div className="glass-card rounded-2xl p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Metric label="Distância" value={`${math.km.toFixed(1)} km`} />
            <Metric label="Gasolina" value={brl2(math.fuelCost)} accent="warning" />
            <Metric label="Desgaste" value={brl2(math.wearCost)} accent="warning" />
            <Metric label="Imposto" value={brl2(math.tax)} accent="warning" />
            <div className="col-span-2 bg-surface-elevated/40 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Logística total</p>
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-primary"><Info className="h-3 w-3" /></button>
                </TooltipTrigger><TooltipContent side="top" className="max-w-[220px] text-[11px] leading-snug">
                  Combustível + depreciação + manutenção + extras.
                </TooltipContent></Tooltip></TooltipProvider>
              </div>
              <p className="font-mono text-sm text-warning">{brl2(math.logistics)}</p>
            </div>
          </div>

          {/* Motor de Projeção de Caixa — Card de Insight */}
          {wp && (() => {
            const payDate = calculateExpectedPaymentDate(date, wp);
            const skipped = didSkipCycle(date, wp);
            const instant = wp.paymentRule === "INSTANT_D0";
            const isRPA = effectiveRegime === "RPA" || effectiveRegime === "PF";
            const estimatedNetRPA = suggestedGross * 0.725; // Bruto - 27.5%

            return (
              <div className="mt-3 space-y-3">
                <div className={`rounded-xl border p-4 flex gap-3 ${
                  instant ? "border-emerald-500/30 bg-emerald-500/5"
                  : skipped ? "border-amber-500/30 bg-amber-500/5"
                  : "border-slate-500/30 bg-slate-500/5"
                }`}>
                  <div className="flex-shrink-0 pt-0.5">
                    {instant ? <Zap className="h-5 w-5 text-emerald-400" />
                      : skipped ? <AlertTriangle className="h-5 w-5 text-amber-400" />
                      : <CalendarClock className="h-5 w-5 text-slate-400" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${
                      instant ? "text-emerald-400" : skipped ? "text-amber-400" : "text-slate-300"
                    }`}>
                      Projeção de Recebimento: {fmtDate(payDate)}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {instant 
                        ? "Particular/Pix — Liquidação imediata em D+0."
                        : `Este plantão entra no ciclo de corte do dia ${wp.cutOffDay}. Envio da nota + ${wp.paymentTermDays} dias de prazo.`}
                    </p>
                    {isRPA && (
                      <div className="pt-2 mt-2 border-t border-white/5 flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                        <p className="text-[11px] text-slate-300">
                          Valor Líquido Estimado: <strong className="text-amber-400">{brl2(estimatedNetRPA)}</strong>. (Retenção na fonte projetada).
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {taxAlert.triggered && (
            <div className="mt-3">
              <TaxRouterInsight
                projectedTotal={taxAlert.projectedPJTotal}
                onSwitchToPF={() => setRegimeOverride("PF")}
              />
            </div>
          )}

          <div className="border-t border-border pt-4 mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Lucro líquido</p>
              <p className={`font-display text-3xl mt-0.5 ${math.net >= 0 ? "text-gradient" : "text-destructive"}`}>{brl2(math.net)}</p>
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

/* ============ SURGERY FORM (Ledger ramificado) ============ */
function SurgeryForm() {
  const store = useStore();
  const nav = useNavigate();
  const [myRole, setMyRole] = useState<"TITULAR" | "MEMBRO_EQUIPE">("TITULAR");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [procedure, setProcedure] = useState("");
  const [notes, setNotes] = useState("");

  // TITULAR
  const [hospitalId, setHospitalId] = useState(store.workplaces[0]?.id ?? "");
  const [totalGross, setTotalGross] = useState(0);
  const [invoiceMode, setInvoiceMode] = useState<InvoiceMode>("FRACTIONED");
  const [team, setTeam] = useState<TeamMember[]>([]);

  // MEMBRO_EQUIPE
  const [payingSurgeonName, setPayingSurgeonName] = useState("");
  const [myExpectedShare, setMyExpectedShare] = useState(0);

  const hospital = store.workplaces.find((w) => w.id === hospitalId);
  // Regime override (Smart Tax Router)
  const [regimeOverride, setRegimeOverride] = useState<TaxRegime | null>(null);
  const effectiveRegime: TaxRegime = regimeOverride ?? (hospital?.regime ?? "PJ_SIMPLES");
  useMemo(() => { setRegimeOverride(null); }, [hospitalId]);
  const teamTotal = team.reduce((a, m) => a + (m.amountDue || 0), 0);
  const myShareTitular = Math.max(0, totalGross - teamTotal);
  const taxBase = invoiceMode === "SINGLE" ? totalGross : myShareTitular;
  const taxRate = taxBase > 0 ? computeTaxForRegime(taxBase, effectiveRegime, store) / taxBase : 0;
  const taxEstimated = computeTaxForRegime(taxBase, effectiveRegime, store);
  const myNet = myShareTitular - taxEstimated;

  // Smart Tax Router — newAmount = parte tributável do titular
  const sgDate = new Date(date + "T12:00:00");
  const monthPJTotal = useMemo(
    () => getCurrentMonthPJTotal(store as any, sgDate.getFullYear(), sgDate.getMonth() + 1),
    [store, date],
  );
  const proLaboreTotal = computedProLaboreMonthly(store, sgDate);
  const isPJ = effectiveRegime === "PJ_SIMPLES" || effectiveRegime === "PJ_LUCRO_PRESUMIDO";
  const taxAlert = isPJ
    ? checkTaxOptimization(taxBase, monthPJTotal, proLaboreTotal)
    : { triggered: false, projectedPJTotal: 0, requiredProLabore: 0, proLaboreShortfall: 0 };

  function addMember() {
    setTeam((t) => [...t, { id: Math.random().toString(36).slice(2, 8), name: "", role: "Auxiliar", amountDue: 0, isPaid: false }]);
  }
  function updateMember(id: string, patch: Partial<TeamMember>) {
    setTeam((t) => t.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function removeMember(id: string) {
    setTeam((t) => t.filter((m) => m.id !== id));
  }

  function save() {
    if (myRole === "TITULAR") {
      if (!hospital) return;
      store.addSurgery({
        myRole: "TITULAR", date, procedure, notes,
        hospitalId, totalGross, invoiceMode, teamSplit: team,
        receivedFromHospital: false,
      } as Omit<SurgeryRecord, "id">);
    } else {
      store.addSurgery({
        myRole: "MEMBRO_EQUIPE", date, procedure, notes,
        payingSurgeonName, myExpectedShare, isReceived: false,
      } as Omit<SurgeryRecord, "id">);
    }
    nav({ to: "/caixa" });
  }

  return (
    <>
      <Section title="Meu papel na cirurgia" subtitle="A ramificação muda o ledger e o risco fiscal">
        <div className="glass-card rounded-2xl p-1.5 grid grid-cols-2 gap-1">
          <RoleBtn active={myRole === "TITULAR"} onClick={() => setMyRole("TITULAR")} icon={<Crown className="h-4 w-4" />} label="Sou Titular" sub="Recebo do hospital e repasso" />
          <RoleBtn active={myRole === "MEMBRO_EQUIPE"} onClick={() => setMyRole("MEMBRO_EQUIPE")} icon={<UserCheck className="h-4 w-4" />} label="Sou Membro" sub="Recebo de outro cirurgião" />
        </div>
      </Section>

      <Section title="Dados básicos">
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <Field label="Data">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Procedimento / Cirurgia">
            <input type="text" value={procedure} onChange={(e) => setProcedure(e.target.value)} placeholder="Ex: Apendicectomia Laparoscópica" className={inputCls} />
          </Field>
          {myRole === "TITULAR" ? (
            <>
              <Field label="Hospital Pagador">
                <select value={hospitalId} onChange={(e) => setHospitalId(e.target.value)} className={inputCls}>
                  {store.workplaces.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Valor Bruto Recebido (R$)">
                <input type="number" min={0} value={totalGross || ""} onChange={(e) => setTotalGross(+e.target.value)} className={inputCls} />
              </Field>
              <Field label="Modo de Emissão da Nota">
                <select value={invoiceMode} onChange={(e) => setInvoiceMode(e.target.value as InvoiceMode)} className={inputCls}>
                  <option value="FRACTIONED">Nota Fracionada (emito apenas minha parte)</option>
                  <option value="SINGLE">Nota Única (emito valor cheio e repasso)</option>
                </select>
              </Field>
              <Field label="Regime Tributário">
                <select value={effectiveRegime} onChange={(e) => setRegimeOverride(e.target.value as TaxRegime)} className={inputCls}>
                  {Object.entries(TAX_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
            </>
          ) : (
            <>
              <Field label="Cirurgião Titular (Pagador)">
                <input type="text" value={payingSurgeonName} onChange={(e) => setPayingSurgeonName(e.target.value)} placeholder="Nome do colega" className={inputCls} />
              </Field>
              <Field label="Meu Repasse (R$)">
                <input type="number" min={0} value={myExpectedShare || ""} onChange={(e) => setMyExpectedShare(+e.target.value)} className={inputCls} />
              </Field>
            </>
          )}
          <Field label="Observações">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls + " h-20 py-3"} />
          </Field>
        </div>
      </Section>

      {myRole === "TITULAR" && (
        <Section title="Repasses da Equipe" subtitle={`Total a repassar: ${brl2(teamTotal)}`}>
          <div className="space-y-3">
            {team.map((m) => (
              <div key={m.id} className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Membro da Equipe</p>
                  <button onClick={() => removeMember(m.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded-lg transition"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={m.name} onChange={(e) => updateMember(m.id, { name: e.target.value })} placeholder="Nome" className={inputCls} />
                  <input type="text" value={m.role} onChange={(e) => updateMember(m.id, { role: e.target.value })} placeholder="Papel (ex: Auxiliar)" className={inputCls} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input type="number" min={0} value={m.amountDue || ""} onChange={(e) => updateMember(m.id, { amountDue: +e.target.value })} placeholder="Valor R$" className={inputCls} />
                  </div>
                  <div className="flex items-center gap-2 px-3 h-12 rounded-xl bg-surface-elevated/40 border border-white/5">
                    <input type="checkbox" checked={m.isPaid} onChange={(e) => updateMember(m.id, { isPaid: e.target.checked })} className="rounded border-white/10 bg-zinc-900 text-primary focus:ring-primary" />
                    <span className="text-xs text-muted-foreground">Já pago</span>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addMember} className="w-full py-4 rounded-2xl border border-dashed border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 transition flex items-center justify-center gap-2 text-sm">
              <Plus className="h-4 w-4" /> Adicionar Membro
            </button>
          </div>
        </Section>
      )}

      <Section title="Resumo Financeiro">
        <div className="glass-card rounded-2xl p-5">
          {myRole === "TITULAR" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Minha Parte (Bruta)" value={brl2(myShareTitular)} />
                <Metric label="Imposto Est." value={brl2(taxEstimated)} accent="warning" />
              </div>
              {taxAlert.triggered && (
                <TaxRouterInsight
                  projectedTotal={taxAlert.projectedPJTotal}
                  onSwitchToPF={() => setRegimeOverride("PF")}
                />
              )}
              <div className="border-t border-border pt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Meu Líquido Final</p>
                  <p className={`font-display text-3xl mt-0.5 ${myNet >= 0 ? "text-gradient" : "text-destructive"}`}>{brl2(myNet)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Base de cálculo: {brl2(taxBase)} ({effectiveRegime})</p>
                </div>
                <button onClick={save} className="rounded-xl px-5 py-3 text-sm font-medium text-primary-foreground inline-flex items-center gap-2" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
                  <Save className="h-4 w-4" /> Salvar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">A receber de {payingSurgeonName || "colega"}</p>
                <p className="font-display text-3xl mt-0.5 text-gradient">{brl2(myExpectedShare)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Repasse via SCP (Isento de IR)</p>
              </div>
              <button onClick={save} className="rounded-xl px-5 py-3 text-sm font-medium text-primary-foreground inline-flex items-center gap-2" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
                <Save className="h-4 w-4" /> Salvar
              </button>
            </div>
          )}
        </div>
      </Section>
    </>
  );
}

/* ============ SHARED COMPONENTS ============ */
function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: "warning" }) {
  return (
    <div className="bg-surface-elevated/40 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className={`font-mono text-sm ${accent === "warning" ? "text-warning" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function TaxRouterInsight({ projectedTotal, onSwitchToPF }: { projectedTotal: number; onSwitchToPF: () => void }) {
  return (
    <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 flex gap-2">
      <ShieldAlert className="h-4 w-4 text-warning shrink-0 mt-0.5" />
      <div className="text-[11px] leading-snug">
        <p className="font-medium text-warning">Risco de Anexo V (15,5%)</p>
        <p className="text-muted-foreground">Seu faturamento PJ no mês atingirá {brl2(projectedTotal)}. Para manter 6%, seu pró-labore precisaria subir.</p>
        <button onClick={onSwitchToPF} className="mt-2 text-primary font-semibold hover:underline">Mudar este plantão para RPA (PF)</button>
      </div>
    </div>
  );
}

const inputCls = "w-full bg-surface-elevated/60 border border-white/5 rounded-xl h-12 px-4 text-sm focus:outline-none focus:border-primary/40 transition-colors";
