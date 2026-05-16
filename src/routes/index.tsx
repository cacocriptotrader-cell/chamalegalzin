import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  useStore, computeShift, monthlyFixedTotal, monthlyFixedIncomeNet,
  computedProLaboreMonthly, monthlyFixedIncomeGrossTotal, inssCeilingReached,
  daysUntil, INSS_CEILING, getCurrentMonthSCPTotal, getCurrentMonthTotalRevenue,
  getCurrentMonthRegimeTotal, estimateAnnualIRPF2026,
  brl, brl2, TAX_LABELS,
} from "@/lib/store";
import { Section } from "@/components/Section";
import { ExecutiveOverview } from "@/components/ExecutiveOverview";
import { SmartActionFeed } from "@/components/SmartActionFeed";
import { TreasuryPanel } from "@/components/TreasuryPanel";
import {
  ArrowRight, TrendingUp, Trophy, Clock, AlertTriangle, CheckCircle2,
  Rocket, ShieldAlert, Sparkles, Scale, FileText, Copy,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Docfin" },
      { name: "description", content: "Fluxo de caixa, rentabilidade por plantão e monitor de Fator R para médicos." },
    ],
  }),
  component: Dashboard,
});

const COMMUTE_HOURS_DEFAULT = 1.5; // h ida+volta padrão

function Dashboard() {
  const store = useStore();

  const data = useMemo(() => {
    const month = new Date().getMonth();
    const monthShifts = store.shifts.filter((s) => new Date(s.date).getMonth() === month);
    const all = store.shifts.map((s) => ({ shift: s, math: computeShift(store, s) }));
    const m = all.filter((x) => new Date(x.shift.date).getMonth() === month);

    const gross = m.reduce((a, x) => a + x.shift.gross, 0);
    const variable = m.reduce((a, x) => a + x.math.tax + x.math.logistics, 0);
    const shiftsProfit = gross - variable;
    const fixedIncomeNet = monthlyFixedIncomeNet(store);
    const fixed = monthlyFixedTotal(store);
    const subtotalCash = fixedIncomeNet + shiftsProfit;
    const net = subtotalCash - fixed;
    const totalTopline = fixedIncomeNet + gross;
    const margin = totalTopline > 0 ? (net / totalTopline) * 100 : 0;
    const cltShare = subtotalCash > 0 ? (fixedIncomeNet / subtotalCash) * 100 : 0;
    const shiftsShare = 100 - cltShare;

    // ===== Rentabilidade Operacional =====
    const totalWorkHours = m.reduce((a, x) => a + x.shift.hours, 0);
    const totalCommuteHours = m.reduce(
      (a, x) => a + (x.shift.commuteHours ?? COMMUTE_HOURS_DEFAULT),
      0,
    );
    const averageNetPerShift = m.length > 0 ? shiftsProfit / m.length : 0;
    const averageGrossPerShift = m.length > 0 ? gross / m.length : 0;

    // ===== Fator R =====
    const nowForFactorR = new Date();
    const pjRevenueMonth = getCurrentMonthRegimeTotal(store, nowForFactorR.getFullYear(), nowForFactorR.getMonth() + 1, ["PJ_SIMPLES"]);
    const proLaboreMonthly = computedProLaboreMonthly(store);
    const factorR = pjRevenueMonth > 0 ? (proLaboreMonthly / pjRevenueMonth) * 100 : 0;
    const hasPj = pjRevenueMonth > 0;

    // ===== Ranking =====
    const ranking = new Map<string, number>();
    all.forEach(({ shift, math }) => {
      ranking.set(shift.workplaceId, (ranking.get(shift.workplaceId) ?? 0) + math.net);
    });
    const ranked = [...ranking.entries()]
      .map(([id, n]) => ({ wp: store.workplaces.find((w) => w.id === id)!, net: n }))
      .filter((r) => r.wp)
      .sort((a, b) => b.net - a.net);

    return {
      gross, variable, shiftsProfit, fixedIncomeNet, subtotalCash, fixed, net, margin,
      cltShare, shiftsShare, ranked, count: monthShifts.length,
      averageNetPerShift, averageGrossPerShift, totalWorkHours, totalCommuteHours,
      pjRevenueMonth, proLaboreMonthly, factorR, hasPj,
    };
  }, [store]);

  const grossFixedIncome = monthlyFixedIncomeGrossTotal(store);
  const inssOk = inssCeilingReached(store);
  const criticalDocs = store.documents.filter((d) => daysUntil(d.expiresAt) <= 15);
  const warningDocs = store.documents.filter((d) => {
    const k = daysUntil(d.expiresAt);
    return k > 15 && k <= 60;
  });

  // ===== Otimização Fiscal — economia mensal estimada =====
  // INSS: 11% sobre plantões PJ (até o teto), evitável quando os fixos já estouraram o teto
  const monthsTracked = Math.max(1, new Set(store.shifts.map((s) => s.date.slice(0, 7))).size);
  const pjShiftGrossTotal = store.shifts.reduce((acc, sh) => {
    const wp = store.workplaces.find((w) => w.id === sh.workplaceId);
    if (wp && (wp.regime === "PJ_SIMPLES" || wp.regime === "PJ_LUCRO_PRESUMIDO")) return acc + sh.gross;
    return acc;
  }, 0);
  const inssSavingsMonthly = inssOk ? (pjShiftGrossTotal * 0.11) / monthsTracked : 0;
  // Fator R: diferença mensal entre Anexo V e Anexo III quando abaixo de 28%.
  const factorRSavingsMonthly = data.hasPj && data.factorR < 28 ? data.pjRevenueMonth * (0.155 - 0.06) : 0;
  // PGBL: economia projetada pela tabela progressiva IRPF 2026, limitada a 12% da renda bruta anual.
  const annualFixedIncome = grossFixedIncome * 12;
  const pgblAnnualCap = annualFixedIncome * 0.12;
  const pgblSavingsMonthly = annualFixedIncome > 0
    ? Math.max(0, estimateAnnualIRPF2026(annualFixedIncome) - estimateAnnualIRPF2026(annualFixedIncome, pgblAnnualCap)) / 12
    : 0;
  const totalFiscalSavings = inssSavingsMonthly + factorRSavingsMonthly + pgblSavingsMonthly;

  const hasShifts = data.count > 0;

  // ===== Alerta de concentração SCP =====
  const now = new Date();
  const monthSCP = getCurrentMonthSCPTotal(store, now.getFullYear(), now.getMonth() + 1);
  const monthTotalRevenue = getCurrentMonthTotalRevenue(store, now.getFullYear(), now.getMonth() + 1);
  const scpShare = monthTotalRevenue > 0 ? monthSCP / monthTotalRevenue : 0;
  const showScpAlert = scpShare > 0.8 && monthSCP > 0;

  return (
    <div className="animate-fade-in">
      <ExecutiveOverview />
      <SmartActionFeed />

      {showScpAlert && (
        <div className="mx-5 mt-3 rounded-xl border border-warning/40 bg-warning/10 p-3 flex gap-2 animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div className="text-[11px] leading-snug">
            <p className="font-medium text-warning">Atenção: Alta concentração de receita via SCP</p>
            <p className="text-foreground/85 mt-0.5">
              Apesar da isenção, este modelo possui riscos fiscais e trabalhistas se for sua única fonte de renda.
              <span className="text-muted-foreground"> ({(scpShare * 100).toFixed(0)}% da receita do mês)</span>
            </p>
          </div>
        </div>
      )}

      {/* ====== RENTABILIDADE OPERACIONAL — protagonismo ====== */}
      <Section title="Rentabilidade média por plantão" subtitle="Líquida de impostos, logística e custos variáveis">
        {hasShifts ? (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
              >
                <Clock className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Lucro médio por plantão</p>
                <p className={`font-display text-3xl ${data.averageNetPerShift >= 0 ? "text-gradient" : "text-destructive"}`}>
                  {brl2(data.averageNetPerShift)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-surface-elevated/40 rounded-lg p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Horas trab.</p>
                <p className="font-mono text-sm mt-0.5">{data.totalWorkHours}h</p>
              </div>
              <div className="bg-surface-elevated/40 rounded-lg p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Deslocamento</p>
                <p className="font-mono text-sm mt-0.5">{data.totalCommuteHours.toFixed(1)}h</p>
              </div>
              <div className="bg-surface-elevated/40 rounded-lg p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bruto médio</p>
                <p className="font-mono text-sm mt-0.5 text-muted-foreground">{brl2(data.averageGrossPerShift)}</p>
              </div>
            </div>
          </div>
        ) : (
          <EmptyMini text="Nenhum dado registrado neste ciclo. Adicione plantões para gerar insights." />
        )}
      </Section>

      {/* ====== RANKING — protagonismo ====== */}
      <Section
        title="Ranking de hospitais"
        subtitle="Lucro líquido acumulado"
        action={
          <Link to="/novo-plantao" className="text-xs text-primary flex items-center gap-1">
            Novo plantão <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        {data.ranked.length === 0 ? (
          <EmptyMini text="Nenhum dado registrado neste ciclo. Adicione plantões para gerar insights." />
        ) : (
          <div className="glass-card rounded-2xl p-2">
            {data.ranked.map((r, i) => {
              const max = data.ranked[0]?.net || 1;
              const pct = Math.max(4, (r.net / max) * 100);
              return (
                <div key={r.wp.id} className="p-3 rounded-xl hover:bg-surface-elevated/50 transition">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {i === 0 ? (
                        <Trophy className="h-4 w-4" style={{ color: "var(--gold)" }} />
                      ) : (
                        <span className="h-5 w-5 rounded-full bg-secondary text-[10px] flex items-center justify-center font-mono">
                          {i + 1}
                        </span>
                      )}
                      <div>
                        <p className="text-sm font-medium">{r.wp.name}</p>
                        <p className="text-[10px] text-muted-foreground">{TAX_LABELS[r.wp.regime]}</p>
                      </div>
                    </div>
                    <span className={`font-mono text-sm ${r.net >= 0 ? "text-success" : "text-destructive"}`}>
                      {brl2(r.net)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: i === 0 ? "var(--gradient-gold)" : "var(--gradient-primary)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ====== FLUXO DO MÊS ====== */}
      <Section title="Fluxo do Mês" subtitle="Receita → Custos → Lucro Líquido">
        <div className="glass-card rounded-2xl p-5 flex items-center justify-between gap-3 flex-wrap">
          <FlowBlock label="Receita Bruta" value={data.fixedIncomeNet + data.gross} tone="neutral" />
          <ArrowRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
          <FlowBlock label="Custos & Impostos" value={data.variable + data.fixed} tone="rose" />
          <ArrowRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
          <FlowBlock label="Lucro Líquido Real" value={data.net} tone="emerald" big />
        </div>
      </Section>

      <TreasuryPanel />

      {/* ============ CENTRAL DE DECISÕES ============ */}
      <Section title="Central de Decisões" subtitle="Ações de maior impacto no seu lucro líquido">
        {(() => {
          const hasAny =
            pgblSavingsMonthly > 0 || inssOk || (data.hasPj && data.factorR < 28) ||
            criticalDocs.length > 0 || store.debts.length > 0;
          if (!hasAny) {
            return <EmptyMini text="Nenhum dado registrado neste ciclo. Adicione plantões para gerar insights." />;
          }
          return (
        <div className="space-y-2.5">
          {pgblSavingsMonthly > 0 && (
            <DecisionCard
              tone="primary"
              icon={<Sparkles className="h-5 w-5" />}
              title={`Aporte ${brl((grossFixedIncome * 12 * 0.12) / 12)}/mês no PGBL`}
              body={
                <>economize <strong className="text-success">{brl(pgblSavingsMonthly)}</strong>/mês em IR (≈ {brl(pgblSavingsMonthly * 12)}/ano).</>
              }
              ctaText="Simular no Futuro"
              to="/futuro"
            />
          )}

          {inssOk && (
            <InssActionCard grossFixedIncome={grossFixedIncome} savings={inssSavingsMonthly} />
          )}

          {data.hasPj && data.factorR < 28 && (
            <DecisionCard
              tone="warning"
              icon={<Scale className="h-5 w-5" />}
              title={`Suba pró-labore para ${brl(data.pjRevenueMonth * 0.28)}/mês`}
              body={
                <>Fator R está em <strong>{data.factorR.toFixed(1)}%</strong> — voltando ao Anexo III economiza{" "}
                <strong className="text-success">{brl(factorRSavingsMonthly)}</strong>/mês de imposto.</>
              }
              ctaText="Ajustar pró-labore"
              to="/gestao"
            />
          )}

          {criticalDocs.length > 0 && (
            <DecisionCard
              tone="destructive"
              icon={<ShieldAlert className="h-5 w-5" />}
              title={`${criticalDocs.length} documento(s) críticos`}
              body={
                <>
                  {criticalDocs.slice(0, 2).map((d, i) => {
                    const k = daysUntil(d.expiresAt);
                    return (
                      <span key={d.id}>
                        {i > 0 && " · "}
                        <strong>{d.label}</strong> ({k < 0 ? `vencido há ${Math.abs(k)}d` : k === 0 ? "vence hoje" : `${k}d`})
                      </span>
                    );
                  })}
                </>
              }
              ctaText="Cofre de documentos"
              to="/gestao"
            />
          )}

          {store.debts.length > 0 && (
            <DecisionCard
              tone="muted"
              icon={<Scale className="h-5 w-5" />}
              title="Você tem dívidas em aberto"
              body={<>Compare amortizar vs investir o excedente — o app calcula qual caminho rende mais.</>}
              ctaText="Simular decisão"
              to="/futuro"
            />
          )}

          {totalFiscalSavings > 0 && (
            <p className="text-[11px] text-muted-foreground px-1 inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" strokeWidth={1.5} /> Otimização fiscal total estimada:{" "}
              <strong className="text-success font-mono">{brl(totalFiscalSavings)}/mês</strong>{" "}
              ({brl(totalFiscalSavings * 12)}/ano)
            </p>
          )}

          {warningDocs.length > 0 && (
            <p className="text-[11px] text-warning px-1 inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" strokeWidth={1.5} /> {warningDocs.length} documento(s) vencem nos próximos 60 dias.
            </p>
          )}
        </div>
          );
        })()}
      </Section>

      <Section title="Visão do mês" subtitle={`${data.count} plantão(ões) registrados`}>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Lucro Líquido Real Total</p>
          <p className={`font-display text-4xl mt-1 ${data.net >= 0 ? "text-gradient" : "text-destructive"}`}>
            {brl(data.net)}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span
              className={`px-2 py-0.5 rounded-full ${
                data.margin >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
              }`}
            >
              <TrendingUp className="inline h-3 w-3 mr-1" />
              {data.margin.toFixed(1)}% margem
            </span>
            <span className="text-muted-foreground">CLT + plantões</span>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
              <span>Segurança CLT</span>
              <span>Esforço Plantões</span>
            </div>
            <div className="h-2 rounded-full bg-secondary/50 overflow-hidden flex">
              <div className="h-full" style={{ width: `${data.cltShare}%`, background: "var(--gradient-primary)" }} />
              <div className="h-full" style={{ width: `${Math.max(0, data.shiftsShare)}%`, background: "var(--gradient-gold)" }} />
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1.5 font-mono">
              <span className="text-primary">{brl2(data.fixedIncomeNet)} ({data.cltShare.toFixed(0)}%)</span>
              <span className="text-warning">{brl2(Math.max(0, data.shiftsProfit))} ({Math.max(0, data.shiftsShare).toFixed(0)}%)</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ====== OTIMIZAÇÃO FISCAL UNIFICADA ====== */}
      {(data.hasPj || inssOk || grossFixedIncome > 0) && (
        <Section
          title="Otimização Fiscal"
          subtitle={
            totalFiscalSavings > 0
              ? `Economia mensal estimada: ${brl(totalFiscalSavings)} (${brl(totalFiscalSavings * 12)}/ano)`
              : "INSS, Fator R e PGBL no mesmo lugar"
          }
        >
          <div className="space-y-3">
            {data.hasPj && (
              <FactorRCard
                factorR={data.factorR}
                pjRevenue={data.pjRevenueMonth * 12}
                proLabore12m={data.proLaboreMonthly * 12}
                monthlySavings={factorRSavingsMonthly}
              />
            )}
            <InssMiniCard
              ok={inssOk}
              gross={grossFixedIncome}
              monthlySavings={inssSavingsMonthly}
            />
            {pgblSavingsMonthly > 0 && (
              <PgblMiniCard annual={grossFixedIncome * 12} monthlySavings={pgblSavingsMonthly} />
            )}
          </div>
        </Section>
      )}

    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface-elevated/20 min-h-[100px] flex items-center justify-center px-4">
      <p className="text-xs text-muted-foreground text-center">{text}</p>
    </div>
  );
}

function FlowBlock({
  label, value, tone, big,
}: { label: string; value: number; tone: "neutral" | "rose" | "emerald"; big?: boolean }) {
  const color =
    tone === "rose" ? "text-rose-400" :
    tone === "emerald" ? "text-emerald-500" :
    "text-white";
  return (
    <div className="flex-1 min-w-[140px]">
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className={`font-display ${big ? "text-3xl font-semibold" : "text-2xl"} tabular-nums tracking-tight mt-1 ${color}`}>
        {brl(value)}
      </p>
    </div>
  );
}

function FactorRCard({ factorR, pjRevenue, proLabore12m, monthlySavings = 0 }: { factorR: number; pjRevenue: number; proLabore12m: number; monthlySavings?: number }) {
  void monthlySavings;
  const ok = factorR >= 28;
  const pct = Math.min(100, factorR);
  const target = 28;
  const targetProLabore = (pjRevenue * 0.28) / 12;
  // Estimativa de tributação anexo III (~6%) vs anexo V (~15,5%) — diferença anual
  const taxDiff = pjRevenue * (0.155 - 0.06);

  return (
    <div
      className={`glass-card rounded-2xl p-5 border ${
        ok ? "border-success/40" : "border-warning/40"
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        {ok ? (
          <CheckCircle2 className="h-5 w-5 mt-0.5 text-success shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 mt-0.5 text-warning shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-display text-base">
            {ok ? "Fator R OK — Anexo III (≈ 6%)" : "Atenção: Fator R abaixo de 28%"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Pró-labore (12m): {brl(proLabore12m)} · Faturamento PJ (12m): {brl(pjRevenue)}
          </p>
        </div>
      </div>

      {/* Barra com marcador de 28% */}
      <div className="relative h-3 rounded-full bg-surface-elevated/60 overflow-hidden mb-1">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: ok ? "var(--gradient-gold)" : "var(--warning)",
          }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-foreground/60"
          style={{ left: `${target}%` }}
          aria-label="Limite 28%"
        />
      </div>
      <div className="flex justify-between text-[10px] font-mono mb-3">
        <span className={ok ? "text-success" : "text-warning"}>{factorR.toFixed(1)}%</span>
        <span className="text-muted-foreground">meta 28%</span>
      </div>

      {!ok && (
        <p className="text-[12px] leading-relaxed text-foreground/85 flex gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>Seu pró-labore está em <strong>{factorR.toFixed(1)}%</strong> do faturamento. Você pode estar tributando pelo Anexo V (~15,5%). Suba o pró-labore para <strong className="text-warning">{brl2(targetProLabore)}/mês</strong>{" "}para voltar ao Anexo III (~6%) e economizar até{" "}<strong className="text-success">{brl(taxDiff)}/ano</strong>.</span>
        </p>
      )}
      {ok && (
        <p className="text-[12px] leading-relaxed text-foreground/85 flex gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>Você se enquadra no Anexo III. Sua alíquota efetiva permanece próxima de 6% — economia anual estimada de{" "}<strong className="text-success">{brl(taxDiff)}</strong> contra o Anexo V.</span>
        </p>
      )}
    </div>
  );
}

// ============ DECISION CARDS ============
function DecisionCard({
  tone, icon, title, body, ctaText, to,
}: {
  tone: "primary" | "success" | "warning" | "destructive" | "muted";
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  ctaText: string;
  to: "/" | "/caixa" | "/futuro" | "/gestao" | "/novo-plantao";
}) {
  const palette = {
    primary: { border: "border-primary/40", bgVar: "linear-gradient(135deg, oklch(0.55 0.18 245 / 0.14), oklch(0.55 0.18 245 / 0.04))", iconBg: "var(--gradient-primary)", text: "text-primary" },
    success: { border: "border-success/40", bgVar: "linear-gradient(135deg, oklch(0.72 0.16 155 / 0.12), oklch(0.55 0.18 245 / 0.05))", iconBg: "var(--gradient-gold)", text: "text-success" },
    warning: { border: "border-warning/40", bgVar: "linear-gradient(135deg, oklch(0.82 0.13 85 / 0.14), transparent)", iconBg: "var(--gradient-gold)", text: "text-warning" },
    destructive: { border: "border-destructive/50", bgVar: "linear-gradient(135deg, oklch(0.62 0.22 25 / 0.14), transparent)", iconBg: "var(--destructive)", text: "text-destructive" },
    muted: { border: "border-border", bgVar: "var(--gradient-surface)", iconBg: "var(--gradient-primary)", text: "text-foreground" },
  }[tone];

  return (
    <div className={`rounded-2xl p-4 border ${palette.border}`} style={{ background: palette.bgVar }}>
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-primary-foreground"
          style={{ background: palette.iconBg, boxShadow: tone === "primary" ? "var(--shadow-glow)" : undefined }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`font-display text-sm sm:text-base ${palette.text}`}>{title}</p>
          <p className="text-[12px] text-foreground/85 mt-0.5 leading-relaxed">{body}</p>
          <Link to={to} className={`text-[11px] font-medium mt-2 inline-flex items-center gap-1 ${palette.text}`}>
            {ctaText} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function InssActionCard({ grossFixedIncome, savings }: { grossFixedIncome: number; savings: number }) {
  const [copied, setCopied] = useState(false);
  const notice = `Declaração para o setor de RH/Pagamento:

Conforme art. 28, §5º da Lei nº 8.212/91, declaro que minhas contribuições previdenciárias em outros vínculos JÁ atingiram o teto do salário-de-contribuição do INSS (${brl2(8157.41)}). Solicito, portanto, a NÃO RETENÇÃO de INSS sobre meus pagamentos a partir desta competência.

Base bruta total comprovada: ${brl2(grossFixedIncome)}/mês.`;

  function copy() {
    navigator.clipboard.writeText(notice).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="rounded-2xl p-4 border border-success/40"
      style={{ background: "linear-gradient(135deg, oklch(0.72 0.16 155 / 0.14), oklch(0.55 0.18 245 / 0.06))" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--gradient-gold)" }}
        >
          <Rocket className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm sm:text-base text-success">
            Teto do INSS atingido — pare retenções duplicadas
          </p>
          <p className="text-[12px] text-foreground/85 mt-0.5 leading-relaxed">
            Apresente este aviso aos seus contratantes para economizar ~
            <strong className="text-success">{brl(savings)}</strong>/mês de INSS retido sobre plantões.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={copy}
              className="text-[11px] font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-primary-foreground"
              style={{ background: "var(--gradient-gold)" }}
            >
              {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copiado" : "Gerar aviso"}
            </button>
            <Link to="/gestao" className="text-[11px] text-success inline-flex items-center gap-1">
              <FileText className="h-3 w-3" /> Ver no Gestão
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InssMiniCard({ ok, gross, monthlySavings }: { ok: boolean; gross: number; monthlySavings: number }) {
  const pct = Math.min(100, (gross / INSS_CEILING) * 100);
  return (
    <div className={`glass-card rounded-2xl p-4 border ${ok ? "border-success/40" : "border-border"}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-display">Teto INSS</p>
        <span className={`font-mono text-xs ${ok ? "text-success" : "text-muted-foreground"}`}>
          {pct.toFixed(0)}% · {brl2(gross)}/{brl2(INSS_CEILING)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-elevated/60 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: ok ? "var(--gradient-gold)" : "var(--gradient-primary)" }}
        />
      </div>
      {ok ? (
        <p className="text-[11px] text-success mt-2">
          Economia estimada: <strong className="font-mono">{brl(monthlySavings)}/mês</strong> de INSS sobre plantões.
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground mt-2">
          Faltam {brl2(Math.max(0, INSS_CEILING - gross))} para atingir o teto e cessar retenções nos plantões.
        </p>
      )}
    </div>
  );
}

function PgblMiniCard({ annual, monthlySavings }: { annual: number; monthlySavings: number }) {
  const cap = annual * 0.12;
  return (
    <div className="glass-card rounded-2xl p-4 border border-primary/30">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-display">PGBL — abatimento de IR</p>
        <span className="font-mono text-xs text-primary">{brl(cap)}/ano</span>
      </div>
      <p className="text-[11px] text-foreground/85 leading-relaxed">
        Aporte até <strong>{brl(cap / 12)}/mês</strong> (12% da renda tributável) e abata{" "}
        <strong className="text-success">{brl(monthlySavings)}/mês</strong> de IR no ajuste anual.
      </p>
    </div>
  );
}

