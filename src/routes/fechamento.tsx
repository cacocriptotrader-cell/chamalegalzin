import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  useStore,
  brl2,
  computeShift,
  computedProLaboreMonthly,
  FATOR_R_PROLABORE_RATIO,
  generateMonthlyReport,
  getCurrentMonthRegimeTotal,
  isConsolidatedRecord,
} from "@/lib/store";
import { generateAccountingCSV } from "@/lib/accountingCsv";
import { Section } from "@/components/Section";
import { FatorRMonitor } from "@/components/FatorRMonitor";
import { QuickCaptureModal, type QuickCapturePrefill } from "@/components/QuickCaptureModal";
import { ChevronDown, Download, FileSpreadsheet, Repeat } from "lucide-react";

export const Route = createFileRoute("/fechamento")({
  head: () => ({
    meta: [
      { title: "Fechamento Mensal — Docfin" },
      { name: "description", content: "Exportação contábil mensal por regime tributário para envio ao contador." },
    ],
  }),
  component: Fechamento,
});

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function Fechamento() {
  const s = useStore();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [factorOpen, setFactorOpen] = useState(false);
  const [repeatPrefill, setRepeatPrefill] = useState<QuickCapturePrefill | null>(null);

  const report = useMemo(() => generateMonthlyReport(s, month, year), [s, month, year]);
  const factorAudit = useMemo(() => getFactorAuditSnapshot(s, month, year), [s, month, year]);
  const consolidatedShifts = useMemo(
    () => s.shifts
      .filter((shift) => isConsolidatedRecord(shift))
      .filter((shift) => isInCompetence(shift.date, month, year))
      .sort((a, b) => a.date.localeCompare(b.date)),
    [s.shifts, month, year],
  );
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i);

  function handleAccountingCsvDownload() {
    const result = generateAccountingCSV(s, month, year);
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportMessage(
      result.rowCount > 0
        ? `${result.rowCount} linha(s) consolidadas exportadas para ${result.fileName}.`
        : `Nenhuma linha consolidada em ${monthLabel}. CSV exportado apenas com cabeçalho.`,
    );
  }

  return (
    <>
      {/* On-screen UI */}
      <div className="no-print">
        <div className="px-5 pt-5">
          <Collapsible.Root open={factorOpen} onOpenChange={setFactorOpen} className="glass-card rounded-2xl p-4">
            <Collapsible.Trigger className="flex w-full items-center justify-between gap-4 text-left">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Detalhe fiscal avançado</p>
                <h2 className="font-display text-xl mt-1">{factorOpen ? "Ocultar Cálculo do Fator R" : "Mostrar Cálculo do Fator R"}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  A matemática tributária fica recolhida para reduzir ruído na leitura mensal.
                </p>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${factorOpen ? "rotate-180" : ""}`} />
            </Collapsible.Trigger>
            <Collapsible.Content className="mt-4 space-y-4">
              <FatorRMonitor month={month} year={year} />
              <div className="rounded-2xl border border-border bg-surface-elevated/60 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Trilha de auditoria do Fator R</p>
                    <h3 className="font-display text-lg mt-1">{factorAudit.statusLabel}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Registros draft não entram nesta base. A conferência abaixo usa apenas operações consolidadas da competência.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[560px]">
                    <AuditMetric label="Faturamento PJ Simples" value={brl2(factorAudit.pjSimpleRevenue)} />
                    <AuditMetric label="Alvo 28%" value={brl2(factorAudit.targetPayroll)} />
                    <AuditMetric label="Folha considerada" value={brl2(factorAudit.payrollConsidered)} />
                    <AuditMetric label="Fator R" value={`${factorAudit.factorPercent.toFixed(1)}%`} accent={factorAudit.safe ? "text-success" : "text-warning"} />
                  </div>
                </div>
              </div>
            </Collapsible.Content>
          </Collapsible.Root>
        </div>
        {consolidatedShifts.length > 0 && (
          <Section
            title="Plantões Consolidados"
            subtitle="Repita um plantão recorrente como rascunho para triagem posterior"
          >
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="divide-y divide-border">
                {consolidatedShifts.map((shift) => {
                  const workplace = s.workplaces.find((item) => item.id === shift.workplaceId);
                  const math = computeShift(s, shift);
                  return (
                    <div key={shift.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium">{workplace?.name ?? "Hospital não cadastrado"}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatShortDate(shift.date)} · {shift.hours}h · líquido {brl2(math.net)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRepeatPrefill({
                          workplaceId: shift.workplaceId,
                          hours: shift.hours,
                          procedure: shift.procedure,
                          transportMode: shift.transportMode,
                          privateTransportCost: shift.privateTransportCost,
                          extraCost: shift.extraCost,
                        })}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                      >
                        <Repeat className="h-3.5 w-3.5" />
                        Repetir
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>
        )}
        <Section
          title="Exportação Contábil"
          subtitle="Fechamento mensal automático — pronto para enviar ao seu contador"
          action={
            <button
              type="button"
              onClick={handleAccountingCsvDownload}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-transparent px-4 py-2 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition"
            >
              <Download className="h-4 w-4" />
              Exportar para o Contador (.CSV)
            </button>
          }
        >
          <div className="glass-card rounded-2xl p-4 mb-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Mês</label>
              <select
                value={month}
                onChange={(e) => setMonth(+e.target.value)}
                className="bg-secondary/60 border border-border rounded-md h-9 px-3 text-sm"
              >
                {MONTH_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Ano</label>
              <select
                value={year}
                onChange={(e) => setYear(+e.target.value)}
                className="bg-secondary/60 border border-border rounded-md h-9 px-3 text-sm"
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Faturamento bruto</p>
              <p className="font-mono text-2xl font-semibold">{brl2(report.totalGross)}</p>
            </div>
          </div>

          {/* Resumo por regime */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {Object.entries(report.byRegime).length === 0 && (
              <div className="glass-card rounded-2xl p-6 sm:col-span-2 lg:col-span-3 text-center text-xs text-muted-foreground">
                Sem operações registradas em {monthLabel}.
              </div>
            )}
            {Object.entries(report.byRegime).map(([k, v]) => (
              <div key={k} className="glass-card rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{v.label}</p>
                <p className="font-mono text-xl font-semibold mt-1">{brl2(v.gross)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{v.count} operações</p>
              </div>
            ))}
          </div>

          {/* Tabela detalhada */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">Hospital / Pagador</th>
                  <th className="text-left px-4 py-2 font-medium">Regime</th>
                  <th className="text-right px-4 py-2 font-medium">Plantões</th>
                  <th className="text-right px-4 py-2 font-medium">Cirurgias</th>
                  <th className="text-right px-4 py-2 font-medium">Bruto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.rows.map((r) => (
                  <tr key={`${r.workplaceId}-${r.regime}`}>
                    <td className="px-4 py-2.5">{r.workplaceName}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{report.byRegime[r.regime]?.label ?? r.regime}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{r.shiftsCount}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{r.surgeriesCount}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{brl2(r.gross)}</td>
                  </tr>
                ))}
                {report.rows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma operação no período.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
            <FileSpreadsheet className="h-3 w-3" />
            O dossiê impresso/PDF é otimizado em A4, preto e branco, fonte Inter — pronto para auditoria.
          </p>
          {exportMessage && (
            <p className="mt-2 rounded-xl border border-border bg-surface-elevated px-3 py-2 text-[11px] text-muted-foreground">
              {exportMessage}
            </p>
          )}
        </Section>
        <QuickCaptureModal
          open={Boolean(repeatPrefill)}
          onOpenChange={(open) => {
            if (!open) setRepeatPrefill(null);
          }}
          prefill={repeatPrefill}
        />
      </div>


    </>
  );
}

function isInCompetence(iso: string, month: number, year: number) {
  const date = new Date(`${iso}T12:00:00`);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

function formatShortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getFactorAuditSnapshot(store: ReturnType<typeof useStore>, month: number, year: number) {
  const refDate = new Date(year, month - 1, 1);
  const pjSimpleRevenue = getCurrentMonthRegimeTotal(store, year, month, ["PJ_SIMPLES"]);
  const targetPayroll = pjSimpleRevenue * FATOR_R_PROLABORE_RATIO;
  const manualPayroll = store.proLabores.reduce((sum, item) => sum + (item.monthly || 0), 0);
  const automaticPayroll = computedProLaboreMonthly(store, refDate);
  const payrollConsidered = Math.max(manualPayroll, automaticPayroll);
  const factorPercent = pjSimpleRevenue > 0 ? (payrollConsidered / pjSimpleRevenue) * 100 : 0;
  const safe = pjSimpleRevenue > 0 && payrollConsidered >= targetPayroll;
  const statusLabel = pjSimpleRevenue === 0
    ? "Sem faturamento PJ Simples na competência"
    : safe
      ? "Anexo III confirmado pela base consolidada"
      : "Anexo V em risco pela base consolidada";

  return {
    pjSimpleRevenue,
    targetPayroll,
    payrollConsidered,
    factorPercent,
    safe,
    statusLabel,
  };
}

function AuditMetric({ label, value, accent = "text-foreground" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono text-sm font-semibold mt-1 tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}
