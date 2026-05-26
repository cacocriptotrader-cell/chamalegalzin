import { describe, expect, it } from "vitest";
import { calculateMedicalSimplesTaxStrict, isSimplesTaxableShift } from "./simplesTax";

function calculate(input: { rbt12: number; folha: number; monthlyRevenue?: number }) {
  return calculateMedicalSimplesTaxStrict({
    monthlyTaxableRevenue: input.monthlyRevenue ?? 10_000,
    rbt12: input.rbt12,
    accumulatedPayroll: input.folha,
  });
}

describe("calculateMedicalSimplesTaxStrict", () => {
  it("treats zero revenue and zero payroll as Fator R 0.01", () => {
    const result = calculate({ rbt12: 0, folha: 0 });

    expect(result.fatorR).toBe(0.01);
    expect(result.fatorRBps).toBe(100);
    expect(result.taxAnnex).toBe("Anexo V");
  });

  it("falls back to Anexo V when there is revenue but no payroll", () => {
    const result = calculate({ rbt12: 100_000, folha: 0 });

    expect(result.fatorR).toBe(0.01);
    expect(result.fatorRBps).toBe(100);
    expect(result.taxAnnex).toBe("Anexo V");
  });

  it("safely classifies as Anexo III when there is payroll but no revenue", () => {
    const result = calculate({ rbt12: 0, folha: 1_000 });

    expect(result.fatorR).toBe(0.28);
    expect(result.fatorRBps).toBe(2800);
    expect(result.taxAnnex).toBe("Anexo III");
  });

  it("does not round up a Fator R just below 28 percent", () => {
    const result = calculate({ rbt12: 200_000, folha: 55_999.99 });

    expect(result.fatorR).toBe(0.2799);
    expect(result.fatorRBps).toBe(2799);
    expect(result.taxAnnex).toBe("Anexo V");
  });

  it("locks the 27.9999 percent Fator R threshold in Anexo V", () => {
    const result = calculateMedicalSimplesTaxStrict({
      monthlyTaxableRevenue: 10_000,
      rbt12: 200_000,
      accumulatedPayroll: 55_999.99,
    });

    expect(result.fatorRBps).toBe(2799);
    expect(result.taxAnnex).toBe("Anexo V");
  });

  it("classifies the exact 28 percent threshold as Anexo III", () => {
    const result = calculate({ rbt12: 200_000, folha: 56_000 });

    expect(result.fatorR).toBe(0.28);
    expect(result.fatorRBps).toBe(2800);
    expect(result.taxAnnex).toBe("Anexo III");
  });

  it("splits the DAS into components without losing or creating cents", () => {
    const result = calculate({ rbt12: 200_000, folha: 56_000, monthlyRevenue: 5_800 });
    const totalBreakdownCents = Object.values(result.taxBreakdown).reduce((sum, item) => sum + item.amountCents, 0);

    expect(totalBreakdownCents).toBe(Math.round(result.systemEstimatedAmount * 100));
    expect(result.taxBreakdown.irpj.label).toBe("IRPJ");
    expect(result.taxBreakdown.csll.label).toBe("CSLL");
    expect(result.taxBreakdown.cofins.label).toBe("Cofins");
    expect(result.taxBreakdown.pisPasep.label).toBe("PIS/Pasep");
    expect(result.taxBreakdown.cpp.label).toBe("CPP");
    expect(result.taxBreakdown.iss.label).toBe("ISS");
  });

  it("calculates progressive tax without truncating to the displayed effective rate first", () => {
    const result = calculate({ rbt12: 200_000, folha: 56_000, monthlyRevenue: 10_000 });

    expect(result.taxAnnex).toBe("Anexo III");
    expect(result.systemEstimatedAmount).toBe(652);
    expect(result.systemEstimatedAmount).toBeGreaterThan(600);
  });

  it("isolates the Simples Nacional taxable pipeline to PJ_SIMPLES only", () => {
    expect(isSimplesTaxableShift("PJ_SIMPLES")).toBe(true);
    expect(isSimplesTaxableShift("PJ_LUCRO_PRESUMIDO")).toBe(false);
    expect(isSimplesTaxableShift("CLT")).toBe(false);
    expect(isSimplesTaxableShift("SCP")).toBe(false);
    expect(isSimplesTaxableShift(null)).toBe(false);
  });

  it("caps ISS at 5 percent in Anexo III faixa 5 and preserves the total DAS", () => {
    const result = calculate({ rbt12: 3_000_000, folha: 840_000, monthlyRevenue: 10_000 });
    const totalBreakdownCents = Object.values(result.taxBreakdown).reduce((sum, item) => sum + item.amountCents, 0);

    expect(result.taxAnnex).toBe("Anexo III");
    expect(result.systemEstimatedAmount).toBe(1681.2);
    expect(result.taxBreakdown.iss.amountCents).toBe(50000);
    expect(totalBreakdownCents).toBe(Math.round(result.systemEstimatedAmount * 100));
  });
});
