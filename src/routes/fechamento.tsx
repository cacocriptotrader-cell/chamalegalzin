import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  useStore,
  brl2,
  computeShift,
  computeTaxForRegime,
  generateMonthlyReport,
  getRecordPaymentStatus,
  getRollingFatorRSnapshot,
  isConsolidatedRecord,
  SIMPLES_ANEXO_III_RATE,
  SIMPLES_ANEXO_V_RATE,
  type PaymentStatus,
  type Shift,
} from "@/lib/store";
import { generateAccountingCSV } from "@/lib/accountingCsv";
import { Section } from "@/components/Section";
import { FatorRMonitor } from "@/components/FatorRMonitor";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { QuickCaptureModal, type QuickCapturePrefill } from "@/components/QuickCaptureModal";
import { AlertTriangle, ChevronDown, CircleDollarSign, Download, FileSpreadsheet, FileText, Repeat, Save, ShieldCheck, TrendingUp } from "lucide-react";

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
  const estimatedTax = useMemo(() => estimateDossierTax(s, month, year), [s, month, year]);
  const consolidatedShifts = useMemo(
    () => s.shifts
      .filter((shift) => isConsolidatedRecord(shift))
      .filter((shift) => isInCompetence(shift.date, month, year))
      .sort((a, b) => a.date.localeCompare(b.date)),
    [s.shifts, month, year],
  );
  const taxReviewShifts = useMemo(
    () => s.shifts
      .filter((shift) => isInCompetence(shift.date, month, year))
      .sort((a, b) => a.date.localeCompare(b.date)),
    [s.shifts, month, year],
  );
  const taxPendingCount = useMemo(
    () => taxReviewShifts.filter((shift) => isConsolidatedRecord(shift) && getMissingTaxFields(shift).length > 0).length,
    [taxReviewShifts],
  );
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i);
  const optimizationTone = factorAudit.hasRevenue
    ? factorAudit.safe
      ? "text-success"
      : "text-warning"
    : "text-muted-foreground";
  const optimizationLabel = factorAudit.hasRevenue
    ? factorAudit.safe
      ? "Meta de 28% protegida"
      : "Ajuste recomendado"
    : "Sem base PJ Simples";
  const recommendedProLabore = factorAudit.safe ? factorAudit.targetPayroll : factorAudit.missingProLabore;
  const savingsPotential = Math.max(0, factorAudit.currentMonthRevenue * (SIMPLES_ANEXO_V_RATE - SIMPLES_ANEXO_III_RATE));

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
        ? taxPendingCount > 0
          ? `${result.rowCount} linha(s) consolidadas exportadas para ${result.fileName}. Atenção: ${taxPendingCount} plantão(ões) ainda têm dados fiscais pendentes.`
          : `${result.rowCount} linha(s) consolidadas exportadas para ${result.fileName}.`
        : `Nenhuma linha consolidada em ${monthLabel}. CSV exportado apenas com cabeçalho.`,
    );
  }

  function handlePdfExportPreview() {
    setExportMessage("Exportação em PDF em breve. A exportação CSV contábil já está disponível abaixo.");
  }

  return (
    <>
      {/* Interface exibida em tela */}
      <div className="no-print">
        <div className="space-y-5 px-5 pt-5">
          <section className="premium-card overflow-hidden rounded-3xl p-5 md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-primary">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Backoffice PJ
                </p>
                <h1 className="mt-3 font-display text-3xl text-foreground md:text-4xl">Dossiê Fiscal Premium</h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Um relatório executivo para acompanhar faturamento, eficiência tributária e dados prontos para o escritório contábil sem transformar a rotina médica em planilha.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:items-start">
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface-elevated/70 p-2">
                  <label className="space-y-1">
                    <span className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground">Mês</span>
                    <select
                      value={month}
                      onChange={(e) => setMonth(+e.target.value)}
                      className="premium-input h-10 min-w-[128px] rounded-xl py-0"
                    >
                      {MONTH_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground">Ano</span>
                    <select
                      value={year}
                      onChange={(e) => setYear(+e.target.value)}
                      className="premium-input h-10 min-w-[94px] rounded-xl py-0"
                    >
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handlePdfExportPreview}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/15"
                >
                  <FileText className="h-4 w-4" />
                  Exportar Dossiê (PDF)
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ExecutiveKpiCard
                icon={<CircleDollarSign className="h-5 w-5" />}
                label="Faturamento Bruto"
                value={brl2(report.totalGross)}
                detail={`${report.totalShifts + report.totalSurgeries} operação(ões) consolidadas`}
              />
              <ExecutiveKpiCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Imposto Estimado"
                value={brl2(estimatedTax)}
                detail={savingsPotential > 0 ? `Economia potencial Anexo III: ${brl2(savingsPotential)}` : "Sem base PJ Simples nesta competência"}
              />
              <ExecutiveKpiCard
                icon={factorAudit.safe ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                label="Índice de Otimização Tributária"
                value={factorAudit.hasRevenue ? `${factorAudit.factorPercent.toFixed(1)}%` : "Sem base"}
                detail={optimizationLabel}
                accent={optimizationTone}
              />
              <ExecutiveKpiCard
                icon={<ShieldCheck className="h-5 w-5" />}
                label="Pró-labore Recomendado"
                value={brl2(recommendedProLabore)}
                detail={factorAudit.safe ? "Referência para manter a estrutura protegida" : "Incremento sugerido para aproximar a meta"}
                accent={factorAudit.safe ? "text-success" : "text-warning"}
              />
            </div>
          </section>

          <Collapsible.Root open={factorOpen} onOpenChange={setFactorOpen} className="premium-card rounded-2xl p-4">
            <Collapsible.Trigger className="flex w-full items-center justify-between gap-4 text-left">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Detalhe fiscal avançado</p>
                <h2 className="font-display text-xl mt-1">{factorOpen ? "Ocultar Índice de Otimização Tributária" : "Mostrar Índice de Otimização Tributária"}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Leitura executiva da meta de 28% em janela móvel. A apuração fiscal definitiva deve ser validada no fechamento contábil.
                </p>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${factorOpen ? "rotate-180" : ""}`} />
            </Collapsible.Trigger>
            <Collapsible.Content className="mt-4 space-y-4">
              <FatorRMonitor month={month} year={year} />
              <div className="premium-panel rounded-xl p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Trilha executiva de otimização tributária</p>
                    <h3 className="font-display text-lg mt-1">{factorAudit.statusLabel}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Registros draft não entram nesta base. A conferência abaixo usa operações consolidadas da janela móvel e a calibragem histórica informada.
                    </p>
                    <p className="text-xs text-warning mt-2 leading-relaxed">
                      Atenção: esta é uma projeção gerencial. A validação fiscal definitiva continua sendo do contador no fechamento oficial.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[560px]">
                    <AuditMetric label="Histórico de Faturamento" value={brl2(factorAudit.pjSimpleRevenue)} />
                    <AuditMetric label="Alvo 28%" value={brl2(factorAudit.targetPayroll)} />
                    <AuditMetric label="Média de Folha" value={brl2(factorAudit.payrollConsidered)} />
                    <AuditMetric label="Índice Atual" value={`${factorAudit.factorPercent.toFixed(1)}%`} accent={factorAudit.safe ? "text-success" : "text-warning"} />
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
            <div className="premium-card overflow-hidden rounded-xl">
              <div className="divide-y divide-border">
                {consolidatedShifts.map((shift) => {
                  const workplace = s.workplaces.find((item) => item.id === shift.workplaceId);
                  const math = computeShift(s, shift);
                  return (
                    <div key={shift.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{workplace?.name ?? "Hospital não cadastrado"}</p>
                          <PaymentStatusBadge status={getShiftPaymentBadgeStatus(shift)} />
                        </div>
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
          title="Revisão Fiscal do Mês"
          subtitle="Speed 2: complete NF, competência e contraparte antes de enviar o CSV ao contador"
        >
          <div className="premium-card overflow-hidden rounded-2xl">
            <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Dados fiscais para exportação</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Estes campos são opcionais para salvar, mas ficam destacados quando faltam em plantões consolidados.
                </p>
              </div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                taxPendingCount > 0
                  ? "border-warning/35 bg-warning/10 text-warning"
                  : "border-success/35 bg-success/10 text-success"
              }`}>
                {taxPendingCount > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {taxPendingCount > 0 ? `${taxPendingCount} pendência(s) fiscais` : "Base fiscal revisada"}
              </div>
            </div>

            <div className="divide-y divide-border">
              {taxReviewShifts.map((shift) => (
                <TaxReviewShiftRow key={shift.id} shift={shift} store={s} />
              ))}
              {taxReviewShifts.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  Nenhum plantão lançado em {monthLabel}.
                </div>
              )}
            </div>
          </div>
        </Section>
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
          <div className="premium-card mb-4 flex flex-wrap items-end gap-3 rounded-xl p-4">
            <div className="ml-auto text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Faturamento bruto</p>
              <p className="font-mono text-2xl font-semibold">{brl2(report.totalGross)}</p>
            </div>
          </div>

          {/* Resumo por regime */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {Object.entries(report.byRegime).length === 0 && (
              <div className="premium-card rounded-xl p-6 text-center text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">
                Sem operações registradas em {monthLabel}.
              </div>
            )}
            {Object.entries(report.byRegime).map(([k, v]) => (
              <div key={k} className="premium-card rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{v.label}</p>
                <p className="font-mono text-xl font-semibold mt-1">{brl2(v.gross)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{v.count} operações</p>
              </div>
            ))}
          </div>

          {/* Tabela detalhada */}
          <div className="premium-card overflow-hidden rounded-xl">
            <div className="overflow-x-auto w-full">
              <table className="min-w-[720px] w-full text-sm">
                <thead className="bg-surface-elevated/80">
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
          </div>

          <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
            <FileSpreadsheet className="h-3 w-3" />
            O dossiê impresso/PDF é otimizado em A4, preto e branco, fonte Inter — pronto para auditoria.
          </p>
          {exportMessage && (
            <p className="premium-panel mt-2 rounded-xl px-3 py-2 text-[11px] text-muted-foreground">
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

function TaxReviewShiftRow({ shift, store }: { shift: Shift; store: ReturnType<typeof useStore> }) {
  const workplace = store.workplaces.find((item) => item.id === shift.workplaceId);
  const math = computeShift(store, shift);
  const missingFields = getMissingTaxFields(shift);
  const consolidated = isConsolidatedRecord(shift);
  const hasRepasse = hasRepasseDeduction(shift);
  const [open, setOpen] = useState(consolidated && missingFields.length > 0);
  const [invoiceNumber, setInvoiceNumber] = useState(shift.invoiceNumber ?? "");
  const [invoiceIssueDate, setInvoiceIssueDate] = useState(shift.invoiceIssueDate ?? "");
  const [counterpartyDocument, setCounterpartyDocument] = useState(shift.counterpartyDocument ?? "");
  const [saved, setSaved] = useState(false);

  function saveTaxData() {
    const normalizedDocument = normalizeBrazilianDocument(counterpartyDocument);
    store.updateShift(shift.id, {
      invoiceNumber: invoiceNumber.trim() || undefined,
      invoiceIssueDate: invoiceIssueDate || undefined,
      counterpartyDocument: normalizedDocument || undefined,
    });
    setCounterpartyDocument(normalizedDocument);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <div className="px-4 py-3">
        <Collapsible.Trigger className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">{workplace?.name ?? "Hospital não cadastrado"}</p>
              <PaymentStatusBadge status={getShiftPaymentBadgeStatus(shift)} />
              {!consolidated && (
                <span className="rounded-full border border-border bg-muted/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Rascunho fora do CSV
                </span>
              )}
              {consolidated && missingFields.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-warning/35 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  Dados fiscais pendentes
                </span>
              )}
              {consolidated && missingFields.length === 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-success/35 bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-success">
                  <ShieldCheck className="h-3 w-3" />
                  Pronto para contador
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {formatShortDate(shift.date)} · {shift.hours}h · bruto {brl2(shift.gross || 0)} · líquido {brl2(math.net)}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            {hasRepasse && (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                Repasse detectado
              </span>
            )}
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
        </Collapsible.Trigger>

        <Collapsible.Content className="mt-4">
          <div className="premium-panel rounded-2xl p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Número da NF
                </span>
                <input
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  placeholder="Ex: NF 1842"
                  className={`premium-input min-h-11 ${consolidated && !invoiceNumber.trim() ? "border-warning/40" : ""}`}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Data de emissão
                </span>
                <input
                  type="date"
                  value={invoiceIssueDate}
                  onChange={(event) => setInvoiceIssueDate(event.target.value)}
                  className={`premium-input min-h-11 ${consolidated && !invoiceIssueDate ? "border-warning/40" : ""}`}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  CPF/CNPJ contraparte
                </span>
                <input
                  value={counterpartyDocument}
                  onChange={(event) => setCounterpartyDocument(event.target.value)}
                  placeholder={hasRepasse ? "Obrigatório se houve repasse" : "Opcional"}
                  inputMode="numeric"
                  className={`premium-input min-h-11 ${consolidated && hasRepasse && !counterpartyDocument.trim() ? "border-warning/40" : ""}`}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {missingFields.length > 0
                  ? `Pendências: ${missingFields.join(", ")}. O CSV ainda exporta, mas o contador pode precisar confirmar estes dados.`
                  : "Dados fiscais suficientes para o CSV contábil desta competência."}
              </p>
              <button
                type="button"
                onClick={saveTaxData}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                <Save className="h-4 w-4" />
                {saved ? "Dados salvos" : "Salvar dados fiscais"}
              </button>
            </div>
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}

function getMissingTaxFields(shift: Shift) {
  const missing: string[] = [];
  if (!shift.invoiceNumber?.trim()) missing.push("Número da NF");
  if (!shift.invoiceIssueDate) missing.push("Data de emissão da NF");
  if (hasRepasseDeduction(shift) && !shift.counterpartyDocument?.trim()) missing.push("CPF/CNPJ da contraparte");
  return missing;
}

function hasRepasseDeduction(shift: Shift) {
  return Array.isArray(shift.deductions)
    && shift.deductions.some((deduction) => deduction.type === "REPASSE" && (deduction.amount || 0) > 0);
}

function normalizeBrazilianDocument(value: string) {
  return value.replace(/\D/g, "");
}

function ExecutiveKpiCard({
  icon,
  label,
  value,
  detail,
  accent = "text-foreground",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  accent?: string;
}) {
  return (
    <div className="premium-panel rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
          {icon}
        </div>
        <span className="rounded-full border border-border bg-surface px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Premium
        </span>
      </div>
      <p className="mt-5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function estimateDossierTax(store: ReturnType<typeof useStore>, month: number, year: number) {
  const shiftsTax = store.shifts
    .filter((shift) => isConsolidatedRecord(shift))
    .filter((shift) => isInCompetence(shift.date, month, year))
    .reduce((sum, shift) => sum + computeShift(store, shift).tax, 0);

  const surgeriesTax = store.surgeries
    .filter((surgery) => isConsolidatedRecord(surgery))
    .filter((surgery) => isInCompetence(surgery.date, month, year))
    .reduce((sum, surgery) => {
      if (surgery.myRole === "MEMBRO_EQUIPE") {
        return sum + computeTaxForRegime(surgery.myExpectedShare, "SCP", store);
      }
      const workplace = store.workplaces.find((item) => item.id === surgery.hospitalId);
      return sum + computeTaxForRegime(surgery.totalGross, workplace?.regime ?? "PJ_SIMPLES", store);
    }, 0);

  return shiftsTax + surgeriesTax;
}

function formatShortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getShiftPaymentBadgeStatus(shift: Shift): PaymentStatus {
  const status = getRecordPaymentStatus(shift);
  const expectedPaymentDate = shift.expectedPaymentDate ?? shift.projectedPaymentDate;
  const todayIso = new Date().toISOString().slice(0, 10);
  if (status === "PENDING" && expectedPaymentDate && expectedPaymentDate < todayIso) return "OVERDUE";
  return status;
}

function getFactorAuditSnapshot(store: ReturnType<typeof useStore>, month: number, year: number) {
  const snapshot = getRollingFatorRSnapshot(store, year, month);
  const statusLabel = !snapshot.hasRevenue
    ? "Sem faturamento PJ Simples na janela fiscal"
    : snapshot.safe
      ? "Índice em zona segura para Anexo III"
      : "Índice em atenção para Anexo V";

  return {
    hasRevenue: snapshot.hasRevenue,
    currentMonthRevenue: snapshot.currentMonthRevenue,
    pjSimpleRevenue: snapshot.accumulatedRevenue,
    targetPayroll: snapshot.targetProLabore,
    missingProLabore: snapshot.missingProLabore,
    payrollConsidered: snapshot.accumulatedProLabore,
    factorPercent: snapshot.factorPercent,
    safe: snapshot.safe,
    statusLabel,
  };
}

function AuditMetric({ label, value, accent = "text-foreground" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="premium-panel rounded-xl px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono text-sm font-semibold mt-1 tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}
