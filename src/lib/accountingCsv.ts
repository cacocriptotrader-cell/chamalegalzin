import {
  computeShift,
  getShiftRegime,
  isConsolidatedRecord,
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
  "Deduções/Ajustes (settlementAdjustment)",
  "Valor Líquido",
  "Categoria (Plantão/Cirurgia)",
];

type AccountingCsvRow = {
  id: string;
  competence: string;
  eventDate: string;
  expectedPaymentDate: string;
  source: string;
  regime: TaxRegime | "SCP";
  gross: number;
  adjustment: number;
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
      formatCsvNumber(row.adjustment),
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
      adjustment: Math.max(0, shift.settlementAdjustment || 0),
      net: math.net,
      category: "Plantão",
    });
  }

  for (const surgery of store.surgeries) {
    if (!isConsolidatedRecord(surgery)) continue;
    if (!inMonth(surgery.date)) continue;

    if (surgery.myRole === "TITULAR") {
      const workplace = store.workplaces.find((item) => item.id === surgery.hospitalId);
      rows.push({
        id: `surgery-${surgery.id}`,
        competence,
        eventDate: surgery.date,
        expectedPaymentDate: surgery.date,
        source: workplace?.name ?? "Hospital não cadastrado",
        regime: workplace?.regime ?? "PJ_SIMPLES",
        gross: surgery.totalGross || 0,
        adjustment: 0,
        net: surgery.totalGross || 0,
        category: "Cirurgia",
      });
      continue;
    }

    rows.push({
      id: `surgery-${surgery.id}`,
      competence,
      eventDate: surgery.date,
      expectedPaymentDate: surgery.date,
      source: `SCP — ${surgery.payingSurgeonName}`,
      regime: "SCP",
      gross: surgery.myExpectedShare || 0,
      adjustment: 0,
      net: surgery.myExpectedShare || 0,
      category: "Cirurgia",
    });
  }

  return rows.sort((a, b) => {
    if (a.eventDate !== b.eventDate) return a.eventDate.localeCompare(b.eventDate);
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.id.localeCompare(b.id);
  });
}

function formatCsvNumber(value: number) {
  return (Number.isFinite(value) ? value : 0).toFixed(2);
}

function escapeCsvCell(value: string | number) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
