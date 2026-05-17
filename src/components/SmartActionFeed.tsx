import { useMemo } from "react";
import {
  useStore, computedProLaboreMonthly, daysUntil, brl, DOCUMENT_KIND_LABELS,
  fmtDate, getCurrentMonthRegimeTotal, checkTaxOptimization,
  computeShift, monthlyFixedIncomeGross, calculatePGBLAdvantage,
  SIMPLIFIED_DEDUCTION_CAP, calculateExpectedPaymentDate,
} from "@/lib/store";
import { MessageCircle, Scale, ShieldCheck, AlertTriangle, TrendingUp, CalendarClock } from "lucide-react";

type Urgency = "warning" | "danger";

interface ActionItem {
  id: string;
  urgency: Urgency;
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  cta: { label: string; onClick: () => void; tone: "emerald" | "amber" | "white" };
}

interface InsightItem {
  id: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: React.ReactNode;
  body: React.ReactNode;
}

// Limite de eficiência da Declaração Simplificada:
// 20% sobre a base = SIMPLIFIED_DEDUCTION_CAP  →  base anual ≈ 83.771,70.
const SIMPLIFIED_EFFICIENCY_LIMIT = SIMPLIFIED_DEDUCTION_CAP / 0.2;

const WEEK_LABELS = ["1ª semana", "2ª semana", "3ª semana", "4ª semana", "5ª semana"];
const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function SmartActionFeed() {
  const store = useStore();

  // ====== INSIGHTS (Wealth Advisor) ======
  const insights = useMemo<InsightItem[]>(() => {
    const out: InsightItem[] = [];
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    // ---- Rendimento mensal projetado (bruto) ----
    const monthShifts = store.shifts.filter((sh) => {
      const d = new Date(sh.date + "T12:00:00");
      return d.getFullYear() === y && d.getMonth() === m;
    });
    const monthShiftsGross = monthShifts.reduce((acc, sh) => acc + sh.gross, 0);
    const monthlyGross = monthlyFixedIncomeGross(store) + monthShiftsGross;
    const projectedAnnual = monthlyGross * 12;

    // ---- 1. Alerta de Teto: Simplificada vs PGBL ----
    const pgbl = calculatePGBLAdvantage(store);
    if (projectedAnnual > SIMPLIFIED_EFFICIENCY_LIMIT && pgbl.taxSavings > 0) {
      out.push({
        id: "ceiling-pgbl",
        icon: <TrendingUp className="h-3.5 w-3.5" />,
        eyebrow: "Eficiência Tributária",
        title: (
          <>
            Renda projetada de <span className="text-white tabular-nums">{brl(projectedAnnual)}/ano</span>{" "}
            ultrapassa o teto da Simplificada
          </>
        ),
        body: (
          <>
            Migrar para a <span className="text-white">Declaração Completa</span> com aporte ideal em PGBL
            de <span className="text-white tabular-nums">{brl(pgbl.idealLimit)}/ano</span> gera economia
            adicional de <span className="text-emerald-400 tabular-nums">{brl(pgbl.taxSavings)}</span> em IR.
          </>
        ),
      });
    }

    // ---- 2. Previsibilidade de Caixa: próximo pico de recebimento ----
    type Bucket = { weekIdx: number; monthIdx: number; year: number; total: number; firstDate: Date };
    const buckets = new Map<string, Bucket>();
    store.shifts.forEach((sh) => {
      const wp = store.workplaces.find((w) => w.id === sh.workplaceId);
      const pay = sh.expectedPaymentDate
        ? new Date(sh.expectedPaymentDate + "T12:00:00")
        : wp ? calculateExpectedPaymentDate(sh.date, wp) : null;
      if (!pay) return;
      if (pay.getTime() < now.getTime()) return;

      const math = computeShift(store, sh);
      const net = sh.gross - math.tax;
      const weekIdx = Math.min(4, Math.floor((pay.getDate() - 1) / 7));
      const key = `${pay.getFullYear()}-${pay.getMonth()}-${weekIdx}`;
      const b = buckets.get(key);
      if (b) {
        b.total += net;
        if (pay < b.firstDate) b.firstDate = pay;
      } else {
        buckets.set(key, {
          weekIdx, monthIdx: pay.getMonth(), year: pay.getFullYear(), total: net, firstDate: pay,
        });
      }
    });

    if (buckets.size > 0) {
      const peak = [...buckets.values()].sort((a, b) => b.total - a.total)[0];
      if (peak.total > 0) {
        out.push({
          id: "cash-forecast",
          icon: <CalendarClock className="h-3.5 w-3.5" />,
          eyebrow: "Previsibilidade de Caixa",
          title: (
            <>
              <span className="text-white tabular-nums">{brl(peak.total)}</span> agendados para{" "}
              {WEEK_LABELS[peak.weekIdx]} de {MONTH_NAMES[peak.monthIdx]}
              {peak.year !== now.getFullYear() ? ` de ${peak.year}` : ""}
            </>
          ),
          body: (
            <>
              Próximo pico de recebimento líquido com base no ciclo de corte dos hospitais —
              primeiro crédito em <span className="text-white">{fmtDate(peak.firstDate)}</span>.
            </>
          ),
        });
      }
    }

    return out;
  }, [store]);

  const actions = useMemo<ActionItem[]>(() => {
    const out: ActionItem[] = [];

    // ====== Tipo A · Cobranças (cirurgias onde sou MEMBRO e ainda não recebi) ======
    store.surgeries.forEach((s) => {
      if (s.myRole !== "MEMBRO_EQUIPE" || s.isReceived) return;
      const dia = fmtDate(new Date(s.date + "T12:00:00"));
      const valor = brl(s.myExpectedShare);
      const text = `Olá Dr(a). ${s.payingSurgeonName}, tudo bem? Passando para confirmar o repasse de ${valor} referente à ${s.procedure || "cirurgia"} do dia ${dia}. Obrigado!`;
      const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
      out.push({
        id: `cob-${s.id}`,
        urgency: "warning",
        icon: <MessageCircle className="h-4 w-4" />,
        title: `${s.payingSurgeonName} ainda não repassou ${valor}`,
        body: <>Referente à {s.procedure || "cirurgia"} de <span className="text-white">{dia}</span>.</>,
        cta: {
          label: "Cobrar via WhatsApp",
          tone: "emerald",
          onClick: () => {
            if (typeof window !== "undefined") window.open(wa, "_blank");
          },
        },
      });
    });

    // ====== Tipo B · Alerta Fiscal (Fator R baixo) ======
    const now = new Date();
    const pjRevenueMonth = getCurrentMonthRegimeTotal(store, now.getFullYear(), now.getMonth() + 1, ["PJ_SIMPLES"]);
    const proLaboreMonthly = computedProLaboreMonthly(store);
    const factorR = pjRevenueMonth > 0 ? (proLaboreMonthly / pjRevenueMonth) * 100 : 0;
    const optimization = checkTaxOptimization(pjRevenueMonth, 0, proLaboreMonthly);

    if (pjRevenueMonth > 0 && optimization.triggered) {
      const delta = optimization.proLaboreShortfall;
      out.push({
        id: "fator-r",
        urgency: "warning",
        icon: <Scale className="h-4 w-4" />,
        title: `Pró-labore precisa subir ${brl(delta)} para manter o Fator R`,
        body: <>Faturamento PJ Simples · Fator R em <span className="text-white tabular-nums">{factorR.toFixed(1)}%</span> (alvo 28%).</>,
        cta: {
          label: "Ajustar",
          tone: "amber",
          onClick: () => {
            if (typeof window !== "undefined") window.location.assign("/gestao");
          },
        },
      });
    }

    // ====== Tipo C · Compliance (documentos vencendo em ≤30 dias) ======
    store.documents.forEach((d) => {
      const k = daysUntil(d.expiresAt);
      if (k > 30) return;
      const urgency: Urgency = k <= 7 ? "danger" : "warning";
      out.push({
        id: `doc-${d.id}`,
        urgency,
        icon: <ShieldCheck className="h-4 w-4" />,
        title: `Seu ${DOCUMENT_KIND_LABELS[d.kind]} vence em ${Math.max(0, k)} dia${k === 1 ? "" : "s"}`,
        body: <>{d.label} · expira em <span className="text-white">{fmtDate(new Date(d.expiresAt + "T12:00:00"))}</span>.</>,
        cta: {
          label: "Renovado",
          tone: "white",
          onClick: () => {
            const next = new Date(d.expiresAt + "T12:00:00");
            next.setFullYear(next.getFullYear() + 1);
            const iso = next.toISOString().slice(0, 10);
            store.removeDocument(d.id);
            store.addDocument({
              kind: d.kind,
              label: d.label,
              expiresAt: iso,
              renewalCost: d.renewalCost,
            });
          },
        },
      });
    });

    return out;
  }, [store]);

  if (actions.length === 0 && insights.length === 0) return null;

  return (
    <section className="mt-2 mb-6 animate-fade-in space-y-5">
      {insights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-1 mb-3">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
              Insights do Conselheiro
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {insights.map((i) => (
              <div
                key={i.id}
                className="rounded-xl bg-slate-900/80 border border-white/[0.06] px-4 py-3.5 hover:border-white/15 transition-colors"
              >
                <div className="flex items-center gap-2 text-muted-foreground/80 mb-1.5">
                  {i.icon}
                  <p className="text-[10px] uppercase tracking-[0.16em] font-medium">{i.eyebrow}</p>
                </div>
                <p className="text-sm text-white/95 leading-snug">{i.title}</p>
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{i.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-1 mb-3">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
              Ações Requeridas
            </h2>
            <span className="text-[10px] tabular-nums text-muted-foreground/70">
              · {actions.length} pendência{actions.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="space-y-2">
            {actions.map((a) => {
              const edgeColor =
                a.urgency === "danger" ? "before:bg-rose-500" : "before:bg-amber-400";
              const ctaClass =
                a.cta.tone === "emerald"
                  ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                  : a.cta.tone === "amber"
                  ? "bg-amber-400 hover:bg-amber-300 text-zinc-950"
                  : "bg-white hover:bg-zinc-100 text-zinc-950";

              return (
                <div
                  key={a.id}
                  className={`group relative rounded-xl bg-[#18181B] border border-white/5 pl-4 pr-3 py-3 flex items-start gap-3 transition-all hover:border-white/15
                              before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full ${edgeColor}
                              before:shadow-[0_0_10px_currentColor]`}
                >
                  <div className="mt-0.5 text-white/60 shrink-0">{a.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/95 leading-snug">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {a.body}
                    </p>
                  </div>
                  <button
                    onClick={a.cta.onClick}
                    className={`shrink-0 self-center text-[11px] font-medium px-3 py-1.5 rounded-md transition-all ${ctaClass} tabular-nums`}
                  >
                    {a.cta.label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
