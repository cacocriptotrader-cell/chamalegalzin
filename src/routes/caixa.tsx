import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useStore, computeShift, calculateExpectedPaymentDate, didSkipCycle, monthKey, monthLabel, fmtDate,
  brl, brl2, PAYMENT_RULE_LABELS,
} from "@/lib/store";
import { Section } from "@/components/Section";
import { CalendarClock, ChevronRight, ChevronDown, ArrowDownCircle, ArrowUpCircle, UserCheck, Crown, AlertTriangle, Zap } from "lucide-react";
import { ShiftHandoffModal } from "@/components/ShiftHandoffModal";

export const Route = createFileRoute("/caixa")({
  head: () => ({
    meta: [
      { title: "Painel de Recebíveis — Docfin" },
      { name: "description", content: "Controle de recebíveis projetados: saiba exatamente quando cada plantão será pago." },
    ],
  }),
  component: CashFlow,
});

interface ProjectedItem {
  shiftId: string;
  workplaceName: string;
  shiftDate: string;
  paymentDate: Date;
  net: number;
  gross: number;
  ruleLabel: string;
  skipped: boolean;
  instant: boolean;
}

function CashFlow() {
  const store = useStore();
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [openShiftId, setOpenShiftId] = useState<string | null>(null);

  const { groups, total, totalCount } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const items: (ProjectedItem & { status: NonNullable<typeof store.shifts[number]["status"]> | "CONFIRMADO"; coveredBy?: string })[] = store.shifts.map((s) => {
      const wp = store.workplaces.find((w) => w.id === s.workplaceId);
      const math = computeShift(store, s);
      // Prioridade: expectedPaymentDate (motor de ciclo de corte) → fallback regra legada.
      const paymentDate = s.expectedPaymentDate
        ? new Date(s.expectedPaymentDate + "T12:00:00")
        : wp
        ? calculateExpectedPaymentDate(s.date, wp)
        : new Date(s.date);
      return {
        shiftId: s.id,
        workplaceName: wp?.name ?? "—",
        shiftDate: s.date,
        paymentDate,
        net: math.net,
        gross: s.gross,
        ruleLabel: wp ? PAYMENT_RULE_LABELS[wp.paymentRule] : "—",
        skipped: wp ? didSkipCycle(s.date, wp) : false,
        instant: wp?.paymentRule === "INSTANT_D0",
        status: s.status ?? "CONFIRMADO",
        coveredBy: s.coveredBy,
      };
    });

    const map = new Map<string, { label: string; date: Date; items: typeof items; total: number; pending: boolean }>();
    items.forEach((it) => {
      const k = monthKey(it.paymentDate);
      const ref = new Date(it.paymentDate.getFullYear(), it.paymentDate.getMonth(), 1);
      const cur = map.get(k) ?? { label: monthLabel(ref), date: ref, items: [], total: 0, pending: ref >= new Date(today.getFullYear(), today.getMonth(), 1) };
      cur.items.push(it);
      // REPASSADO não conta no líquido projetado do médico
      if (it.status !== "REPASSADO") cur.total += it.net;
      map.set(k, cur);
    });
    const groups = [...map.entries()]
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
      .map(([k, v]) => ({ key: k, ...v, items: v.items.sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime()) }));

    const pendingTotal = groups.filter((g) => g.pending).reduce((a, g) => a + g.total, 0);
    const pendingCount = groups
      .filter((g) => g.pending)
      .reduce((a, g) => a + g.items.filter((i) => i.status !== "REPASSADO").length, 0);
    return { groups, total: pendingTotal, totalCount: pendingCount };
  }, [store]);

  const max = Math.max(1, ...groups.map((g) => g.total));

  return (
    <>
      <Section title="Painel de Recebíveis" subtitle="Quando o dinheiro cai — projeção por hospital">
        <div className="glass-card rounded-2xl p-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">A receber (projetado)</p>
            <p className="font-display text-4xl mt-1 text-gradient">{brl(total)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{totalCount} plantão(ões) aguardando pagamento</p>
          </div>
        </div>
      </Section>

      <Section title="Contas a receber" subtitle="Linha do tempo · clique no mês para detalhar">
        <div className="space-y-2">
          {groups.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
              Nenhum recebimento projetado. Registre um plantão para começar.
            </div>
          )}
          {groups.map((g) => {
            const isOpen = openMonth === g.key;
            const pct = Math.max(6, (g.total / max) * 100);
            return (
              <div key={g.key} className="glass-card rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenMonth(isOpen ? null : g.key)}
                  className="w-full p-4 text-left hover:bg-surface-elevated/40 transition">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isOpen ? <ChevronDown className="h-4 w-4 text-primary shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize truncate">{g.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {g.items.length} plantão(ões) · {g.pending ? "previsto" : "recebido"}
                        </p>
                      </div>
                    </div>
                    <span className={`font-mono text-base ${g.pending ? "text-success" : "text-muted-foreground"}`}>
                      {brl(g.total)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: g.pending ? "var(--gradient-primary)" : "var(--gradient-gold)" }} />
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-border divide-y divide-border bg-surface-elevated/20">
                    {g.items.map((it) => {
                      const repassado = it.status === "REPASSADO";
                      const buscando = it.status === "BUSCANDO_SUBSTITUTO";
                      return (
                        <button
                          key={it.shiftId}
                          onClick={() => setOpenShiftId(it.shiftId)}
                          className="w-full text-left p-3 flex items-start justify-between gap-3 hover:bg-white/[0.02] transition"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium truncate">{it.workplaceName}</p>
                              {buscando && (
                                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30">
                                  Buscando substituto
                                </span>
                              )}
                              {repassado && (
                                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  Repassado{it.coveredBy ? ` → ${it.coveredBy}` : ""}
                                </span>
                              )}
                              {it.instant && (
                                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-success/15 text-success border border-success/30 inline-flex items-center gap-1">
                                  <Zap className="h-2.5 w-2.5" /> D+0
                                </span>
                              )}
                              {it.skipped && !it.instant && (
                                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30 inline-flex items-center gap-1">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Pulou 1 mês
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                              <CalendarClock className="h-3 w-3" />
                              Plantão {fmtDate(new Date(it.shiftDate + "T12:00:00"))} → recebe {fmtDate(it.paymentDate)}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{it.ruleLabel}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-mono text-sm ${repassado ? "text-muted-foreground line-through" : "text-success"}`}>
                              {brl2(it.net)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">bruto {brl2(it.gross)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <SurgeryLedgerPanels />
      {openShiftId && (
        <ShiftHandoffModal shiftId={openShiftId} onClose={() => setOpenShiftId(null)} />
      )}
    </>
  );
}

function SurgeryLedgerPanels() {
  const store = useStore();
  const toReceive = store.surgeries.filter(
    (s) => s.myRole === "MEMBRO_EQUIPE" && !s.isReceived
  ) as Extract<typeof store.surgeries[number], { myRole: "MEMBRO_EQUIPE" }>[];

  type Pending = { surgeryId: string; surgeryDate: string; hospitalName: string; member: { id: string; name: string; role: string; amountDue: number } };
  const pendingRepasses: Pending[] = [];
  store.surgeries.forEach((s) => {
    if (s.myRole !== "TITULAR") return;
    const wp = store.workplaces.find((w) => w.id === s.hospitalId);
    s.teamSplit.forEach((m) => {
      if (!m.isPaid) pendingRepasses.push({
        surgeryId: s.id, surgeryDate: s.date,
        hospitalName: wp?.name ?? "—",
        member: { id: m.id, name: m.name || "(sem nome)", role: m.role, amountDue: m.amountDue },
      });
    });
  });

  const totalToReceive = toReceive.reduce((a, s) => a + s.myExpectedShare, 0);
  const totalPending = pendingRepasses.reduce((a, p) => a + p.member.amountDue, 0);

  function markReceived(id: string) {
    store.updateSurgery(id, { isReceived: true } as any);
  }
  function markPaid(surgeryId: string, memberId: string) {
    const s = store.surgeries.find((x) => x.id === surgeryId);
    if (!s || s.myRole !== "TITULAR") return;
    const teamSplit = s.teamSplit.map((m) => (m.id === memberId ? { ...m, isPaid: true } : m));
    store.updateSurgery(surgeryId, { teamSplit } as any);
  }

  return (
    <>
      <Section title="A Receber de Colegas" subtitle="Cirurgias onde você foi membro da equipe">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
              <ArrowDownCircle className="h-3.5 w-3.5 text-success" /> Pendente de recebimento
            </p>
            <p className="font-mono text-success text-lg">{brl2(totalToReceive)}</p>
          </div>
          {toReceive.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nada a receber de colegas.</p>
          ) : (
            <div className="divide-y divide-border">
              {toReceive.map((s) => {
                const text = `Olá Dr(a). ${s.payingSurgeonName}, tudo bem? Confirmando o repasse de ${brl2(s.myExpectedShare)} referente à ${s.procedure || "cirurgia"} do dia ${fmtDate(new Date(s.date + "T12:00:00"))}. Obrigado!`;
                const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
                return (
                  <div key={s.id} className="group relative py-3 flex items-center justify-between gap-3 px-1 -mx-1 rounded-md transition-colors hover:bg-white/[0.02]">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate inline-flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5 text-primary" /> {s.payingSurgeonName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.procedure || "Cirurgia"} · {fmtDate(new Date(s.date + "T12:00:00"))}
                      </p>
                    </div>
                    <div className="relative shrink-0 h-8 min-w-[160px] flex items-center justify-end">
                      <p className="font-mono text-sm text-success tabular-nums absolute inset-0 flex items-center justify-end transition-opacity duration-200 group-hover:opacity-0 group-focus-within:opacity-0">
                        {brl2(s.myExpectedShare)}
                      </p>
                      <div className="absolute inset-0 flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 animate-fade-in">
                        <button onClick={() => markReceived(s.id)}
                          className="text-[10px] px-2 py-1 rounded-md bg-success/15 text-success hover:bg-success/25 transition">
                          Marcar pago
                        </button>
                        <a href={wa} target="_blank" rel="noreferrer"
                          className="text-[10px] px-2 py-1 rounded-md bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition">
                          Cobrar
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Section>

      <Section title="Repasses Pendentes" subtitle="Você (Titular) deve pagar à equipe quando o hospital liquidar">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
              <ArrowUpCircle className="h-3.5 w-3.5 text-warning" /> Total a repassar
            </p>
            <p className="font-mono text-warning text-lg">{brl2(totalPending)}</p>
          </div>
          {pendingRepasses.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum repasse pendente.</p>
          ) : (
            <div className="divide-y divide-border">
              {pendingRepasses.map((p) => {
                const text = `Olá ${p.member.name}, lembrete amigável: o repasse de ${brl2(p.member.amountDue)} (${p.member.role} · ${p.hospitalName} · ${fmtDate(new Date(p.surgeryDate + "T12:00:00"))}) será liberado assim que o hospital liquidar. Aviso aqui assim que cair. Abraço!`;
                const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
                return (
                  <div key={p.surgeryId + p.member.id}
                       className="group relative py-3 flex items-center justify-between gap-3 px-1 -mx-1 rounded-md transition-colors hover:bg-white/[0.02]">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate inline-flex items-center gap-1">
                        <Crown className="h-3.5 w-3.5 text-gold" /> {p.member.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.member.role} · {p.hospitalName} · {fmtDate(new Date(p.surgeryDate + "T12:00:00"))}
                      </p>
                    </div>
                    <div className="relative shrink-0 h-8 min-w-[180px] flex items-center justify-end">
                      <p className="font-mono text-sm text-warning tabular-nums absolute inset-0 flex items-center justify-end transition-opacity duration-200 group-hover:opacity-0 group-focus-within:opacity-0">
                        {brl2(p.member.amountDue)}
                      </p>
                      <div className="absolute inset-0 flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 animate-fade-in">
                        <button onClick={() => markPaid(p.surgeryId, p.member.id)}
                          className="text-[10px] px-2 py-1 rounded-md bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition font-medium">
                          Marcar como Pago
                        </button>
                        <a href={wa} target="_blank" rel="noreferrer"
                          className="text-[10px] px-2 py-1 rounded-md bg-white/10 text-white hover:bg-white/20 transition border border-white/10">
                          Cobrar
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
