import { describe, expect, it } from "vitest";
import { calculateMedicalSimplesTaxStrict } from "./simplesTax";

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

  it("classifies the exact 28 percent threshold as Anexo III", () => {
    const result = calculate({ rbt12: 200_000, folha: 56_000 });

    expect(result.fatorR).toBe(0.28);
    expect(result.fatorRBps).toBe(2800);
    expect(result.taxAnnex).toBe("Anexo III");
  });
});
