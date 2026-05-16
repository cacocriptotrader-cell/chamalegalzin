import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useStore, brl2, generateMonthlyReport } from "@/lib/store";
import { Section } from "@/components/Section";
import { FileDown, FileSpreadsheet } from "lucide-react";

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

const PDF_MARGIN = 14;
const DOCFIN_CHARCOAL: [number, number, number] = [19, 23, 28];
const DOCFIN_SAGE: [number, number, number] = [136, 166, 146];
const DOCFIN_MUTED: [number, number, number] = [96, 105, 115];
const DOCFIN_LINE: [number, number, number] = [218, 224, 228];

function Fechamento() {
  const s = useStore();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const report = useMemo(() => generateMonthlyReport(s, month, year), [s, month, year]);
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i);

  function handleDownloadPDF() {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const doctorName = s.userProfile.fullName?.trim() || "Médico(a) não informado";
    const documentLabel = "CPF/CNPJ: Não informado";
    const generatedAtPdf = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    const fileMonth = String(month).padStart(2, "0");

    drawPdfHeader(doc, monthLabel, doctorName, documentLabel);

    autoTable(doc, {
      startY: 43,
      margin: { left: PDF_MARGIN, right: PDF_MARGIN, bottom: 18 },
      theme: "plain",
      tableWidth: pageWidth - PDF_MARGIN * 2,
      body: [[
        "Mês de competência",
        monthLabel,
        "Faturamento bruto",
        brl2(report.totalGross),
      ], [
        "Plantões",
        String(report.totalShifts),
        "Cirurgias",
        String(report.totalSurgeries),
      ]],
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 2.4,
        textColor: DOCFIN_CHARCOAL,
        lineColor: DOCFIN_LINE,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { fontStyle: "bold", textColor: DOCFIN_MUTED, cellWidth: 42 },
        1: { halign: "right", cellWidth: 52 },
        2: { fontStyle: "bold", textColor: DOCFIN_MUTED, cellWidth: 40 },
        3: { halign: "right", fontStyle: "bold" },
      },
      alternateRowStyles: { fillColor: [247, 249, 248] },
    });

    const summaryY = ((doc as any).lastAutoTable?.finalY ?? 62) + 10;
    drawPdfSectionTitle(doc, "Resumo por regime", summaryY);

    const regimes = Object.values(report.byRegime);
    autoTable(doc, {
      startY: summaryY + 5,
      margin: { top: 22, left: PDF_MARGIN, right: PDF_MARGIN, bottom: 18 },
      theme: "grid",
      head: [["Regime", "Operações", "Faturamento bruto"]],
      body: regimes.length > 0
        ? regimes.map((regime) => [regime.label, String(regime.count), brl2(regime.gross)])
        : [["Sem operações no período", "0", brl2(0)]],
      styles: baseTableStyles(),
      headStyles: tableHeadStyles(),
      columnStyles: {
        1: { halign: "right", cellWidth: 34 },
        2: { halign: "right", cellWidth: 48, fontStyle: "bold" },
      },
      rowPageBreak: "avoid",
      showHead: "everyPage",
    });

    const detailsY = nextPdfSectionY(doc, ((doc as any).lastAutoTable?.finalY ?? summaryY + 28) + 10);
    drawPdfSectionTitle(doc, "Detalhamento por hospital / pagador", detailsY);

    autoTable(doc, {
      startY: detailsY + 5,
      margin: { top: 22, left: PDF_MARGIN, right: PDF_MARGIN, bottom: 18 },
      theme: "grid",
      head: [["Hospital / Pagador", "Regime", "Plantões", "Cirurgias", "Bruto"]],
      body: report.rows.length > 0
        ? report.rows.map((row) => [
            row.workplaceName,
            report.byRegime[row.regime]?.label ?? row.regime,
            String(row.shiftsCount),
            String(row.surgeriesCount),
            brl2(row.gross),
          ])
        : [["Nenhuma operação no período", "—", "0", "0", brl2(0)]],
      styles: baseTableStyles(),
      headStyles: tableHeadStyles(),
      columnStyles: {
        0: { cellWidth: 62 },
        1: { cellWidth: 44 },
        2: { halign: "right", cellWidth: 24 },
        3: { halign: "right", cellWidth: 24 },
        4: { halign: "right", cellWidth: 30, fontStyle: "bold" },
      },
      rowPageBreak: "avoid",
      showHead: "everyPage",
    });

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page);
      if (page > 1) drawPdfContinuationHeader(doc, monthLabel);
      drawPdfFooter(doc, page, pageCount, generatedAtPdf);
    }

    doc.save(`docfin-dossie-contabil-${year}-${fileMonth}.pdf`);
  }

  return (
    <>
      {/* On-screen UI */}
      <div className="no-print">
        <Section
          title="Exportação Contábil"
          subtitle="Fechamento mensal automático — pronto para enviar ao seu contador"
          action={
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/40 transition"
            >
              <FileDown className="h-3.5 w-3.5" />
              Exportar PDF
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
            PDF vetorial em A4, com tabelas paginadas, rodapé oficial e valores alinhados para conferência contábil.
          </p>
        </Section>
      </div>


    </>
  );
}

function baseTableStyles() {
  return {
    font: "helvetica",
    fontSize: 8.4,
    cellPadding: 2.4,
    overflow: "linebreak" as const,
    valign: "middle" as const,
    textColor: DOCFIN_CHARCOAL,
    lineColor: DOCFIN_LINE,
    lineWidth: 0.1,
  };
}

function tableHeadStyles() {
  return {
    fillColor: DOCFIN_CHARCOAL,
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: "bold" as const,
    halign: "left" as const,
  };
}

function drawPdfHeader(doc: jsPDF, monthLabel: string, doctorName: string, documentLabel: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...DOCFIN_CHARCOAL);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setFillColor(...DOCFIN_SAGE);
  doc.rect(0, 32.5, pageWidth, 1.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("DocFin", PDF_MARGIN, 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(218, 224, 228);
  doc.text("WEALTH", PDF_MARGIN + 27, 15);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(`Dossiê Contábil - ${monthLabel}`, PDF_MARGIN, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(218, 224, 228);
  doc.text(`Medico(a): ${doctorName}`, pageWidth - PDF_MARGIN, 14, { align: "right" });
  doc.text(documentLabel, pageWidth - PDF_MARGIN, 20, { align: "right" });
}

function drawPdfContinuationHeader(doc: jsPDF, monthLabel: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 16, "F");
  doc.setDrawColor(...DOCFIN_LINE);
  doc.line(PDF_MARGIN, 16, pageWidth - PDF_MARGIN, 16);
  doc.setTextColor(...DOCFIN_CHARCOAL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DocFin", PDF_MARGIN, 10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DOCFIN_MUTED);
  doc.text(`Dossiê Contábil - ${monthLabel}`, pageWidth - PDF_MARGIN, 10, { align: "right" });
}

function drawPdfSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setTextColor(...DOCFIN_CHARCOAL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, PDF_MARGIN, y);
  doc.setFillColor(...DOCFIN_SAGE);
  doc.rect(PDF_MARGIN, y + 2, 18, 0.8, "F");
}

function nextPdfSectionY(doc: jsPDF, desiredY: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (desiredY > pageHeight - 38) {
    doc.addPage();
    return 24;
  }
  return desiredY;
}

function drawPdfFooter(doc: jsPDF, page: number, pageCount: number, generatedAt: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const y = pageHeight - 9;

  doc.setDrawColor(...DOCFIN_LINE);
  doc.line(PDF_MARGIN, pageHeight - 15, pageWidth - PDF_MARGIN, pageHeight - 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...DOCFIN_MUTED);
  doc.text(`Gerado em: ${generatedAt}`, PDF_MARGIN, y);
  doc.text(`Página ${page} de ${pageCount}`, pageWidth - PDF_MARGIN, y, { align: "right" });
}
