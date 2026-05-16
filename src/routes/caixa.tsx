import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useStore, computeShift, computePaymentDate, calculateExpectedPaymentDate, didSkipCycle, monthKey, monthLabel, fmtDate,
  brl, brl2, PAYMENT_RULE_LABELS, TAX_LABELS,
} from "@/lib/store";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Section } from "@/components/Section";
import { FileDown, CalendarClock, ChevronRight, ChevronDown, CheckCircle2, FileText, FileSpreadsheet, ArrowDownCircle, ArrowUpCircle, UserCheck, Crown, AlertTriangle, Zap, Download, Calendar as CalendarIcon, Building2 } from "lucide-react";
import { ShiftHandoffModal } from "@/components/ShiftHandoffModal";

export const Route = createFileRoute("/caixa")({
  head: () => ({
    meta: [
      { title: "Relatórios & Caixa — Docfin" },
      { name: "description", content: "Fluxo de caixa projetado: saiba exatamente quando cada plantão será pago." },
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
  const [toast, setToast] = useState<string | null>(null);
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
      void computePaymentDate;
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

  const billingByMonth = useMemo(() => {
    const map = new Map<string, { label: string; date: Date; total: number; items: { id: string; date: string; hospital: string; regimeLabel: string; gross: number }[] }>();
    store.shifts.forEach((s) => {
      const wp = store.workplaces.find((w) => w.id === s.workplaceId);
      const d = new Date(s.date + "T12:00:00");
      const k = monthKey(d);
      const ref = new Date(d.getFullYear(), d.getMonth(), 1);
      const cur = map.get(k) ?? { label: monthLabel(ref), date: ref, total: 0, items: [] };
      cur.total += s.gross;
      cur.items.push({
        id: s.id,
        date: s.date,
        hospital: wp?.name ?? "—",
        regimeLabel: wp ? TAX_LABELS[wp.regime] : "—",
        gross: s.gross,
      });
      map.set(k, cur);
    });
    return [...map.entries()]
      .sort((a, b) => b[1].date.getTime() - a[1].date.getTime())
      .map(([k, v]) => ({ key: k, ...v, items: v.items.sort((a, b) => b.date.localeCompare(a.date)) }));
  }, [store.shifts, store.workplaces]);
  const [openBillingMonth, setOpenBillingMonth] = useState<string | null>(null);

  function exportCSV() {
    const headers = ["Data", "Hospital", "Regime", "Horas", "Bruto"];
    const rows = store.shifts
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((s) => {
        const wp = store.workplaces.find((w) => w.id === s.workplaceId);
        const cells = [
          fmtDate(new Date(s.date + "T12:00:00")),
          wp?.name ?? "—",
          wp ? TAX_LABELS[wp.regime] : "—",
          String(s.hours),
          s.gross.toFixed(2).replace(".", ","),
        ];
        return cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
      });
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-plantoes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToast("Relatório CSV exportado com sucesso");
    setTimeout(() => setToast(null), 2400);
  }

  function handleDownloadPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const now = new Date();
    const generatedAt = now.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

    const activeMonth = billingByMonth.find((m) => m.key === openBillingMonth) || billingByMonth[0];
    const periodLabel = activeMonth ? activeMonth.label : monthLabel(now);
    const userName = "Médico(a)";

    // Cabeçalho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("DOCFIN — EXTRATO DE RENDIMENTOS", 14, 20);

    // Subcabeçalho
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`${userName} · Período: ${periodLabel}`, 14, 27);

    const rows = (activeMonth?.items || []).map((it) => [
      fmtDate(new Date(it.date + "T12:00:00")),
      it.hospital,
      it.regimeLabel,
      brl2(it.gross),
    ]);
    const totalGross = activeMonth?.total || 0;

    autoTable(doc, {
      startY: 34,
      head: [["Data", "Hospital", "Regime", "Valor Bruto"]],
      body: rows,
      foot: [[{ content: "Total Geral", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } }, { content: brl2(totalGross), styles: { halign: "right", fontStyle: "bold" } }]],
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 4, textColor: [0, 0, 0] },
      headStyles: {
        fontStyle: "bold",
        textColor: [0, 0, 0],
        lineWidth: { top: 0, right: 0, bottom: 0.5, left: 0 },
        lineColor: [0, 0, 0],
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      footStyles: {
        textColor: [0, 0, 0],
        lineWidth: { top: 0.5, right: 0, bottom: 0, left: 0 },
        lineColor: [0, 0, 0],
      },
      columnStyles: {
        3: { halign: "right" },
      },
      margin: { left: 14, right: 14, bottom: 18 },
      didDrawPage: () => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Emitido em ${generatedAt} · Docfin`,
          pageWidth / 2,
          pageHeight - 8,
          { align: "center" },
        );
      },
    });

    doc.save("extrato_docfin.pdf");
    setToast("Relatório PDF exportado com sucesso");
    setTimeout(() => setToast(null), 2400);
  }

  return (
    <>
      <Section title="Relatórios & Caixa" subtitle="Quando o dinheiro cai — projeção por hospital">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">A receber (projetado)</p>
              <p className="font-display text-4xl mt-1 text-gradient">{brl(total)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{totalCount} plantão(ões) aguardando pagamento</p>
            </div>
            <button
              onClick={exportCSV}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-medium border border-white/10 bg-slate-900/60 hover:bg-slate-900/80 text-slate-100 transition backdrop-blur"
              aria-label="Exportar Relatório em CSV"
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              Exportar Relatório (CSV)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-5">
            <button onClick={handleDownloadPDF}
              className="rounded-xl py-3 text-sm font-medium text-primary-foreground inline-flex items-center justify-center gap-2"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
              <FileText className="h-4 w-4" /> Exportar PDF
            </button>
            <button onClick={exportCSV}
              className="rounded-xl py-3 text-sm font-medium border border-border bg-surface-elevated/40 hover:bg-surface-elevated/70 inline-flex items-center justify-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" /> Exportar CSV
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 inline-flex items-center gap-1">
            <FileDown className="h-3 w-3" /> Inclui memorial por hospital, regra de pagamento e líquido projetado.
          </p>
        </div>
      </Section>

      <div>
      <Section title="Faturamento por Mês" subtitle="Plantões agrupados pela data de execução · valores brutos">
        <div className="space-y-2">
          {billingByMonth.length === 0 && (
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur p-8 text-center text-sm text-slate-400">
              Nenhum plantão registrado ainda.
            </div>
          )}
          {billingByMonth.map((g) => {
            const isOpen = openBillingMonth === g.key;
            return (
              <div key={g.key} className="rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur overflow-hidden">
                <button
                  onClick={() => setOpenBillingMonth(isOpen ? null : g.key)}
                  className="w-full p-4 text-left hover:bg-slate-900/60 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {isOpen ? <ChevronDown className="h-4 w-4 text-primary shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                      <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize truncate text-slate-100">{g.label}</p>
                        <p className="text-[10px] text-slate-400">{g.items.length} plantão(ões)</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">Faturamento</p>
                      <p className="font-mono text-base text-slate-100">{brl(g.total)}</p>
                    </div>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-white/5 divide-y divide-white/5">
                    {g.items.map((it) => (
                      <div key={it.id} className="px-4 py-3 grid grid-cols-12 gap-2 items-center">
                        <p className="col-span-3 text-[12px] text-slate-300 tabular-nums inline-flex items-center gap-1.5">
                          <CalendarIcon className="h-3 w-3 text-slate-500" />
                          {fmtDate(new Date(it.date + "T12:00:00"))}
                        </p>
                        <p className="col-span-5 text-[12px] text-slate-100 truncate inline-flex items-center gap-1.5">
                          <Building2 className="h-3 w-3 text-slate-500 shrink-0" />
                          {it.hospital}
                        </p>
                        <p className="col-span-2 text-[10px] uppercase tracking-wider text-slate-400 truncate">{it.regimeLabel}</p>
                        <p className="col-span-2 text-right font-mono text-[12px] text-slate-100 tabular-nums">{brl2(it.gross)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>
      </div>

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

      {toast && (
        <div className="fixed bottom-24 inset-x-0 z-50 flex justify-center px-5 pointer-events-none">
          <div className="glass-card rounded-xl px-4 py-3 inline-flex items-center gap-2 text-sm pointer-events-auto"
               style={{ boxShadow: "var(--shadow-glow)" }}>
            <CheckCircle2 className="h-4 w-4 text-success" />
            {toast}
          </div>
        </div>
      )}

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
