export type MedicalSimplesTaxAnnex = "Anexo III" | "Anexo V";

export type TaxComponentKey = "irpj" | "csll" | "cofins" | "pisPasep" | "cpp" | "iss";

export type TaxComponentAllocationBps = Record<TaxComponentKey, number>;

export type TaxBreakdownItem = {
  key: TaxComponentKey;
  label: string;
  percentage: number;
  allocationBps: number;
  amount: number;
  amountCents: number;
};

export type TaxBreakdown = Record<TaxComponentKey, TaxBreakdownItem>;

export type SimplesBracket = {
  maxRbt12Cents: number;
  nominalRateBps: number;
  deductionCents: number;
  componentAllocationBps: TaxComponentAllocationBps;
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
  taxBreakdown: TaxBreakdown;
};

export const FATOR_R_THRESHOLD_BPS = 2800;
export const FATOR_R_THRESHOLD = FATOR_R_THRESHOLD_BPS / 10_000;
const ISS_EFFECTIVE_RATE_CAP_BPS = 500;
const ANEXO_III_FAIXA_5_FEDERAL_ALLOCATION_BPS = allocationBps({
  irpj: 602,
  csll: 526,
  cofins: 1928,
  pisPasep: 418,
  cpp: 6526,
  iss: 0,
});

export const ANEXO_III_BRACKETS: SimplesBracket[] = [
  {
    maxRbt12Cents: reaisToCents(180_000),
    nominalRateBps: 600,
    deductionCents: reaisToCents(0),
    componentAllocationBps: allocationBps({ irpj: 400, csll: 350, cofins: 1282, pisPasep: 278, cpp: 4340, iss: 3350 }),
  },
  {
    maxRbt12Cents: reaisToCents(360_000),
    nominalRateBps: 1120,
    deductionCents: reaisToCents(9_360),
    componentAllocationBps: allocationBps({ irpj: 400, csll: 350, cofins: 1405, pisPasep: 305, cpp: 4340, iss: 3200 }),
  },
  {
    maxRbt12Cents: reaisToCents(720_000),
    nominalRateBps: 1350,
    deductionCents: reaisToCents(17_640),
    componentAllocationBps: allocationBps({ irpj: 400, csll: 350, cofins: 1364, pisPasep: 296, cpp: 4340, iss: 3250 }),
  },
  {
    maxRbt12Cents: reaisToCents(1_800_000),
    nominalRateBps: 1600,
    deductionCents: reaisToCents(35_640),
    componentAllocationBps: allocationBps({ irpj: 400, csll: 350, cofins: 1364, pisPasep: 296, cpp: 4340, iss: 3250 }),
  },
  {
    maxRbt12Cents: reaisToCents(3_600_000),
    nominalRateBps: 2100,
    deductionCents: reaisToCents(125_640),
    componentAllocationBps: allocationBps({ irpj: 400, csll: 350, cofins: 1282, pisPasep: 278, cpp: 4340, iss: 3350 }),
  },
  {
    maxRbt12Cents: reaisToCents(4_800_000),
    nominalRateBps: 3300,
    deductionCents: reaisToCents(648_000),
    componentAllocationBps: allocationBps({ irpj: 3500, csll: 1500, cofins: 1603, pisPasep: 347, cpp: 3050, iss: 0 }),
  },
];

export const ANEXO_V_BRACKETS: SimplesBracket[] = [
  {
    maxRbt12Cents: reaisToCents(180_000),
    nominalRateBps: 1550,
    deductionCents: reaisToCents(0),
    componentAllocationBps: allocationBps({ irpj: 2500, csll: 1500, cofins: 1410, pisPasep: 305, cpp: 2885, iss: 1400 }),
  },
  {
    maxRbt12Cents: reaisToCents(360_000),
    nominalRateBps: 1800,
    deductionCents: reaisToCents(4_500),
    componentAllocationBps: allocationBps({ irpj: 2300, csll: 1500, cofins: 1410, pisPasep: 305, cpp: 2785, iss: 1700 }),
  },
  {
    maxRbt12Cents: reaisToCents(720_000),
    nominalRateBps: 1950,
    deductionCents: reaisToCents(9_900),
    componentAllocationBps: allocationBps({ irpj: 2400, csll: 1500, cofins: 1492, pisPasep: 323, cpp: 2385, iss: 1900 }),
  },
  {
    maxRbt12Cents: reaisToCents(1_800_000),
    nominalRateBps: 2050,
    deductionCents: reaisToCents(17_100),
    componentAllocationBps: allocationBps({ irpj: 2100, csll: 1500, cofins: 1574, pisPasep: 341, cpp: 2385, iss: 2100 }),
  },
  {
    maxRbt12Cents: reaisToCents(3_600_000),
    nominalRateBps: 2300,
    deductionCents: reaisToCents(62_100),
    componentAllocationBps: allocationBps({ irpj: 2300, csll: 1250, cofins: 1410, pisPasep: 305, cpp: 2385, iss: 2350 }),
  },
  {
    maxRbt12Cents: reaisToCents(4_800_000),
    nominalRateBps: 3050,
    deductionCents: reaisToCents(540_000),
    componentAllocationBps: allocationBps({ irpj: 3500, csll: 1550, cofins: 1644, pisPasep: 356, cpp: 2950, iss: 0 }),
  },
];

export function isSimplesTaxableShift(regime?: string | null) {
  return regime === "PJ_SIMPLES";
}

export function calculateMedicalSimplesTaxStrict(input: MedicalSimplesTaxInput): MedicalSimplesTaxResult {
  const monthlyTaxableRevenueCents = toPositiveCents(input.monthlyTaxableRevenue);
  const rbt12Cents = toPositiveCents(input.rbt12);
  const accumulatedPayrollCents = toPositiveCents(input.accumulatedPayroll);
  const fatorRBps = calculateFatorRBps(accumulatedPayrollCents, rbt12Cents);
  const taxAnnex: MedicalSimplesTaxAnnex = fatorRBps >= FATOR_R_THRESHOLD_BPS ? "Anexo III" : "Anexo V";
  const bracket = findBracket(rbt12Cents, taxAnnex === "Anexo III" ? ANEXO_III_BRACKETS : ANEXO_V_BRACKETS);
  const effectiveTaxRateBps = calculateEffectiveRateDisplayBps(rbt12Cents, bracket);
  const estimatedTaxCents = calculateEffectiveTaxCents(monthlyTaxableRevenueCents, rbt12Cents, bracket);
  const taxBreakdown = calculateTaxBreakdown(estimatedTaxCents, bracket.componentAllocationBps, {
    applyAnexoIIIFaixa5IssCap: taxAnnex === "Anexo III" && bracket === ANEXO_III_BRACKETS[4],
    monthlyTaxableRevenueCents,
  });

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
    taxBreakdown,
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

const TAX_COMPONENTS: Array<{ key: TaxComponentKey; label: string }> = [
  { key: "irpj", label: "IRPJ" },
  { key: "csll", label: "CSLL" },
  { key: "cofins", label: "Cofins" },
  { key: "pisPasep", label: "PIS/Pasep" },
  { key: "cpp", label: "CPP" },
  { key: "iss", label: "ISS" },
];

function allocationBps(allocation: TaxComponentAllocationBps): TaxComponentAllocationBps {
  const totalBps = Object.values(allocation).reduce((sum, value) => sum + value, 0);
  if (totalBps !== 10_000) {
    throw new Error(`Partilha do Simples Nacional inválida: ${totalBps} bps`);
  }
  return allocation;
}

function calculateTaxBreakdown(
  totalTaxCents: number,
  allocation: TaxComponentAllocationBps,
  options?: {
    applyAnexoIIIFaixa5IssCap?: boolean;
    monthlyTaxableRevenueCents?: number;
  },
): TaxBreakdown {
  if (options?.applyAnexoIIIFaixa5IssCap && (options.monthlyTaxableRevenueCents ?? 0) > 0) {
    const monthlyTaxableRevenueCents = options.monthlyTaxableRevenueCents ?? 0;
    const uncappedIssCents = Math.round((totalTaxCents * allocation.iss) / 10_000);
    const issCapCents = Math.round((monthlyTaxableRevenueCents * ISS_EFFECTIVE_RATE_CAP_BPS) / 10_000);

    if (uncappedIssCents > issCapCents) {
      const federalBreakdown = allocateTaxCents(
        Math.max(0, totalTaxCents - issCapCents),
        ANEXO_III_FAIXA_5_FEDERAL_ALLOCATION_BPS,
      );
      return {
        ...federalBreakdown,
        iss: {
          key: "iss",
          label: "ISS",
          percentage: ISS_EFFECTIVE_RATE_CAP_BPS / 100,
          allocationBps: ISS_EFFECTIVE_RATE_CAP_BPS,
          amount: centsToReais(issCapCents),
          amountCents: issCapCents,
        },
      };
    }
  }

  return allocateTaxCents(totalTaxCents, allocation);
}

function allocateTaxCents(totalTaxCents: number, allocation: TaxComponentAllocationBps): TaxBreakdown {
  const baseParts = TAX_COMPONENTS.map((component, index) => {
    const numerator = totalTaxCents * allocation[component.key];
    return {
      ...component,
      index,
      floorCents: Math.floor(numerator / 10_000),
      remainder: numerator % 10_000,
    };
  });

  const floorTotalCents = baseParts.reduce((sum, part) => sum + part.floorCents, 0);
  const centsToDistribute = Math.max(0, totalTaxCents - floorTotalCents);
  const orderedByRemainder = [...baseParts].sort((first, second) => {
    if (second.remainder !== first.remainder) return second.remainder - first.remainder;
    return first.index - second.index;
  });
  const increments = new Set(orderedByRemainder.slice(0, centsToDistribute).map((part) => part.key));

  return baseParts.reduce((breakdown, part) => {
    const amountCents = part.floorCents + (increments.has(part.key) ? 1 : 0);
    breakdown[part.key] = {
      key: part.key,
      label: part.label,
      percentage: allocation[part.key] / 100,
      allocationBps: allocation[part.key],
      amount: centsToReais(amountCents),
      amountCents,
    };
    return breakdown;
  }, {} as TaxBreakdown);
}

function calculateEffectiveTaxCents(
  monthlyTaxableRevenueCents: number,
  rbt12Cents: number,
  bracket: SimplesBracket,
) {
  if (monthlyTaxableRevenueCents <= 0 || rbt12Cents <= 0) return 0;
  const annualTaxNumerator = (rbt12Cents * bracket.nominalRateBps) - (bracket.deductionCents * 10_000);
  const safeAnnualTaxNumerator = Math.max(0, annualTaxNumerator);
  return Math.round((monthlyTaxableRevenueCents * safeAnnualTaxNumerator) / (rbt12Cents * 10_000));
}

function calculateEffectiveRateDisplayBps(rbt12Cents: number, bracket: SimplesBracket) {
  if (rbt12Cents <= 0) return 0;
  const annualTaxNumerator = (rbt12Cents * bracket.nominalRateBps) - (bracket.deductionCents * 10_000);
  return Math.max(0, annualTaxNumerator / rbt12Cents);
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
