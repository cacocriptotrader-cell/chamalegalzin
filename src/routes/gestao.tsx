import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useStore, brl2, brl, TAX_LABELS, monthlyFixedTotal, monthlyFixedIncomeNet, computedProLaboreMonthly, monthlyFixedIncomeGrossTotal, inssCeilingReached, daysUntil, DOCUMENT_KIND_LABELS, DOC_KIND_TO_FIXED_COST, INSS_CEILING, PAYMENT_RULE_LABELS, calculateCLTNetMonthly, calculateINSSProgressive, calculateIRRF2026, GOAL_CATEGORY_LABELS, type TaxRegime, type PaymentRule, type DocumentKind, type GoalCategory } from "@/lib/store";
import { Section } from "@/components/Section";
import { GoalCard } from "@/components/GoalCard";
import { Plus, Trash2, Building2, Wallet, Car, CalendarClock, Briefcase, Heart, TrendingDown, Receipt, Shield, ShieldAlert, ShieldCheck, Rocket, FileDown, CheckCircle2, MapPin, Search } from "lucide-react";

export const Route = createFileRoute("/gestao")({
  head: () => ({
    meta: [
      { title: "Gestão — Docfin" },
      { name: "description", content: "Gerencie hospitais, custos fixos e veículo do médico plantonista." },
    ],
  }),
  component: Manage,
});

function Manage() {
  const s = useStore();
  return (
    <>
      <div className="px-5 pt-2 flex items-center justify-end gap-2">
        <button
          onClick={s.resetOnboarding}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          Rever introdução inicial
        </button>
      </div>
      <InssMonitorCard />
      <DocumentsCard />
      <WorkplacesCard />
      <FixedIncomeCard />
      <ProLaboreAutoCard />
      <DebtsCard />
      <GoalsCard />
      <FixedCard />
      <VehicleCard />
    </>
  );

  function InssMonitorCard() {
    const totalGross = monthlyFixedIncomeGrossTotal(s);
    const ok = inssCeilingReached(s);
    const pct = Math.min(100, (totalGross / INSS_CEILING) * 100);
    return (
      <Section title="Monitor do Teto do INSS" subtitle="Soma das bases brutas dos vínculos CLT/Concurso">
        <div
          className={`rounded-2xl p-5 border ${ok ? "border-success/40" : "border-border"}`}
          style={ok ? { background: "linear-gradient(135deg, oklch(0.72 0.16 155 / 0.10), oklch(0.55 0.18 245 / 0.06))" } : { background: "var(--gradient-surface)" }}
        >
          <div className="flex items-start gap-3 mb-4">
            {ok ? (
              <Rocket className="h-5 w-5 mt-0.5 text-success shrink-0" />
            ) : (
              <Shield className="h-5 w-5 mt-0.5 text-primary shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display text-base">
                {ok ? "Teto atingido — pare retenções duplicadas" : "Abaixo do teto"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Bruto fixos: <span className="font-mono text-foreground/80">{brl2(totalGross)}</span> · Teto: <span className="font-mono">{brl2(INSS_CEILING)}</span>
              </p>
            </div>
          </div>
          <div className="relative h-3 rounded-full bg-surface-elevated/60 overflow-hidden mb-1">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: ok ? "var(--gradient-gold)" : "var(--gradient-primary)" }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono mb-3">
            <span className={ok ? "text-success" : "text-primary"}>{pct.toFixed(0)}% do teto</span>
            <span className="text-muted-foreground">teto INSS</span>
          </div>
          {ok ? (
            <p className="text-[12px] leading-relaxed text-foreground/85 flex gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>Seus vínculos fixos já contribuem com o INSS no teto. Apresente aos hospitais o comprovante de contribuição (declaração da fonte pagadora) para <strong>cessar a retenção</strong> de 11% sobre os plantões e turbinar seu líquido.</span>
            </p>
          ) : (
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Quando a soma dos seus salários brutos ultrapassar {brl2(INSS_CEILING)}, o sistema avisa que você pode pedir
              isenção de retenção de INSS nos plantões.
            </p>
          )}
        </div>
      </Section>
    );
  }

  function DocumentsCard() {
    const [kind, setKind] = useState<DocumentKind>("CRM");
    const [label, setLabel] = useState("");
    const [expiresAt, setExpiresAt] = useState("");
    const [renewalCost, setRenewalCost] = useState(0);

    function add() {
      if (!label.trim() || !expiresAt) return;
      s.addDocument({ kind, label, expiresAt, renewalCost: renewalCost || undefined });
      // Sugestão automática de Custo Fixo (CRM/Cert. Digital)
      const suggestion = DOC_KIND_TO_FIXED_COST[kind];
      if (suggestion) {
        const annual = renewalCost || suggestion.defaultAnnual;
        const monthly = +(annual / 12).toFixed(2);
        const exists = s.fixedCosts.some((c) => c.label.toLowerCase().includes(suggestion.label.toLowerCase()));
        if (!exists) s.addFixedCost({ label: `${suggestion.label} (rateio mensal)`, monthly });
      }
      setLabel(""); setExpiresAt(""); setRenewalCost(0);
    }

    return (
      <Section title="Documentos e Validades" subtitle="Cofre de compliance — alertas automáticos no Dashboard">
        <div className="glass-card rounded-2xl p-3 mb-3 divide-y divide-border">
          {s.documents.length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">Nenhum documento cadastrado.</p>
          )}
          {s.documents.map((d) => {
            const days = daysUntil(d.expiresAt);
            const critical = days <= 15;
            const warning = !critical && days <= 60;
            return (
              <div key={d.id} className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {critical ? (
                    <ShieldAlert className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                  ) : warning ? (
                    <Shield className="h-4 w-4 mt-0.5 text-warning shrink-0" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{d.label}</p>
                      {warning && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                          vence em {days}d
                        </span>
                      )}
                      {critical && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                          {days < 0 ? `vencido há ${Math.abs(days)}d` : days === 0 ? "vence hoje" : `crítico · ${days}d`}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {DOCUMENT_KIND_LABELS[d.kind]} · vence {new Date(d.expiresAt + "T12:00:00").toLocaleDateString("pt-BR")}
                      {d.renewalCost ? ` · ${brl2(d.renewalCost)}/ano` : ""}
                    </p>
                  </div>
                </div>
                <button onClick={() => s.removeDocument(d.id)} className="text-muted-foreground hover:text-destructive p-1.5">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="glass-card rounded-2xl p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Tipo">
              <select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)} className={inp}>
                {Object.entries(DOCUMENT_KIND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Vencimento">
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inp} />
            </Field>
          </div>
          <input placeholder="Nome (ex: CRM-SP 123456)" value={label} onChange={(e) => setLabel(e.target.value)} className={inp} />
          <Field label="Custo de renovação anual (opcional)">
            <input type="number" placeholder="R$/ano" value={renewalCost} onChange={(e) => setRenewalCost(+e.target.value)} className={inp} />
          </Field>
          <button
            onClick={add}
            className="w-full rounded-lg py-2.5 text-sm font-medium text-primary-foreground inline-flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Plus className="h-4 w-4" /> Adicionar ao Cofre
          </button>
          <p className="text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" strokeWidth={1.5} /> CRM e Certificado Digital geram automaticamente uma sugestão de custo fixo (rateio mensal) na lista de Custos Fixos.</span>
          </p>
        </div>
      </Section>
    );
  }

  function ProLaboreAutoCard() {
    const now = new Date();
    const computed = computedProLaboreMonthly(s, now);
    const pjBase = computed / 0.28;
    return (
      <Section
        title="Pró-Labore (automático)"
        subtitle="Calculado em tempo real — você não precisa digitar"
      >
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Pró-labore do mês (28% do faturamento PJ Simples)
            </p>
            <p className="font-mono text-lg text-success">{brl2(computed)}</p>
          </div>
          <div className="text-[11px] text-muted-foreground leading-snug">
            Base PJ Simples no mês: <span className="font-mono text-foreground">{brl2(pjBase)}</span>
            <br />
            Esse valor é usado automaticamente nos cálculos de Fator R e impostos. Para alterar,
            registre ou ajuste plantões/cirurgias com regime <strong>PJ (Simples Nacional)</strong>.
          </div>
        </div>
      </Section>
    );
  }

  function DebtsCard() {
    const [label, setLabel] = useState("");
    const [balance, setBalance] = useState(0);
    const [annualRate, setAnnualRate] = useState(14);
    const [monthlyPayment, setMonthlyPayment] = useState(0);
    return (
      <Section title="Dívidas" subtitle="Use no simulador Amortizar vs Investir">
        <div className="glass-card rounded-2xl p-3 mb-3 divide-y divide-border">
          {s.debts.length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">Nenhuma dívida cadastrada.</p>
          )}
          {s.debts.map((d) => (
            <div key={d.id} className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <TrendingDown className="h-4 w-4 mt-0.5 text-warning shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{d.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Saldo {brl2(d.balance)} · {d.annualRate}% a.a. · parcela {brl2(d.monthlyPayment)}
                  </p>
                </div>
              </div>
              <button onClick={() => s.removeDebt(d.id)} className="text-muted-foreground hover:text-destructive p-1.5">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="glass-card rounded-2xl p-4 space-y-2">
          <input placeholder="Descrição (ex: Financiamento carro)" value={label} onChange={(e) => setLabel(e.target.value)} className={inp} />
          <div className="grid grid-cols-3 gap-2">
            <Field label="Saldo (R$)"><input type="number" value={balance} onChange={(e) => setBalance(+e.target.value)} className={inp} /></Field>
            <Field label="Juros (% a.a.)"><input type="number" step="0.5" value={annualRate} onChange={(e) => setAnnualRate(+e.target.value)} className={inp} /></Field>
            <Field label="Parcela (R$)"><input type="number" value={monthlyPayment} onChange={(e) => setMonthlyPayment(+e.target.value)} className={inp} /></Field>
          </div>
          <button
            onClick={() => { if (label) { s.addDebt({ label, balance, annualRate, monthlyPayment }); setLabel(""); setBalance(0); setMonthlyPayment(0); } }}
            className="w-full rounded-lg py-2.5 text-sm font-medium text-primary-foreground inline-flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Plus className="h-4 w-4" /> Adicionar dívida
          </button>
        </div>
      </Section>
    );
  }

  function GoalsCard() {
    const [newGoalName, setNewGoalName] = useState("");
    const [newGoalTarget, setNewGoalTarget] = useState(0);
    const [newGoalDate, setNewGoalDate] = useState("");

    function addGoal() {
      if (!newGoalName.trim() || !newGoalDate || newGoalTarget <= 0) return;
      s.addGoal({
        name: newGoalName,
        category: "Outro",
        targetAmount: newGoalTarget,
        targetDate: newGoalDate,
        saved: 0,
      });
      setNewGoalName("");
      setNewGoalTarget(0);
      setNewGoalDate("");
    }

    return (
      <Section title="Metas Financeiras" subtitle={`${s.goals.length} meta${s.goals.length !== 1 ? "s" : ""} ativa${s.goals.length !== 1 ? "s" : ""}`}>
        {s.goals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {s.goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onUpdate={(patch) => s.updateGoal(goal.id, patch)}
                onDelete={() => s.removeGoal(goal.id)}
              />
            ))}
          </div>
        )}
        {s.goals.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhuma meta cadastrada. Crie uma para começar a acompanhar seus objetivos.</p>
        )}
        <div className="glass-card rounded-2xl p-4 space-y-3 bg-black/40 backdrop-blur border border-white/5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Adicionar nova meta</p>
          <input
            placeholder="Nome da meta (ex: Casamento, Viagem, Imóvel)"
            value={newGoalName}
            onChange={(e) => setNewGoalName(e.target.value)}
            className={inp}
          />
          <div className="grid grid-cols-1 gap-2">
            <input
              type="date"
              value={newGoalDate}
              onChange={(e) => setNewGoalDate(e.target.value)}
              className={inp}
            />
          </div>
          <input
            type="number"
            placeholder="Valor alvo (R$)"
            value={newGoalTarget || ""}
            onChange={(e) => setNewGoalTarget(+e.target.value)}
            className={inp}
          />
          <button
            onClick={addGoal}
            disabled={!newGoalName.trim() || !newGoalDate || newGoalTarget <= 0}
            className="w-full rounded-lg py-2.5 text-sm font-medium text-primary-foreground inline-flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Plus className="h-4 w-4" /> Criar Meta
          </button>
        </div>
      </Section>
    );
  }

  function FixedIncomeCard() {
    const [label, setLabel] = useState("");
    const [gross, setGross] = useState(0);
    const inss = calculateINSSProgressive(gross);
    const irrf = calculateIRRF2026(gross, inss);
    const estimatedNet = calculateCLTNetMonthly(gross);
    return (
      <Section title="Vínculos Fixos (CLT / Concurso)" subtitle={`Líquido mensal recorrente: ${brl2(monthlyFixedIncomeNet(s))}`}>
        <div className="glass-card rounded-2xl p-3 mb-3 divide-y divide-border">
          {s.fixedIncomes.length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">Nenhum vínculo CLT/concurso cadastrado.</p>
          )}
          {s.fixedIncomes.map((i) => (
            <div key={i.id} className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <Briefcase className="h-4 w-4 mt-0.5 text-primary shrink-0" strokeWidth={1.75} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{i.label}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-slate-400">
                    <span>Bruto: <span className="font-mono text-foreground/80">{brl2(i.grossMonthly)}</span></span>
                    <span>Líquido calculado: <span className="font-mono text-emerald-400">{brl2(calculateCLTNetMonthly(i.grossMonthly))}</span></span>
                  </div>
                </div>
              </div>
              <button onClick={() => s.removeFixedIncome(i.id)} className="text-slate-400 hover:text-destructive p-1.5">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="rounded-2xl p-4 space-y-3 bg-black/40 backdrop-blur border border-white/5">
          <input placeholder="Nome do vínculo (ex: HC, UPA Concurso)" value={label} onChange={(e) => setLabel(e.target.value)} className={inp} />
          <Field label="Salário Bruto Mensal">
            <input type="number" placeholder="R$" value={gross || ""} onChange={(e) => setGross(+e.target.value)} className={inp} />
          </Field>
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2.5">
            <span className="text-[11px] uppercase tracking-wider text-slate-400">INSS: <strong className="font-mono text-foreground/80">{brl2(inss)}</strong></span>
            <span className="text-[11px] uppercase tracking-wider text-slate-400">IRRF: <strong className="font-mono text-foreground/80">{brl2(irrf)}</strong></span>
            <span className="text-[11px] uppercase tracking-wider text-slate-400">Líquido: <strong className="font-mono text-emerald-400">{brl2(estimatedNet)}</strong></span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Líquido calculado automaticamente pela tabela progressiva de INSS e IRPF 2026. O valor líquido não é digitável.
          </p>
          <button
            onClick={() => { if (label.trim() && gross > 0) { s.addFixedIncome({ label, grossMonthly: gross, netMonthly: estimatedNet }); setLabel(""); setGross(0); } }}
            className="w-full rounded-lg py-2.5 text-sm font-medium text-primary-foreground inline-flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-primary)" }}>
            <Plus className="h-4 w-4" /> Adicionar vínculo
          </button>
        </div>
      </Section>
    );
  }

    function WorkplacesCard() {
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);

    const [regime, setRegime] = useState<TaxRegime>("PJ_SIMPLES");
    const [cutOffDay, setCutOffDay] = useState(20);
    const [paymentTermDays, setPaymentTermDays] = useState(15);
    const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string; class?: string; type?: string }>>([]);
    const [searching, setSearching] = useState(false);
    const [openSug, setOpenSug] = useState(false);
    const [apiError, setApiError] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortController = useRef<AbortController | null>(null);

    useEffect(() => {
      return () => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (abortController.current) abortController.current.abort();
      };
    }, []);

    function searchPlaces(q: string) {
      setName(q);
      setOpenSug(true);
      setApiError(false);

      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (abortController.current) abortController.current.abort();

      if (q.trim().length < 3) {
        setSuggestions([]);
        return;
      }

      setSearching(true);
      abortController.current = new AbortController();

      searchTimeout.current = setTimeout(async () => {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&limit=15&countrycodes=br&q=${encodeURIComponent(q)}`;
          const r = await fetch(url, {
            signal: abortController.current?.signal,
            headers: { "Accept-Language": "pt-BR", "User-Agent": "Docfin/1.0" }
          });

          if (!r.ok) throw new Error("API request failed");

          const data: Array<any> = await r.json();
          const ALLOWED_TYPES = new Set(["hospital", "clinic", "doctors", "nursing_home"]);
          const filtered = data.filter((d) => {
            const cls = String(d.class || "").toLowerCase();
            const typ = String(d.type || "").toLowerCase();
            return cls === "healthcare" || (cls === "amenity" && ALLOWED_TYPES.has(typ)) || (cls === "building" && typ === "hospital");
          }).slice(0, 6);

          setSuggestions(filtered);
        } catch (err: any) {
          if (err.name !== "AbortError") {
            console.error("Address search error:", err);
            setApiError(true);
            setSuggestions([]);
          }
        } finally {
          setSearching(false);
        }
      }, 500);
    }

    function pickSuggestion(item: { display_name: string; lat: string; lon: string }) {
      // Primeira parte (antes da primeira vírgula) costuma ser o nome do POI
      const head = item.display_name.split(",")[0]?.trim() || name;
      setName(head);
      setAddress(item.display_name);
      setLat(parseFloat(item.lat));
      setLng(parseFloat(item.lon));
      setOpenSug(false);
      setSuggestions([]);
    }

    function add() {
      if (!name.trim()) return;
      if (!Number.isFinite(cutOffDay) || cutOffDay < 1 || cutOffDay > 31) return;
      if (!Number.isFinite(paymentTermDays) || paymentTermDays < 1) return;
      // Se o usuário digitou e não escolheu sugestão, usa um fallback (centro de SP) — mantém compatibilidade.
      const finalLat = lat ?? -23.55 + (Math.random() - 0.5) * 0.05;
      const finalLng = lng ?? -46.65 + (Math.random() - 0.5) * 0.05;
      s.addWorkplace({ name, address, lat: finalLat, lng: finalLng, regime, hourlyRate: 0, paymentRule: "", cutOffDay, paymentDay: 0, paymentTermDays });
      setName(""); setAddress(""); setLat(null); setLng(null); setSuggestions([]);
    }
    return (
      <Section title="Hospitais (Workplaces)" subtitle="Endereço · imposto · regra de pagamento">
        <div className="glass-card rounded-2xl p-3 mb-3 divide-y divide-border">
          {s.workplaces.map((w) => (
            <div key={w.id} className="p-3 flex items-start justify-between gap-3">
              <div className="flex gap-3 items-start min-w-0 flex-1">
                <Building2 className="h-4 w-4 mt-1 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{w.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{w.address}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary">{TAX_LABELS[w.regime]}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/20 text-slate-400 inline-flex items-center gap-1">
                      <CalendarClock className="h-2.5 w-2.5" /> Corte: Dia {w.cutOffDay} | Recebimento: +{w.paymentTermDays} dias
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <label className="block">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Corte (dia)</span>
                      <input type="number" min={1} max={31} value={w.cutOffDay}
                        onChange={(e) => s.updateWorkplace(w.id, { cutOffDay: Math.max(1, Math.min(31, +e.target.value || 20)) })}
                        className={inp + " text-[11px] tabular-nums"} />
                    </label>
                    <label className="block">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Prazo (dias)</span>
                      <input type="number" min={1} max={180} value={w.paymentTermDays}
                        onChange={(e) => s.updateWorkplace(w.id, { paymentTermDays: Math.max(1, Math.min(180, +e.target.value || 15)) })}
                        className={inp + " text-[11px] tabular-nums"} />
                    </label>
                  </div>
                </div>
              </div>
              <button onClick={() => s.removeWorkplace(w.id)} className="text-muted-foreground hover:text-destructive p-1.5">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <div className="relative">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Nome do hospital (digite para buscar endereço)
              </span>
              <input
                placeholder="Ex: Hospital Sírio-Libanês São Paulo"
                value={name}
                onChange={(e) => searchPlaces(e.target.value)}
                onFocus={() => setOpenSug(true)}
                className={inp}
                autoComplete="off"
              />
            </label>
            {openSug && (suggestions.length > 0 || searching) && (
              <div className="absolute z-20 left-0 right-0 mt-1 glass-card rounded-xl border border-border max-h-64 overflow-auto shadow-lg">
                {searching && <p className="p-3 text-[11px] text-muted-foreground">Buscando…</p>}
                {!searching && suggestions.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pickSuggestion(sug)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-surface-elevated/60 border-b border-border last:border-0"
                  >
                    <p className="font-medium truncate">{sug.display_name.split(",")[0]}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{sug.display_name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Field label={apiError ? "Endereço (digitação manual - API indisponível)" : "Endereço (preenchido automaticamente)"}>
            <input
              placeholder={apiError ? "Digite o endereço completo" : "Selecione uma sugestão acima"}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inp}
            />
          </Field>
          {lat !== null && lng !== null && (
            <p className="text-[10px] text-success font-mono inline-flex items-center gap-1.5">
              <MapPin className="h-3 w-3" strokeWidth={1.5} /> Localização capturada: {lat.toFixed(4)}, {lng.toFixed(4)} — distância e gasolina serão calculadas automaticamente.
            </p>
          )}
          <Field label="Regime tributário">
            <select value={regime} onChange={(e) => setRegime(e.target.value as TaxRegime)} className={inp}>
              {Object.entries(TAX_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dia de Fechamento/Corte *">
              <input type="number" min={1} max={31} required value={cutOffDay}
                onChange={(e) => setCutOffDay(Math.max(1, Math.min(31, +e.target.value || 20)))}
                className={inp} />
            </Field>
            <Field label="Prazo para Pagamento (dias) *">
              <input type="number" min={1} max={180} required value={paymentTermDays}
                onChange={(e) => setPaymentTermDays(Math.max(1, Math.min(180, +e.target.value || 15)))}
                className={inp} placeholder="Ex: 15" />
            </Field>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Plantões realizados até o dia <strong>{cutOffDay}</strong> serão pagos aproximadamente <strong>{paymentTermDays}</strong> dias após o fechamento.
          </p>
          <button onClick={add} className="w-full rounded-lg py-2.5 text-sm font-medium text-primary-foreground inline-flex items-center justify-center gap-2"
                  style={{ background: "var(--gradient-primary)" }}>
            <Plus className="h-4 w-4" /> Adicionar hospital
          </button>
          <p className="text-[10px] text-muted-foreground">
            <span className="inline-flex items-start gap-1.5"><Search className="h-3 w-3 mt-0.5 shrink-0" strokeWidth={1.5} /> Busca restrita a estabelecimentos de saúde (hospital, clínica, ambulatório) via OpenStreetMap. Selecione a opção correta para capturar coordenadas reais.</span>
          </p>
        </div>
      </Section>
    );
  }

  function FixedCard() {
    const [label, setLabel] = useState("");
    const [monthly, setMonthly] = useState(0);
    const [importing, setImporting] = useState(false);

    async function handleImport() {
      setImporting(true);
      await new Promise((r) => setTimeout(r, 2000));
      s.addFixedCost({ label: "CRM", monthly: 800 });
      s.addFixedCost({ label: "Contabilidade", monthly: 400 });
      s.addFixedCost({ label: "Seguro", monthly: 350 });
      setImporting(false);
    }

    return (
      <Section
        title="Custos fixos mensais"
        subtitle={`Total: ${brl2(monthlyFixedTotal(s))}/mês`}
        action={
          <button
            onClick={handleImport}
            disabled={importing}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition disabled:opacity-50"
          >
            {importing ? (
              <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            Importar Fatura (Beta)
          </button>
        }
      >
        <div className="glass-card rounded-2xl p-3 mb-3 divide-y divide-border">
          {s.fixedCosts.map((c) => (
            <div key={c.id} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-sm">{c.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{brl2(c.monthly)}</span>
                <button onClick={() => s.removeFixedCost(c.id)} className="text-muted-foreground hover:text-destructive p-1.5">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="glass-card rounded-2xl p-4 grid grid-cols-[1fr_120px_auto] gap-2">
          <input placeholder="Descrição" value={label} onChange={(e) => setLabel(e.target.value)} className={inp} />
          <input type="number" placeholder="R$/mês" value={monthly} onChange={(e) => setMonthly(+e.target.value)} className={inp} />
          <button onClick={() => { if (label) { s.addFixedCost({ label, monthly }); setLabel(""); setMonthly(0); } }}
                  className="rounded-lg px-3 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </Section>
    );
  }

  function VehicleCard() {
    const hasVehicle = s.vehicle.model.trim() !== "";

    return (
      <Section title="Veículo" subtitle="Consumo, depreciação e manutenção — base para logística real">
        {!hasVehicle ? (
          <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center border-dashed border-white/10">
            <Car className="h-8 w-8 text-muted-foreground/40 mb-4" />
            <button
              onClick={() => s.setVehicle({ ...s.vehicle, model: "Novo Veículo" })}
              className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-6 py-3 text-sm font-semibold hover:bg-zinc-200 transition"
            >
              <Plus className="h-4 w-4" /> Adicionar Veículo
            </button>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <Car className="h-5 w-5 text-primary shrink-0" />
                <p className="font-display truncate">{s.vehicle.model}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!confirm("Remover o veículo atual e cadastrar um novo?")) return;
                  s.setVehicle({ model: "", kmPerLiter: 10, fuelPrice: 5.89, depreciationPerKm: 0, maintenancePerKm: 0 });
                }}
                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-destructive border border-border rounded-lg px-2.5 py-1.5"
                aria-label="Trocar veículo"
              >
                <Trash2 className="h-3 w-3" /> Trocar veículo
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Modelo">
                <input value={s.vehicle.model} onChange={(e) => s.setVehicle({ ...s.vehicle, model: e.target.value })} className={inp} />
              </Field>
              <Field label="Consumo (km/L)">
                <input type="number" step="0.5" value={s.vehicle.kmPerLiter}
                  onChange={(e) => s.setVehicle({ ...s.vehicle, kmPerLiter: +e.target.value })} className={inp} />
              </Field>
              <Field label="Combustível R$/L">
                <input type="number" step="0.01" value={s.vehicle.fuelPrice}
                  onChange={(e) => s.setVehicle({ ...s.vehicle, fuelPrice: +e.target.value })} className={inp} />
              </Field>
              <Field label="Depreciação R$/km">
                <input type="number" step="0.01" value={s.vehicle.depreciationPerKm}
                  onChange={(e) => s.setVehicle({ ...s.vehicle, depreciationPerKm: +e.target.value })} className={inp} />
              </Field>
              <Field label="Manutenção R$/km">
                <input type="number" step="0.01" value={s.vehicle.maintenancePerKm}
                  onChange={(e) => s.setVehicle({ ...s.vehicle, maintenancePerKm: +e.target.value })} className={inp} />
              </Field>
              <Field label="Custo desgaste R$/km">
                <input disabled value={(s.vehicle.depreciationPerKm + s.vehicle.maintenancePerKm).toFixed(2)} className={inp + " opacity-70"} />
              </Field>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Logística = combustível + depreciação + manutenção, calculada automaticamente em cada plantão.
            </p>
          </div>
        )}
      </Section>
    );
  }


}

const inp = "w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">{label}</span>
      {children}
    </label>
  );
}
