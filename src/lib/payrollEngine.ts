export const INSS_CEILING = 7_786.02;
export const INSS_RATE_PARTNER = 0.11;
export const IRRF_SIMPLIFIED_DISCOUNT = 564.8;
export const DEPENDENT_DEDUCTION = 189.59;

const CENTS_SCALE = 100;
const RATE_SCALE = 10_000;

export type DeductionStrategy = "standard" | "simplified";

export interface IrrfBracket {
  readonly min: number;
  readonly max: number;
  readonly rate: number;
  readonly deduction: number;
}

interface IrrfBracketCents {
  readonly minCents: number;
  readonly maxCents: number;
  readonly rateBps: number;
  readonly deductionCents: number;
}

export interface ProLaboreResult {
  readonly grossAmount: number;
  readonly dependents: number;
  readonly inssBase: number;
  readonly inssAmount: number;
  readonly standardDeduction: number;
  readonly simplifiedDeduction: number;
  readonly selectedDeduction: number;
  readonly deductionStrategy: DeductionStrategy;
  readonly irrfTaxableBase: number;
  readonly irrfRate: number;
  readonly irrfDeduction: number;
  readonly irrfAmount: number;
  readonly totalWithheld: number;
  readonly netAmount: number;
}

export const IRRF_PROGRESSIVE_TABLE: readonly IrrfBracket[] = Object.freeze([
  Object.freeze({ min: 0, max: 2_259.2, rate: 0, deduction: 0 }),
  Object.freeze({ min: 2_259.21, max: 2_826.65, rate: 0.075, deduction: 169.44 }),
  Object.freeze({ min: 2_826.66, max: 3_751.05, rate: 0.15, deduction: 381.44 }),
  Object.freeze({ min: 3_751.06, max: 4_664.68, rate: 0.225, deduction: 662.77 }),
  Object.freeze({ min: 4_664.69, max: Number.POSITIVE_INFINITY, rate: 0.275, deduction: 896 }),
]);

const IRRF_PROGRESSIVE_TABLE_CENTS: readonly IrrfBracketCents[] = IRRF_PROGRESSIVE_TABLE.map((bracket) => Object.freeze({
  minCents: toCents(bracket.min),
  maxCents: Number.isFinite(bracket.max) ? toCents(bracket.max) : Number.MAX_SAFE_INTEGER,
  rateBps: toBasisPoints(bracket.rate),
  deductionCents: toCents(bracket.deduction),
}));

/**
 * Simulates pró-labore payroll withholdings for a company partner under Brazilian rules.
 *
 * The calculation intentionally keeps all monetary operations in cents and all tax rates
 * in basis points to avoid JavaScript binary floating-point drift. Returned monetary
 * values are converted back to reais with commercial rounding to two decimals.
 */
export function simulateProLabore(grossAmount: number, dependents: number = 0): ProLaboreResult {
  const grossCents = toNonNegativeCents(grossAmount);
  const normalizedDependents = normalizeDependents(dependents);

  /**
   * INSS for a partner's pró-labore is 11% over the gross amount, limited by
   * the official contribution ceiling.
   */
  const inssBaseCents = Math.min(grossCents, toCents(INSS_CEILING));
  const inssAmountCents = applyRate(inssBaseCents, toBasisPoints(INSS_RATE_PARTNER));

  /**
   * IRRF taxable base uses the more beneficial deduction between:
   * standard legal deductions (INSS + dependents) and the simplified discount.
   */
  const dependentDeductionCents = toCents(DEPENDENT_DEDUCTION) * normalizedDependents;
  const standardDeductionCents = inssAmountCents + dependentDeductionCents;
  const simplifiedDeductionCents = toCents(IRRF_SIMPLIFIED_DISCOUNT);
  const selectedDeductionCents = Math.max(standardDeductionCents, simplifiedDeductionCents);
  const deductionStrategy: DeductionStrategy = selectedDeductionCents === standardDeductionCents
    ? "standard"
    : "simplified";

  const taxableBaseCents = Math.max(0, grossCents - selectedDeductionCents);
  const bracket = findIrrfBracket(taxableBaseCents);

  /**
   * IRRF is progressive by bracket: taxable base multiplied by the bracket rate,
   * minus the fixed deductible amount for that bracket. Negative results are floored.
   */
  const grossIrrfCents = applyRate(taxableBaseCents, bracket.rateBps);
  const irrfAmountCents = Math.max(0, grossIrrfCents - bracket.deductionCents);
  const totalWithheldCents = inssAmountCents + irrfAmountCents;
  const netAmountCents = Math.max(0, grossCents - totalWithheldCents);

  return {
    grossAmount: fromCents(grossCents),
    dependents: normalizedDependents,
    inssBase: fromCents(inssBaseCents),
    inssAmount: fromCents(inssAmountCents),
    standardDeduction: fromCents(standardDeductionCents),
    simplifiedDeduction: fromCents(simplifiedDeductionCents),
    selectedDeduction: fromCents(selectedDeductionCents),
    deductionStrategy,
    irrfTaxableBase: fromCents(taxableBaseCents),
    irrfRate: bracket.rateBps / RATE_SCALE,
    irrfDeduction: fromCents(bracket.deductionCents),
    irrfAmount: fromCents(irrfAmountCents),
    totalWithheld: fromCents(totalWithheldCents),
    netAmount: fromCents(netAmountCents),
  };
}

function findIrrfBracket(taxableBaseCents: number): IrrfBracketCents {
  return IRRF_PROGRESSIVE_TABLE_CENTS.find((bracket) => (
    taxableBaseCents >= bracket.minCents && taxableBaseCents <= bracket.maxCents
  )) ?? IRRF_PROGRESSIVE_TABLE_CENTS[IRRF_PROGRESSIVE_TABLE_CENTS.length - 1];
}

function applyRate(amountCents: number, rateBps: number): number {
  return Math.round((amountCents * rateBps) / RATE_SCALE);
}

function normalizeDependents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function toNonNegativeCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, toCents(value));
}

function toCents(value: number): number {
  return Math.round(value * CENTS_SCALE);
}

function fromCents(value: number): number {
  return Math.round(value) / CENTS_SCALE;
}

function toBasisPoints(rate: number): number {
  return Math.round(rate * RATE_SCALE);
}
