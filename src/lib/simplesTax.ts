export type MedicalSimplesTaxAnnex = "Anexo III" | "Anexo V";

export type SimplesBracket = {
  maxRbt12Cents: number;
  nominalRateBps: number;
  deductionCents: number;
};

export type MonthlyRevenueForSimples = {
  month: string;
  revenue: number;
};

export type Rbt12ForSimplesInput = {
  referenceMonth: string;
  monthlyRevenues: MonthlyRevenueForSimples[];
  companyStartDate?: string | null;
};

export type MedicalSimplesTaxInput = {
  monthlyTaxableRevenue: number;
  rbt12: number;
  accumulatedPayroll: number;
  companyStartDate?: string | null;
};

export type MedicalSimplesTaxResult = {
  monthlyTaxableRevenue: number;
  rbt12: number;
  accumulatedPayroll: number;
  fatorR: number;
  fatorRBps: number;
  taxAnnex: MedicalSimplesTaxAnnex;
  effectiveTaxRate: number;
  effectiveTaxRateBps: number;
  nominalTaxRate: number;
  nominalTaxRateBps: number;
  deductionAmount: number;
  systemEstimatedAmount: number;
};

export const FATOR_R_THRESHOLD_BPS = 2800;
export const FATOR_R_THRESHOLD = FATOR_R_THRESHOLD_BPS / 10_000;

export const ANEXO_III_BRACKETS: SimplesBracket[] = [
  { maxRbt12Cents: reaisToCents(180_000), nominalRateBps: 600, deductionCents: reaisToCents(0) },
  { maxRbt12Cents: reaisToCents(360_000), nominalRateBps: 1120, deductionCents: reaisToCents(9_360) },
  { maxRbt12Cents: reaisToCents(720_000), nominalRateBps: 1350, deductionCents: reaisToCents(17_640) },
  { maxRbt12Cents: reaisToCents(1_800_000), nominalRateBps: 1600, deductionCents: reaisToCents(35_640) },
  { maxRbt12Cents: reaisToCents(3_600_000), nominalRateBps: 2100, deductionCents: reaisToCents(125_640) },
  { maxRbt12Cents: reaisToCents(4_800_000), nominalRateBps: 3300, deductionCents: reaisToCents(648_000) },
];

export const ANEXO_V_BRACKETS: SimplesBracket[] = [
  { maxRbt12Cents: reaisToCents(180_000), nominalRateBps: 1550, deductionCents: reaisToCents(0) },
  { maxRbt12Cents: reaisToCents(360_000), nominalRateBps: 1800, deductionCents: reaisToCents(4_500) },
  { maxRbt12Cents: reaisToCents(720_000), nominalRateBps: 1950, deductionCents: reaisToCents(9_900) },
  { maxRbt12Cents: reaisToCents(1_800_000), nominalRateBps: 2050, deductionCents: reaisToCents(17_100) },
  { maxRbt12Cents: reaisToCents(3_600_000), nominalRateBps: 2300, deductionCents: reaisToCents(62_100) },
  { maxRbt12Cents: reaisToCents(4_800_000), nominalRateBps: 3050, deductionCents: reaisToCents(540_000) },
];

export function calculateMedicalSimplesTaxStrict(input: MedicalSimplesTaxInput): MedicalSimplesTaxResult {
  const monthlyTaxableRevenueCents = toPositiveCents(input.monthlyTaxableRevenue);
  const rbt12Cents = toPositiveCents(input.rbt12);
  const accumulatedPayrollCents = toPositiveCents(input.accumulatedPayroll);
  const fatorRBps = calculateFatorRBps(accumulatedPayrollCents, rbt12Cents);
  const taxAnnex: MedicalSimplesTaxAnnex = fatorRBps >= FATOR_R_THRESHOLD_BPS ? "Anexo III" : "Anexo V";
  const bracket = findBracket(rbt12Cents, taxAnnex === "Anexo III" ? ANEXO_III_BRACKETS : ANEXO_V_BRACKETS);
  const effectiveTaxRateBps = calculateEffectiveRateBps(rbt12Cents, bracket);
  const estimatedTaxCents = Math.round((monthlyTaxableRevenueCents * effectiveTaxRateBps) / 10_000);

  return {
    monthlyTaxableRevenue: centsToReais(monthlyTaxableRevenueCents),
    rbt12: centsToReais(rbt12Cents),
    accumulatedPayroll: centsToReais(accumulatedPayrollCents),
    fatorR: fatorRBps / 10_000,
    fatorRBps,
    taxAnnex,
    effectiveTaxRate: effectiveTaxRateBps / 10_000,
    effectiveTaxRateBps,
    nominalTaxRate: bracket.nominalRateBps / 10_000,
    nominalTaxRateBps: bracket.nominalRateBps,
    deductionAmount: centsToReais(bracket.deductionCents),
    systemEstimatedAmount: centsToReais(estimatedTaxCents),
  };
}

export const calculateMedicalSimplesTax = calculateMedicalSimplesTaxStrict;

export function calculateRbt12ForSimples(input: Rbt12ForSimplesInput): number {
  const referenceDate = parseReferenceMonth(input.referenceMonth);
  const companyStartDate = parseIsoDate(input.companyStartDate);
  const sortedRevenues = input.monthlyRevenues
    .map((item) => ({ monthDate: parseReferenceMonth(item.month), revenueCents: toPositiveCents(item.revenue) }))
    .filter((item) => item.monthDate.getTime() <= referenceDate.getTime());

  if (!companyStartDate) {
    return centsToReais(sumRevenueWindowBeforeReference(sortedRevenues, referenceDate, 12));
  }

  const monthsSinceStart = Math.max(1, monthDistance(
    new Date(companyStartDate.getFullYear(), companyStartDate.getMonth(), 1),
    referenceDate,
  ) + 1);

  if (monthsSinceStart <= 1) {
    return centsToReais(sumRevenueForMonth(sortedRevenues, referenceDate) * 12);
  }

  if (monthsSinceStart < 13) {
    const previousRevenueCents = sumRevenueWindowBeforeReference(sortedRevenues, referenceDate, monthsSinceStart - 1);
    return centsToReais(Math.round((previousRevenueCents / (monthsSinceStart - 1)) * 12));
  }

  return centsToReais(sumRevenueWindowBeforeReference(sortedRevenues, referenceDate, 12));
}

function findBracket(rbt12Cents: number, brackets: SimplesBracket[]) {
  return brackets.find((bracket) => rbt12Cents <= bracket.maxRbt12Cents) ?? brackets[brackets.length - 1];
}

function calculateEffectiveRateBps(rbt12Cents: number, bracket: SimplesBracket) {
  if (rbt12Cents <= 0) return 0;
  const nominalTaxCents = Math.floor((rbt12Cents * bracket.nominalRateBps) / 10_000);
  const taxAfterDeductionCents = Math.max(0, nominalTaxCents - bracket.deductionCents);
  return Math.floor((taxAfterDeductionCents * 10_000) / rbt12Cents);
}

function calculateFatorRBps(payrollCents: number, rbt12Cents: number) {
  if (payrollCents <= 0 && rbt12Cents <= 0) return 100;
  if (payrollCents <= 0 && rbt12Cents > 0) return 100;
  if (payrollCents > 0 && rbt12Cents <= 0) return FATOR_R_THRESHOLD_BPS;
  return Math.floor((payrollCents * 10_000) / rbt12Cents);
}

function sumRevenueWindowIncludingReference(revenues: Array<{ monthDate: Date; revenueCents: number }>, referenceDate: Date, months: number) {
  const startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - months + 1, 1);
  return revenues.reduce((total, item) => {
    if (item.monthDate.getTime() < startDate.getTime() || item.monthDate.getTime() > referenceDate.getTime()) {
      return total;
    }
    return total + item.revenueCents;
  }, 0);
}

function sumRevenueWindowBeforeReference(revenues: Array<{ monthDate: Date; revenueCents: number }>, referenceDate: Date, months: number) {
  const previousMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  return sumRevenueWindowIncludingReference(revenues, previousMonth, months);
}

function sumRevenueForMonth(revenues: Array<{ monthDate: Date; revenueCents: number }>, referenceDate: Date) {
  return revenues.reduce((total, item) => {
    if (item.monthDate.getFullYear() !== referenceDate.getFullYear() || item.monthDate.getMonth() !== referenceDate.getMonth()) {
      return total;
    }
    return total + item.revenueCents;
  }, 0);
}

function parseReferenceMonth(referenceMonth: string) {
  const [month, year] = referenceMonth.split("/").map(Number);
  if (!Number.isFinite(month) || !Number.isFinite(year)) return new Date();
  return new Date(year, month - 1, 1);
}

function parseIsoDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthDistance(start: Date, end: Date) {
  return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
}

function toPositiveCents(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 100));
}

function reaisToCents(value: number) {
  return Math.round(value * 100);
}

function centsToReais(value: number) {
  return Math.round(value) / 100;
}
