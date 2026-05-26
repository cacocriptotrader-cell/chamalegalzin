import { calculateMedicalSimplesTax, type MedicalSimplesTaxResult } from "@/lib/simplesTax";

export type AccountantTaxCsvClient = {
  id: string;
  name: string;
  email: string;
};

export type AccountantTaxCsvObligation = {
  doctor_id: string;
  reference_month: string;
  system_estimated_amount: number;
  official_amount?: number | null;
  payroll_amount?: number | null;
  rbt12?: number | null;
  fator_r?: number | null;
  tax_annex?: string | null;
  effective_tax_rate?: number | null;
  status?: string | null;
};

export type AccountantTaxCsvShift = {
  id: string;
  user_id: string;
  date: string;
  workplace_id?: string | null;
  workplace_name?: string | null;
  gross: number;
  tax_regime_override?: string | null;
  invoice_issue_date?: string | null;
  invoice_number?: string | null;
  expected_payment_date?: string | null;
  actual_payment_date?: string | null;
};

export type AccountantTaxBaseSnapshot = {
  monthly: number;
  rbt12: number;
};

export type GenerateAccountantTaxCsvInput = {
  referenceMonth: string;
  clients: AccountantTaxCsvClient[];
  obligations: AccountantTaxCsvObligation[];
  shifts: AccountantTaxCsvShift[];
  taxBaseByDoctor: Record<string, AccountantTaxBaseSnapshot>;
  payroll12ExcludingCurrentByDoctor: Record<string, number>;
};

const HEADERS = [
  "Competência Fiscal",
  "Cliente",
  "E-mail do Cliente",
  "ID do Médico",
  "ID do Plantão",
  "Data do Plantão",
  "Data de Emissão da NF",
  "Número da NF",
  "Data Prevista de Recebimento",
  "Data Real de Recebimento",
  "Hospital/Fonte",
  "Regime Fiscal",
  "Valor Bruto do Plantão (R$)",
  "Faturamento Tributável do Mês (PA) (R$)",
  "Pró-labore Declarado (R$)",
  "RBT12 (R$)",
  "Fator R (%)",
  "Enquadramento",
  "Alíquota Efetiva (%)",
  "Imposto Estimado pelo Sistema (R$)",
  "Imposto Devido (R$)",
  "Status da Guia",
];

export function generateAccountantTaxDossierCSV(input: GenerateAccountantTaxCsvInput) {
  const rows = buildRows(input);
  const csv = [
    HEADERS.map(escapeCsvCell).join(";"),
    ...rows.map((row) => row.map(escapeCsvCell).join(";")),
  ].join("\n");

  const [month, year] = input.referenceMonth.split("/");
  return {
    fileName: `docfin-pgdas-d-${year}-${month}.csv`,
    csv: `\uFEFF${csv}`,
    rowCount: rows.length,
  };
}

function buildRows(input: GenerateAccountantTaxCsvInput) {
  const obligationByDoctor = new Map(input.obligations.map((item) => [item.doctor_id, item]));
  const shiftsByDoctor = groupShiftsByDoctor(input.shifts, input.referenceMonth);

  return input.clients.flatMap((client) => {
    const obligation = obligationByDoctor.get(client.id);
    const taxBase = input.taxBaseByDoctor[client.id] ?? { monthly: sumShiftGross(shiftsByDoctor.get(client.id) ?? []), rbt12: 0 };
    const payrollAmount = positiveNumber(obligation?.payroll_amount);
    const taxResult = calculateMedicalSimplesTax({
      monthlyTaxableRevenue: taxBase.monthly,
      rbt12: positiveNumber(obligation?.rbt12) || taxBase.rbt12,
      accumulatedPayroll: (input.payroll12ExcludingCurrentByDoctor[client.id] ?? 0) + payrollAmount,
    });
    const finalTax = positiveNumber(obligation?.official_amount) || taxResult.systemEstimatedAmount;
    const clientShifts = shiftsByDoctor.get(client.id) ?? [];

    if (clientShifts.length === 0) {
      return [makeRow({
        client,
        obligation,
        shift: null,
        referenceMonth: input.referenceMonth,
        taxBase,
        payrollAmount,
        taxResult,
        finalTax,
      })];
    }

    return clientShifts.map((shift) => makeRow({
      client,
      obligation,
      shift,
      referenceMonth: input.referenceMonth,
      taxBase,
      payrollAmount,
      taxResult,
      finalTax,
    }));
  });
}

function makeRow({
  client,
  obligation,
  shift,
  referenceMonth,
  taxBase,
  payrollAmount,
  taxResult,
  finalTax,
}: {
  client: AccountantTaxCsvClient;
  obligation?: AccountantTaxCsvObligation;
  shift: AccountantTaxCsvShift | null;
  referenceMonth: string;
  taxBase: AccountantTaxBaseSnapshot;
  payrollAmount: number;
  taxResult: MedicalSimplesTaxResult;
  finalTax: number;
}) {
  return [
    referenceMonth,
    client.name,
    client.email,
    client.id,
    shift?.id ?? "",
    shift?.date ?? "",
    shift?.invoice_issue_date ?? "",
    shift?.invoice_number ?? "",
    shift?.expected_payment_date ?? "",
    shift?.actual_payment_date ?? "",
    shift?.workplace_name ?? shift?.workplace_id ?? "",
    shift?.tax_regime_override ?? "",
    formatAccountingNumber(shift?.gross ?? 0),
    formatAccountingNumber(taxBase.monthly),
    formatAccountingNumber(payrollAmount),
    formatAccountingNumber(taxResult.rbt12),
    formatAccountingNumber(taxResult.fatorR * 100),
    taxResult.taxAnnex,
    formatAccountingNumber(taxResult.effectiveTaxRate * 100),
    formatAccountingNumber(taxResult.systemEstimatedAmount),
    formatAccountingNumber(finalTax),
    obligation?.status ?? "SEM_GUIA",
  ];
}

function groupShiftsByDoctor(shifts: AccountantTaxCsvShift[], referenceMonth: string) {
  return shifts.reduce<Map<string, AccountantTaxCsvShift[]>>((acc, shift) => {
    if (!shift.invoice_issue_date || !isInReferenceMonth(shift.invoice_issue_date, referenceMonth)) return acc;
    if (shift.tax_regime_override !== "PJ_SIMPLES" && shift.tax_regime_override !== "PJ_LUCRO_PRESUMIDO") return acc;
    const current = acc.get(shift.user_id) ?? [];
    current.push(shift);
    acc.set(shift.user_id, current);
    return acc;
  }, new Map());
}

function sumShiftGross(shifts: AccountantTaxCsvShift[]) {
  return round2(shifts.reduce((sum, shift) => sum + positiveNumber(shift.gross), 0));
}

function isInReferenceMonth(isoDate: string, referenceMonth: string) {
  const [month, year] = referenceMonth.split("/").map(Number);
  const date = new Date(`${isoDate}T12:00:00`);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

function formatAccountingNumber(value: number) {
  return round2(Number.isFinite(value) ? value : 0).toFixed(2).replace(".", ",");
}

function escapeCsvCell(value: string | number) {
  const text = String(value ?? "");
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function positiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
