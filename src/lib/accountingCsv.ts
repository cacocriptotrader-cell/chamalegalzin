import {
  computeShift,
  getShiftRegime,
  isConsolidatedRecord,
  type Deduction,
  type StoreState,
  type TaxRegime,
} from "@/lib/store";

const CSV_HEADERS = [
  "ID do Registo",
  "Competência (Mês/Ano)",
  "Data do Evento",
  "Data de Previsão de Recebimento",
  "Hospital/Fonte",
  "Regime Fiscal (PF/PJ)",
  "Valor Bruto",
  "Retenção_ISS",
  "Retenção_IRRF",
  "CRF",
  "Glosas",
  "Repasses",
  "Taxa_Administrativa",
  "Outros_Ajustes",
  "Valor Líquido",
  "Categoria (Plantão/Cirurgia)",
];

type DeductionColumns = {
  iss: number;
  irrf: number;
  crf: number;
  glosas: number;
  repasses: number;
  taxaAdministrativa: number;
  outros: number;
};

type AccountingCsvRow = {
  id: string;
  competence: string;
  eventDate: string;
  expectedPaymentDate: string;
  source: string;
  regime: TaxRegime | "SCP";
  gross: number;
  deductions: DeductionColumns;
  net: number;
  category: "Plantão" | "Cirurgia";
};

export function generateAccountingCSV(store: StoreState, month: number, year: number) {
  const competence = `${String(month).padStart(2, "0")}/${year}`;
  const fileName = `docfin-contabilidade-${year}-${String(month).padStart(2, "0")}.csv`;
  const rows = buildAccountingRows(store, month, year, competence);
  const csv = [
    CSV_HEADERS.map(escapeCsvCell).join(","),
    ...rows.map((row) => [
      row.id,
      row.competence,
      row.eventDate,
      row.expectedPaymentDate,
      row.source,
      row.regime,
      formatCsvNumber(row.gross),
      formatCsvNumber(row.deductions.iss),
      formatCsvNumber(row.deductions.irrf),
      formatCsvNumber(row.deductions.crf),
      formatCsvNumber(row.deductions.glosas),
      formatCsvNumber(row.deductions.repasses),
      formatCsvNumber(row.deductions.taxaAdministrativa),
      formatCsvNumber(row.deductions.outros),
      formatCsvNumber(row.net),
      row.category,
    ].map(escapeCsvCell).join(",")),
  ].join("\n");

  return {
    fileName,
    csv: `\uFEFF${csv}`,
    rowCount: rows.length,
  };
}

function buildAccountingRows(store: StoreState, month: number, year: number, competence: string): AccountingCsvRow[] {
  const inMonth = (iso: string) => {
    const date = new Date(`${iso}T12:00:00`);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  };

  const rows: AccountingCsvRow[] = [];

  for (const shift of store.shifts) {
    if (!isConsolidatedRecord(shift)) continue;
    if (!inMonth(shift.date)) continue;

    const workplace = store.workplaces.find((item) => item.id === shift.workplaceId);
    const math = computeShift(store, shift);
    rows.push({
      id: `shift-${shift.id}`,
      competence,
      eventDate: shift.date,
      expectedPaymentDate: shift.expectedPaymentDate ?? shift.projectedPaymentDate ?? "",
      source: workplace?.name ?? "Hospital não cadastrado",
      regime: getShiftRegime(store, shift),
      gross: shift.gross || 0,
      deductions: mapDeductionColumns(shift.deductions, shift.settlementAdjustment),
      net: math.net,
      category: "Plantão",
    });
  }

  for (const surgery of store.surgeries) {
    if (!isConsolidatedRecord(surgery)) continue;
    if (!inMonth(surgery.date)) continue;

    if (surgery.myRole === "TITULAR") {
      const workplace = store.workplaces.find((item) => item.id === surgery.hospitalId);
      const deductions = mapDeductionColumns(surgery.deductions, surgery.settlementAdjustment);
      const deductionTotal = totalDeductionColumns(deductions);
      rows.push({
        id: `surgery-${surgery.id}`,
        competence,
        eventDate: surgery.date,
        expectedPaymentDate: surgery.date,
        source: workplace?.name ?? "Hospital não cadastrado",
        regime: workplace?.regime ?? "PJ_SIMPLES",
        gross: surgery.totalGross || 0,
        deductions,
        net: Math.max(0, (surgery.totalGross || 0) - deductionTotal),
        category: "Cirurgia",
      });
      continue;
    }

    const deductions = mapDeductionColumns(surgery.deductions, surgery.settlementAdjustment);
    const deductionTotal = totalDeductionColumns(deductions);
    rows.push({
      id: `surgery-${surgery.id}`,
      competence,
      eventDate: surgery.date,
      expectedPaymentDate: surgery.date,
      source: `SCP — ${surgery.payingSurgeonName}`,
      regime: "SCP",
      gross: surgery.myExpectedShare || 0,
      deductions,
      net: Math.max(0, (surgery.myExpectedShare || 0) - deductionTotal),
      category: "Cirurgia",
    });
  }

  return rows.sort((a, b) => {
    if (a.eventDate !== b.eventDate) return a.eventDate.localeCompare(b.eventDate);
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.id.localeCompare(b.id);
  });
}

function mapDeductionColumns(deductions?: Deduction[], legacyAdjustment?: number): DeductionColumns {
  const columns: DeductionColumns = {
    iss: 0,
    irrf: 0,
    crf: 0,
    glosas: 0,
    repasses: 0,
    taxaAdministrativa: 0,
    outros: 0,
  };

  if (!Array.isArray(deductions)) {
    columns.outros = Math.max(0, legacyAdjustment || 0);
    return columns;
  }

  for (const deduction of deductions) {
    const amount = Math.max(0, deduction.amount || 0);
    switch (deduction.type) {
      case "ISS_RETIDO":
        columns.iss += amount;
        break;
      case "IRRF":
        columns.irrf += amount;
        break;
      case "CRF":
        columns.crf += amount;
        break;
      case "GLOSA":
        columns.glosas += amount;
        break;
      case "REPASSE":
        columns.repasses += amount;
        break;
      case "TAXA_ADMIN":
        columns.taxaAdministrativa += amount;
        break;
      case "OUTRO":
      default:
        columns.outros += amount;
        break;
    }
  }

  return columns;
}

function totalDeductionColumns(deductions: DeductionColumns) {
  return Object.values(deductions).reduce((sum, value) => sum + value, 0);
}

function formatCsvNumber(value: number) {
  return (Number.isFinite(value) ? value : 0).toFixed(2);
}

function escapeCsvCell(value: string | number) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
