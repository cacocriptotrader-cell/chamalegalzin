export type MedicalSimplesTaxAnnex = "Anexo III" | "Anexo V";

export type MedicalSimplesTaxInput = {
  monthlyTaxableRevenue: number;
  rbt12: number;
  accumulatedPayroll: number;
};

export type MedicalSimplesTaxResult = {
  monthlyTaxableRevenue: number;
  rbt12: number;
  accumulatedPayroll: number;
  fatorR: number;
  taxAnnex: MedicalSimplesTaxAnnex;
  effectiveTaxRate: number;
  systemEstimatedAmount: number;
};

export const FATOR_R_THRESHOLD = 0.28;
export const ANEXO_III_START_RATE = 0.06;
export const ANEXO_V_START_RATE = 0.155;

export function calculateMedicalSimplesTax(input: MedicalSimplesTaxInput): MedicalSimplesTaxResult {
  const monthlyTaxableRevenue = positiveNumber(input.monthlyTaxableRevenue);
  const rbt12 = positiveNumber(input.rbt12);
  const accumulatedPayroll = positiveNumber(input.accumulatedPayroll);
  const fatorR = rbt12 > 0 ? accumulatedPayroll / rbt12 : 0;
  const taxAnnex: MedicalSimplesTaxAnnex = fatorR >= FATOR_R_THRESHOLD ? "Anexo III" : "Anexo V";
  const effectiveTaxRate = taxAnnex === "Anexo III" ? ANEXO_III_START_RATE : ANEXO_V_START_RATE;

  return {
    monthlyTaxableRevenue: round2(monthlyTaxableRevenue),
    rbt12: round2(rbt12),
    accumulatedPayroll: round2(accumulatedPayroll),
    fatorR,
    taxAnnex,
    effectiveTaxRate,
    systemEstimatedAmount: round2(monthlyTaxableRevenue * effectiveTaxRate),
  };
}

function positiveNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
