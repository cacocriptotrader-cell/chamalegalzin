import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { addDays, addMonths, lastDayOfMonth, setDate, parseISO, startOfDay } from "date-fns";

// ============== Types ==============
export type TaxRegime =
  | "PF"
  | "PJ_SIMPLES"
  | "PJ_LUCRO_PRESUMIDO"
  | "CLT"
  | "RPA"
  | "PARTICULAR_PIX"
  | "SCP";
export type PaymentRule = string;

export const TAX_LABELS: Record<TaxRegime, string> = {
  PF: "PF (RPA) — IRPF progressivo",
  PJ_SIMPLES: "PJ (Simples Nacional)",
  PJ_LUCRO_PRESUMIDO: "PJ Lucro Presumido — 16,33%",
  CLT: "CLT",
  RPA: "RPA / Autônomo",
  PARTICULAR_PIX: "Particular (Pix)",
  SCP: "Sociedade (SCP)",
};

// PAYMENT_RULE_LABELS is deprecated as PaymentRule is now a free text field.
// Keeping it as a reference for existing data if needed, but it's no longer used for UI selection.
export const PAYMENT_RULE_LABELS: Record<string, string> = {
  FIFTH_BUSINESS_DAY: "5º dia útil do mês seguinte",
  TENTH_DAY: "Dia 10 do mês seguinte",
  FIFTEENTH_DAY: "Dia 15 do mês seguinte",
  END_OF_MONTH: "Último dia do mês",
  NEXT_MONTH_FIFTH: "Dia 5 do mês seguinte",
  INSTANT_D0: "Particular / Pix (D+0, mesmo dia)",
};

export const TAX_RATE: Record<TaxRegime, number> = {
  PF: 0,
  PJ_SIMPLES: 0.06,
  PJ_LUCRO_PRESUMIDO: 0.1633,
  CLT: 0,
  RPA: 0,
  PARTICULAR_PIX: 0,
  SCP: 0,
};

export const SIMPLES_ANEXO_III_RATE = 0.06;
export const SIMPLES_ANEXO_V_RATE = 0.155;
export const RPA_INSS_RATE = 0.11;
export const PROLABORE_INSS_RATE = 0.11;

export interface Workplace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  regime: TaxRegime;
  hourlyRate: number;
  paymentRule: PaymentRule;
  /** Dia do mês (1-31) que fecha a folha de plantões. */
  cutOffDay: number;
  /** Dia do mês (1-31) em que o hospital efetivamente paga. */
  paymentDay: number;
  /** Prazo (em dias) entre o envio da nota e o pagamento efetivo. */
  paymentTermDays: number;
}

export type ShiftStatus = "CONFIRMADO" | "REPASSADO" | "BUSCANDO_SUBSTITUTO";

export interface Shift {
  id: string;
  date: string; // YYYY-MM-DD
  workplaceId: string;
  originId: string; // "home" or workplaceId
  hours: number;
  gross: number;
  extraCost: number;
  commuteHours?: number; // hours of round trip (default 1.5)
  status?: ShiftStatus;       // default CONFIRMADO
  coveredBy?: string;         // nome do colega que pegou o plantão
  /** Calculado automaticamente a partir do ciclo do hospital (YYYY-MM-DD). */
  expectedPaymentDate?: string;
  projectedNet?: number;
  projectedPaymentDate?: string;
}

// ============== Surgery Ledger ==============
export type SurgeryRole = "TITULAR" | "MEMBRO_EQUIPE";
export type InvoiceMode = "SINGLE" | "FRACTIONED"; // Nota única vs fracionada

export interface TeamMember {
  id: string;
  name: string;
  role: string;        // ex: "Auxiliar", "Anestesista", "Instrumentador"
  amountDue: number;   // valor devido a esse membro
  isPaid: boolean;
}

interface SurgeryBase {
  id: string;
  date: string;        // YYYY-MM-DD
  procedure?: string;
  notes?: string;
}

export interface SurgeryTitular extends SurgeryBase {
  myRole: "TITULAR";
  hospitalId: string;          // workplaceId pagador
  totalGross: number;          // valor cheio recebido do hospital
  invoiceMode: InvoiceMode;
  teamSplit: TeamMember[];
  receivedFromHospital: boolean;
}

export interface SurgeryMembro extends SurgeryBase {
  myRole: "MEMBRO_EQUIPE";
  payingSurgeonName: string;   // colega que deve pagar
  myExpectedShare: number;     // valor a receber
  isReceived: boolean;
}

export type SurgeryRecord = SurgeryTitular | SurgeryMembro;

export interface FixedCost { id: string; label: string; monthly: number; }
export interface FixedIncome { id: string; label: string; grossMonthly: number; netMonthly?: number; }
export interface ProLabore { id: string; label: string; monthly: number; } // pró-labore mensal de PJ
export interface Debt { id: string; label: string; balance: number; annualRate: number; monthlyPayment: number; }
export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  saved: number;
  coverImage?: string; // base64 encoded image
}

export interface WeddingGoal { enabled: boolean; targetAmount: number; targetDate: string; saved: number; }

// Metas gerais (pode ter múltiplas)
export type GoalCategory = "Casamento" | "Viagem" | "Imóvel" | "Carro" | "Educação" | "Outro";
export interface GeneralGoal {
  id: string;
  name: string;
  category: GoalCategory;
  targetAmount: number;
  targetDate: string;
  saved: number;
  coverImage?: string; // base64 encoded image
}

export type AssetCategory = "Imóvel" | "Veículo" | "Renda Fixa" | "Renda Variável" | "Consórcio" | "Cripto";
export type CryptoTicker = "USDT" | "USDC" | "BTC" | "ETH" | "SOL" | "OUTRO";
export const USD_PEGGED_TICKERS: CryptoTicker[] = ["USDT", "USDC"];
export interface Asset {
  id: string;
  category: AssetCategory;
  description: string;
  currentValue: number;
  ticker?: CryptoTicker;     // apenas para Cripto
  yieldAPY?: number;         // % a.a. (yield em DeFi/CeFi)
}

export type LiabilityCategory =
  | "Financiamento Imobiliário"
  | "Financiamento Veículo"
  | "Empréstimo"
  | "Consórcio";
export interface Liability {
  id: string;
  category: LiabilityCategory;
  description: string;
  totalAmount: number;
  remainingBalance: number;
  interestRate: number; // % ao ano
}

export type DocumentKind = "CRM" | "CERT_DIGITAL" | "MALPRACTICE" | "ACLS_BLS" | "OUTRO";
export interface ComplianceDoc {
  id: string;
  kind: DocumentKind;
  label: string;
  expiresAt: string; // YYYY-MM-DD
  renewalCost?: number;
}
export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  CRM: "CRM (Anuidade)",
  CERT_DIGITAL: "Certificado Digital",
  MALPRACTICE: "Seguro Resp. Civil",
  ACLS_BLS: "ACLS / BLS",
  OUTRO: "Outro",
};
// Documents that should auto-suggest themselves into Custos Fixos (monthly = annual cost / 12)
export const DOC_KIND_TO_FIXED_COST: Partial<Record<DocumentKind, { label: string; defaultAnnual: number }>> = {
  CRM: { label: "Anuidade CRM", defaultAnnual: 900 },
  CERT_DIGITAL: { label: "Certificado Digital", defaultAnnual: 280 },
};

// INSS — teto contributivo exigido pela regra de negócio do produto para 2026.
export const INSS_CEILING = 8157.41;

export const INSS_BRACKETS = [
  { upTo: 1518.00, rate: 0.075 },
  { upTo: 2793.88, rate: 0.09 },
  { upTo: 4190.83, rate: 0.12 },
  { upTo: INSS_CEILING, rate: 0.14 },
] as const;

export const IRPF_2026_BRACKETS = [
  { upTo: 2428.80, rate: 0, deduction: 0 },
  { upTo: 2826.65, rate: 0.075, deduction: 182.16 },
  { upTo: 3751.05, rate: 0.15, deduction: 394.16 },
  { upTo: 4664.68, rate: 0.225, deduction: 675.49 },
  { upTo: Infinity, rate: 0.275, deduction: 908.73 },
] as const;

export const IRPF_EXEMPTION_MONTHLY = 2428.80;
export const IRPF_DEPENDENT_DEDUCTION = 189.59;
export const IRPF_SIMPLIFIED_MONTHLY_DEDUCTION = 607.20;
export const IRPF_2026_REDUCTION_FULL_UNTIL = 5000;
export const IRPF_2026_REDUCTION_LINEAR_UNTIL = 7350;

// ============== Perfil Fiscal (Onboarding único) ==============
export type IncomeSourceKind = "PJ" | "CLT" | "RPA" | "PARTICULAR" | "SCP";
export const INCOME_SOURCE_LABELS: Record<IncomeSourceKind, string> = {
  PJ: "Empresa (PJ)",
  CLT: "Vínculo Fixo (CLT / Concurso)",
  RPA: "Recibo (RPA)",
  PARTICULAR: "Particular (Pix)",
  SCP: "Sociedade (SCP)",
};
export interface TaxProfile {
  completed: boolean;
  sources: Record<IncomeSourceKind, { enabled: boolean; monthly: number }>;
}
const emptyTaxProfile = (): TaxProfile => ({
  completed: false,
  sources: {
    PJ: { enabled: false, monthly: 0 },
    CLT: { enabled: false, monthly: 0 },
    RPA: { enabled: false, monthly: 0 },
    PARTICULAR: { enabled: false, monthly: 0 },
    SCP: { enabled: false, monthly: 0 },
  },
});

export interface Vehicle {
  model: string;
  kmPerLiter: number;
  fuelPrice: number;
  depreciationPerKm: number;
  maintenancePerKm: number;
}

export type TrainingLevel =
  | "Acadêmico de Medicina"
  | "Médico Generalista"
  | "Pós-Graduando"
  | "Residente"
  | "Especialista (com RQE)";

export interface UserProfile {
  fullName: string;
  trainingLevel: TrainingLevel;
  specialtyName?: string;
  baseAddress: string;
}

export interface StoreState {
  hasCompletedOnboarding: boolean;
  userProfile: UserProfile;
  taxProfile: TaxProfile;
  base: { label: string; lat: number; lng: number };
  vehicle: Vehicle;
  workplaces: Workplace[];
  shifts: Shift[];
  fixedCosts: FixedCost[];
  fixedIncomes: FixedIncome[];
  proLabores: ProLabore[];
  debts: Debt[];
  wedding: WeddingGoal;
  goals: GeneralGoal[];
  documents: ComplianceDoc[];
  assets: Asset[];
  liabilities: Liability[];
  surgeries: SurgeryRecord[];
}

export interface StoreActions {
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  saveTaxProfile: (p: TaxProfile) => void;
  resetTaxProfile: () => void;
  setBase: (b: StoreState["base"]) => void;
  setVehicle: (v: Vehicle) => void;
  addWorkplace: (w: Omit<Workplace, "id">) => void;
  updateWorkplace: (id: string, patch: Partial<Workplace>) => void;
  removeWorkplace: (id: string) => void;
  addShift: (s: Omit<Shift, "id">) => void;
  updateShift: (id: string, patch: Partial<Shift>) => void;
  removeShift: (id: string) => void;
  addSurgery: (s: Omit<SurgeryRecord, "id">) => void;
  updateSurgery: (id: string, patch: Partial<SurgeryRecord>) => void;
  removeSurgery: (id: string) => void;
  addFixedCost: (c: Omit<FixedCost, "id">) => void;
  removeFixedCost: (id: string) => void;
  addFixedIncome: (i: Omit<FixedIncome, "id">) => void;
  removeFixedIncome: (id: string) => void;
  addProLabore: (p: Omit<ProLabore, "id">) => void;
  removeProLabore: (id: string) => void;
  addDebt: (d: Omit<Debt, "id">) => void;
  removeDebt: (id: string) => void;
  setWedding: (w: WeddingGoal) => void;
  addGoal: (g: Omit<GeneralGoal, "id">) => void;
  updateGoal: (id: string, patch: Partial<GeneralGoal>) => void;
  removeGoal: (id: string) => void;
  addDocument: (d: Omit<ComplianceDoc, "id">) => void;
  removeDocument: (id: string) => void;
  addAsset: (a: Omit<Asset, "id">) => void;
  removeAsset: (id: string) => void;
  setAssets: (a: Asset[]) => void;
  addLiability: (l: Omit<Liability, "id">) => void;
  removeLiability: (id: string) => void;
  setLiabilities: (l: Liability[]) => void;
  updateUserProfile: (p: Partial<UserProfile>) => void;
}

type Store = StoreState & StoreActions;

// ============== Helpers ==============
const uid = () => Math.random().toString(36).slice(2, 10);
const STORAGE_KEY = "docfin.store.v2";

const initialState: StoreState = {
  hasCompletedOnboarding: false,
  userProfile: {
    fullName: "",
    trainingLevel: "Médico Generalista",
    specialtyName: "",
    baseAddress: "Casa",
  },
  taxProfile: emptyTaxProfile(),
  base: { label: "Casa", lat: -23.55, lng: -46.63 },
  vehicle: {
    model: "Honda Civic",
    kmPerLiter: 11,
    fuelPrice: 5.89,
    depreciationPerKm: 0.35,
    maintenancePerKm: 0.18,
  },
  workplaces: [
    { id: uid(), name: "Hospital São Lucas", address: "Av. Paulista, 1000", lat: -23.561, lng: -46.656, regime: "PJ_SIMPLES", hourlyRate: 280, paymentRule: "FIFTH_BUSINESS_DAY", cutOffDay: 20, paymentDay: 5, paymentTermDays: 15 },
    { id: uid(), name: "UPA Leste", address: "R. das Flores, 200", lat: -23.541, lng: -46.611, regime: "PF", hourlyRate: 220, paymentRule: "TENTH_DAY", cutOffDay: 25, paymentDay: 10, paymentTermDays: 15 },
  ],
  shifts: [],
  fixedCosts: [
    { id: uid(), label: "Contabilidade PJ", monthly: 350 },
    { id: uid(), label: "CRM + Anuidade", monthly: 180 },
    { id: uid(), label: "Seguro profissional", monthly: 220 },
  ],
  fixedIncomes: [],
  proLabores: [],
  debts: [],
  wedding: { enabled: true, targetAmount: 80000, targetDate: "2026-12-12", saved: 12000 },
  goals: [],
  documents: [],
  assets: [],
  liabilities: [],
  surgeries: [],
};

function loadState(): StoreState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);
    const merged: StoreState = { ...initialState, ...parsed };
    // Migração — garante cutOffDay/paymentDay nos workplaces antigos
    merged.workplaces = (merged.workplaces || []).map((w: any) => ({
      cutOffDay: 20,
      paymentDay: 5,
      paymentTermDays: 15,
      ...w,
    }));
    // Migração — garante goals array
    if (!merged.goals) merged.goals = [];
    return merged;
  } catch {
    return initialState;
  }
}

function saveState(s: StoreState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // silently fail
  }
}

// ============== Geo / shift math ==============
export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function round2(n: number): number {
  return Math.max(0, Math.round((Number.isFinite(n) ? n : 0) * 100) / 100);
}

export function calculateINSSProgressive(grossMonthly: number): number {
  const base = Math.max(0, Math.min(grossMonthly || 0, INSS_CEILING));
  let previous = 0;
  let contribution = 0;
  for (const bracket of INSS_BRACKETS) {
    const taxable = Math.max(0, Math.min(base, bracket.upTo) - previous);
    contribution += taxable * bracket.rate;
    previous = bracket.upTo;
    if (base <= bracket.upTo) break;
  }
  return round2(contribution);
}

export function calculateIRRF2026FromBase(taxableBase: number, grossIncomeForReduction: number = taxableBase): number {
  const base = Math.max(0, taxableBase || 0);
  const bracket = IRPF_2026_BRACKETS.find((b) => base <= b.upTo) ?? IRPF_2026_BRACKETS[IRPF_2026_BRACKETS.length - 1];
  const baseTax = Math.max(0, base * bracket.rate - bracket.deduction);
  const income = Math.max(0, grossIncomeForReduction || base);
  let reduction = 0;
  if (income <= IRPF_2026_REDUCTION_FULL_UNTIL) {
    reduction = baseTax;
  } else if (income <= IRPF_2026_REDUCTION_LINEAR_UNTIL) {
    reduction = Math.max(0, 978.62 - 0.133145 * income);
  }
  return round2(Math.max(0, baseTax - reduction));
}

export function calculateIRRF2026(grossMonthly: number, inssDeduction: number = 0, dependents: number = 0): number {
  const gross = Math.max(0, grossMonthly || 0);
  const legalDeductions = Math.max(0, inssDeduction || 0) + Math.max(0, dependents || 0) * IRPF_DEPENDENT_DEDUCTION;
  const deduction = Math.max(legalDeductions, IRPF_SIMPLIFIED_MONTHLY_DEDUCTION);
  return calculateIRRF2026FromBase(Math.max(0, gross - deduction), gross);
}

export function calculateCLTNetMonthly(grossMonthly: number): number {
  const gross = Math.max(0, grossMonthly || 0);
  const inss = calculateINSSProgressive(gross);
  const irrf = calculateIRRF2026(gross, inss);
  return round2(gross - inss - irrf);
}

export function monthlyCLTGrossTotal(s: Pick<StoreState, "fixedIncomes">): number {
  return (s.fixedIncomes || []).reduce((a, i) => a + (i.grossMonthly || 0), 0);
}

export function remainingINSSBaseAfterCLT(s: Pick<StoreState, "fixedIncomes">): number {
  return Math.max(0, INSS_CEILING - monthlyCLTGrossTotal(s));
}

export function inssCeilingReachedByCLT(s: Pick<StoreState, "fixedIncomes">): boolean {
  return monthlyCLTGrossTotal(s) >= INSS_CEILING;
}

export function calculateRPAWithholding(gross: number, s: Pick<StoreState, "fixedIncomes">): { inss: number; irrf: number; total: number; netBeforeCosts: number } {
  const income = Math.max(0, gross || 0);
  const availableINSSBase = remainingINSSBaseAfterCLT(s);
  const inssBase = Math.min(income, availableINSSBase);
  const inss = round2(inssBase * RPA_INSS_RATE);
  const irrf = calculateIRRF2026(income, inss);
  const total = round2(inss + irrf);
  return { inss, irrf, total, netBeforeCosts: round2(income - total) };
}

export function getEffectiveSimpleRate(projectedPJRevenue: number, proLabore: number): number {
  if ((projectedPJRevenue || 0) <= 0) return SIMPLES_ANEXO_III_RATE;
  return (proLabore || 0) >= projectedPJRevenue * FATOR_R_PROLABORE_RATIO
    ? SIMPLES_ANEXO_III_RATE
    : SIMPLES_ANEXO_V_RATE;
}

type TaxContext = Pick<StoreState, "fixedIncomes"> & Partial<Pick<StoreState, "proLabores" | "shifts" | "workplaces" | "surgeries">>;

function projectedSimpleRevenueForCurrentMonth(s: TaxContext, incomingGross: number): number {
  if (!s.shifts || !s.workplaces) return incomingGross;
  const now = new Date();
  const currentMonthRevenue = s.shifts.reduce((sum, shift) => {
    const wp = s.workplaces?.find((w) => w.id === shift.workplaceId);
    const d = new Date(shift.date + "T12:00:00");
    if (wp?.regime === "PJ_SIMPLES" && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
      return sum + (shift.gross || 0);
    }
    return sum;
  }, 0);
  return currentMonthRevenue + Math.max(0, incomingGross || 0);
}

export function computePJSimpleTax(gross: number, s: TaxContext): number {
  const income = Math.max(0, gross || 0);
  const projectedRevenue = projectedSimpleRevenueForCurrentMonth(s, income);
  const manualProLabore = s.proLabores?.reduce((sum, p) => sum + (p.monthly || 0), 0) ?? 0;
  const automaticProLabore = s.shifts && s.workplaces && s.surgeries ? computedProLaboreMonthly(s as StoreState) : 0;
  const proLabore = Math.max(manualProLabore, automaticProLabore);
  return round2(income * getEffectiveSimpleRate(projectedRevenue, proLabore));
}

export function estimateAnnualIRPF2026(annualGross: number, annualDeduction: number = 0): number {
  const monthlyGross = Math.max(0, annualGross || 0) / 12;
  const monthlyDeduction = Math.max(IRPF_SIMPLIFIED_MONTHLY_DEDUCTION, Math.max(0, annualDeduction || 0) / 12);
  return round2(calculateIRRF2026FromBase(Math.max(0, monthlyGross - monthlyDeduction), monthlyGross) * 12);
}

export interface ShiftMath {
  km: number;
  fuelCost: number;
  wearCost: number;
  tax: number;
  net: number;
  logistics: number;
}

export function computeShift(s: StoreState, shift: Shift): ShiftMath {
  const wp = s.workplaces.find((w) => w.id === shift.workplaceId);
  if (!wp) return { km: 0, fuelCost: 0, wearCost: 0, tax: 0, net: 0, logistics: 0 };
  const origin = shift.originId === "home"
    ? s.base
    : (s.workplaces.find((w) => w.id === shift.originId) ?? s.base);
  const oneWayKm = haversine({ lat: origin.lat, lng: origin.lng }, { lat: wp.lat, lng: wp.lng });
  const km = Math.max(2, oneWayKm * 2); // round trip, with floor
  const fuelCost = (km / s.vehicle.kmPerLiter) * s.vehicle.fuelPrice;
  const wearCost = km * (s.vehicle.depreciationPerKm + s.vehicle.maintenancePerKm);
  const logistics = fuelCost + wearCost + (shift.extraCost || 0);
  const tax = computeTaxForRegime(shift.gross, wp.regime, s);
  const net = shift.gross - tax - logistics;
  return { km, fuelCost, wearCost, tax, net, logistics };
}


export function computeTaxForRegime(gross: number, regime: TaxRegime, s: TaxContext): number {
  const income = Math.max(0, gross || 0);
  switch (regime) {
    case "PF":
    case "RPA":
      return calculateRPAWithholding(income, s).total;
    case "PJ_SIMPLES":
      return computePJSimpleTax(income, s);
    case "PJ_LUCRO_PRESUMIDO":
      return round2(income * TAX_RATE.PJ_LUCRO_PRESUMIDO);
    case "CLT": {
      const inss = calculateINSSProgressive(income);
      const irrf = calculateIRRF2026(income, inss);
      return round2(inss + irrf);
    }
    case "PARTICULAR_PIX":
    case "SCP":
    default:
      return 0;
  }
}

// ============== Aggregations ==============
export const monthlyFixedTotal = (s: StoreState) => s.fixedCosts.reduce((a, c) => a + c.monthly, 0);
export const monthlyFixedIncomeNet = (s: StoreState) => s.fixedIncomes.reduce((a, i) => a + calculateCLTNetMonthly(i.grossMonthly), 0);
export const monthlyFixedIncomeGross = (s: StoreState) => s.fixedIncomes.reduce((a, i) => a + i.grossMonthly, 0);
export const monthlyProLaboreTotal = (s: StoreState) => s.proLabores.reduce((a, p) => a + p.monthly, 0);
export const monthlyFixedIncomeGrossTotal = (s: StoreState) => monthlyCLTGrossTotal(s);
export const inssCeilingReached = (s: StoreState) => inssCeilingReachedByCLT(s);

export function daysUntil(iso: string): number {
  const target = new Date(iso + "T12:00:00").getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}


// ============== Date helpers ==============
const isWeekday = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6;
function nthBusinessDay(year: number, month: number, n: number) {
  const d = new Date(year, month, 1);
  let count = 0;
  while (count < n) {
    if (isWeekday(d)) count++;
    if (count < n) d.setDate(d.getDate() + 1);
  }
  return d;
}
export function computePaymentDate(shiftDateISO: string, rule: PaymentRule): Date {
  const sd = startOfDay(parseISO(shiftDateISO));
  const y = sd.getFullYear();
  const m = sd.getMonth();
  switch (rule) {
    case "FIFTH_BUSINESS_DAY": return nthBusinessDay(y, m + 1, 5);
    case "TENTH_DAY": return new Date(y, m + 1, 10);
    case "FIFTEENTH_DAY": return new Date(y, m + 1, 15);
    case "END_OF_MONTH": return new Date(y, m + 1, 0);
    case "NEXT_MONTH_FIFTH": return new Date(y, m + 1, 5);
    case "INSTANT_D0": return sd;
    default: return sd;
  }
}

/**
 * Motor de Caixa do Ciclo Hospitalar (Lógica de Corte do Hospital).
 *
 *   1. Pega a Data do Plantão.
 *   2. Encontra o "Dia de Fechamento/Corte" no MÊS SEGUINTE → Data de Envio da Nota.
 *   3. Soma o "Prazo para Pagamento em Dias" do hospital → Data Estimada de Recebimento.
 *
 * Particular/Pix (INSTANT_D0) ignora o ciclo e cai em D+0.
 * O cutOffDay é "clampado" ao último dia válido do mês de envio (ex: 31 em fev vira 28/29).
 */
export function calculateExpectedPaymentDate(
  shiftDateISO: string,
  workplace: Pick<Workplace, "cutOffDay" | "paymentDay" | "paymentRule" | "paymentTermDays">,
): Date {
  const sd = startOfDay(parseISO(shiftDateISO));
  if (workplace.paymentRule === "INSTANT_D0") return sd;
  const cut = Math.max(1, Math.min(31, workplace.cutOffDay ?? 20));
  const term = Math.max(0, workplace.paymentTermDays ?? 15);
  
  // Regra Matemática:
  // Se o dia do plantão for MENOR OU IGUAL ao dia_de_corte, o pagamento ocorre no mesmo mês do corte + prazo_de_pagamento dias.
  // Se o dia do plantão for MAIOR que o dia_de_corte, o pagamento transita para o corte do MÊS SEGUINTE + prazo_de_pagamento dias.
  const cycleBase = sd.getDate() <= cut ? sd : addMonths(sd, 1);
  
  // O pagamento ocorre no mês do ciclo (cycleBase) no dia do corte + prazo de pagamento
  const lastDayOfCycleMonth = lastDayOfMonth(cycleBase).getDate();
  const noteSendDate = setDate(cycleBase, Math.min(cut, lastDayOfCycleMonth));
  return addDays(noteSendDate, term);
}

/** True quando o pagamento "pulou" um ciclo (>1 mês após o plantão). */
export function didSkipCycle(
  shiftDateISO: string,
  workplace: Pick<Workplace, "cutOffDay" | "paymentRule">,
): boolean {
  if (workplace.paymentRule === "INSTANT_D0") return false;
  const sd = startOfDay(parseISO(shiftDateISO));
  const cut = Math.max(1, Math.min(31, workplace.cutOffDay ?? 20));
  return sd.getDate() > cut;
}
export const fmtISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const monthLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
export const fmtDate = (d: Date) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

// ============== Smart Tax Router (Fator R / MVP) ==============
// Limite mensal de faturamento PJ para manter o Anexo III (Fator R) — MVP.
export const FATOR_R_PROLABORE_RATIO = 0.28;

export interface TaxOptimizationAlert {
  triggered: boolean;
  reason?: "FATOR_R_RISK";
  projectedPJTotal: number;
  requiredProLabore: number;
  proLaboreShortfall: number;
  message?: string;
}

/**
 * Avalia em tempo real se o novo registro pode quebrar o Fator R.
 * Regra MVP: faturamento PJ projetado > R$ 15.000/mês E pró-labore < 28% desse total.
 */
export function checkTaxOptimization(
  newAmount: number,
  currentMonthTotalPJ: number,
  proLabore: number = 0,
): TaxOptimizationAlert {
  const projectedPJTotal = (currentMonthTotalPJ || 0) + (newAmount || 0);
  const requiredProLabore = projectedPJTotal * FATOR_R_PROLABORE_RATIO;
  const proLaboreShortfall = Math.max(0, requiredProLabore - (proLabore || 0));
  const proLaboreInsufficient = projectedPJTotal > 0 && (proLabore || 0) < requiredProLabore;
  const triggered = proLaboreInsufficient && newAmount > 0;
  return {
    triggered,
    reason: triggered ? "FATOR_R_RISK" : undefined,
    projectedPJTotal,
    requiredProLabore,
    proLaboreShortfall,
    message: triggered
      ? "Risco de Anexo V: pró-labore abaixo de 28%; alíquota efetiva inicial sobe de 6% para 15,5%."
      : undefined,
  };
}

/** Soma genérica de receita bruta do mês para uma lista de regimes. */
export function getCurrentMonthRegimeTotal(
  s: StoreState,
  year: number,
  month: number,
  regimes: TaxRegime[],
): number {
  const inMonth = (iso: string) => {
    const d = new Date(iso + "T12:00:00");
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  };
  const set = new Set(regimes);
  let total = 0;
  for (const sh of s.shifts) {
    if (!inMonth(sh.date)) continue;
    const wp = s.workplaces.find((w) => w.id === sh.workplaceId);
    if (wp && set.has(wp.regime)) total += sh.gross;
  }
  for (const sg of s.surgeries) {
    if (!inMonth(sg.date)) continue;
    if (sg.myRole !== "TITULAR") continue;
    const wp = s.workplaces.find((w) => w.id === sg.hospitalId);
    if (wp && set.has(wp.regime)) total += sg.totalGross;
  }
  return total;
}

/** % de pró-labore aplicado automaticamente sobre faturamento PJ Simples. */
export const PROLABORE_AUTO_RATIO = 0.28;

/**
 * Pró-labore CALCULADO automaticamente — fricção zero.
 * Soma todos os plantões/cirurgias tagueados como PJ (Simples Nacional) no mês,
 * multiplica por 28%. O usuário não digita nada.
 */
export function computedProLaboreMonthly(s: StoreState, ref: Date = new Date()): number {
  const pj = getCurrentMonthRegimeTotal(s, ref.getFullYear(), ref.getMonth() + 1, ["PJ_SIMPLES"]);
  return pj * PROLABORE_AUTO_RATIO;
}

/** Soma da receita registrada via Sociedade (SCP) no mês. */
export function getCurrentMonthSCPTotal(s: StoreState, year: number, month: number): number {
  return getCurrentMonthRegimeTotal(s, year, month, ["SCP"]);
}

/** Receita bruta total do mês (todas as origens), inclui SCP e repasses recebidos como membro. */
export function getCurrentMonthTotalRevenue(s: StoreState, year: number, month: number): number {
  const inMonth = (iso: string) => {
    const d = new Date(iso + "T12:00:00");
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  };
  let total = 0;
  for (const sh of s.shifts) if (inMonth(sh.date)) total += sh.gross;
  for (const sg of s.surgeries) {
    if (!inMonth(sg.date)) continue;
    if (sg.myRole === "TITULAR") total += sg.totalGross;
    else total += sg.myExpectedShare;
  }
  return total;
}

/** Soma o faturamento bruto PJ (Simples + Lucro Presumido) já registrado no mês/ano informado. */
export function getCurrentMonthPJTotal(s: StoreState, year: number, month: number): number {
  const inMonth = (iso: string) => {
    const d = new Date(iso + "T12:00:00");
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  };
  const isPJ = (r: TaxRegime) => r === "PJ_SIMPLES" || r === "PJ_LUCRO_PRESUMIDO";
  let total = 0;
  for (const sh of s.shifts) {
    if (!inMonth(sh.date)) continue;
    const wp = s.workplaces.find((w) => w.id === sh.workplaceId);
    if (wp && isPJ(wp.regime)) total += sh.gross;
  }
  for (const sg of s.surgeries) {
    if (!inMonth(sg.date)) continue;
    if (sg.myRole !== "TITULAR") continue;
    const wp = s.workplaces.find((w) => w.id === sg.hospitalId);
    if (wp && isPJ(wp.regime)) total += sg.totalGross;
  }
  return total;
}

// ============== Monthly Closing Report ==============
export interface MonthlyReportRow {
  workplaceId: string;
  workplaceName: string;
  regime: TaxRegime | "SCP";
  shiftsCount: number;
  surgeriesCount: number;
  gross: number;
}

export interface MonthlyReport {
  month: number;        // 1-12
  year: number;
  label: string;        // "Maio 2026"
  rows: MonthlyReportRow[];
  byRegime: Record<string, { label: string; gross: number; count: number }>;
  totalGross: number;
  totalShifts: number;
  totalSurgeries: number;
}

export function generateMonthlyReport(s: StoreState, month: number, year: number): MonthlyReport {
  const inMonth = (iso: string) => {
    const d = new Date(iso + "T12:00:00");
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  };

  const rowsMap = new Map<string, MonthlyReportRow>();
  const ensureRow = (id: string, name: string, regime: MonthlyReportRow["regime"]): MonthlyReportRow => {
    const key = `${id}__${regime}`;
    let r = rowsMap.get(key);
    if (!r) {
      r = { workplaceId: id, workplaceName: name, regime, shiftsCount: 0, surgeriesCount: 0, gross: 0 };
      rowsMap.set(key, r);
    }
    return r;
  };

  // Plantões
  let totalShifts = 0;
  for (const sh of s.shifts) {
    if (!inMonth(sh.date)) continue;
    const wp = s.workplaces.find((w) => w.id === sh.workplaceId);
    if (!wp) continue;
    const row = ensureRow(wp.id, wp.name, wp.regime);
    row.shiftsCount += 1;
    row.gross += sh.gross;
    totalShifts += 1;
  }

  // Cirurgias TITULAR — atribuídas ao hospital pagador
  let totalSurgeries = 0;
  for (const sg of s.surgeries) {
    if (!inMonth(sg.date)) continue;
    if (sg.myRole === "TITULAR") {
      const wp = s.workplaces.find((w) => w.id === sg.hospitalId);
      const name = wp?.name ?? "Hospital não cadastrado";
      const regime = wp?.regime ?? "PJ_SIMPLES";
      const row = ensureRow(sg.hospitalId || "unknown", name, regime);
      row.surgeriesCount += 1;
      // Faturamento bruto recebido pelo titular = totalGross (nota cheia ou fração própria)
      // Em caso de nota fracionada, o titular ainda recebe valor cheio do hospital
      row.gross += sg.totalGross;
      totalSurgeries += 1;
    } else {
      // MEMBRO de equipe — repasse via SCP/colega
      const row = ensureRow(`scp-${sg.payingSurgeonName}`, `SCP — ${sg.payingSurgeonName}`, "SCP");
      row.surgeriesCount += 1;
      row.gross += sg.myExpectedShare;
      totalSurgeries += 1;
    }
  }

  const rows = Array.from(rowsMap.values()).sort((a, b) => b.gross - a.gross);

  const regimeLabels: Record<string, string> = {
    ...TAX_LABELS,
    SCP: "SCP / Repasse entre Médicos",
  };
  const byRegime: MonthlyReport["byRegime"] = {};
  for (const r of rows) {
    const k = r.regime;
    if (!byRegime[k]) byRegime[k] = { label: regimeLabels[k] ?? k, gross: 0, count: 0 };
    byRegime[k].gross += r.gross;
    byRegime[k].count += r.shiftsCount + r.surgeriesCount;
  }

  const totalGross = rows.reduce((a, r) => a + r.gross, 0);
  const label = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return { month, year, label, rows, byRegime, totalGross, totalShifts, totalSurgeries };
}

// ============== Currency ==============
export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const brl2 = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ============== Renda Global (Soma de todas as fontes do TaxProfile) ==============
/**
 * Soma mensal de TODAS as fontes ativas de renda do médico (PJ + CLT + RPA + Particular).
 * Base usada para cálculo de IRPF — Fator R continua olhando apenas faturamento PJ.
 */
export function getAnnualPFCLTIncome(s: StoreState): number {
  const tp = s.taxProfile;
  if (!tp || !tp.completed) return 0;
  const monthlyPFCLT = (Object.keys(tp.sources) as IncomeSourceKind[])
    .filter((k) => k === "RPA" || k === "CLT")
    .reduce((acc, k) => acc + (tp.sources[k].enabled ? (tp.sources[k].monthly || 0) : 0), 0);
  return monthlyPFCLT * 12;
}

export function isPJFocused(s: StoreState): boolean {
  const tp = s.taxProfile;
  if (!tp || !tp.completed) return true; // Default to PJ focused if no tax profile or not completed
  const hasPJ = tp.sources.PJ.enabled && tp.sources.PJ.monthly > 0;
  const hasPFCLT = (tp.sources.RPA.enabled && tp.sources.RPA.monthly > 0) || (tp.sources.CLT.enabled && tp.sources.CLT.monthly > 0);
  return hasPJ && !hasPFCLT; // Considered PJ focused if has PJ income but no PF/CLT income
}

export type PGBLScenario = "A" | "B" | "C";

export interface PGBLAdvantage {
  scenario: PGBLScenario;
  annualPFCLTIncome: number;
  idealLimit: number;
  taxSavings: number;
}

/** Teto da dedução padrão (20%) na Declaração Simplificada do IRPF — vigente. */
export const SIMPLIFIED_DEDUCTION_CAP = 16754.34;

export function calculatePGBLAdvantage(s: StoreState): PGBLAdvantage {
  const annualPFCLTIncome = getAnnualPFCLTIncome(s);
  const isPJOnly = isPJFocused(s);
  const idealLimit = round2(annualPFCLTIncome * 0.12);

  // Na Simplificada o contribuinte já abate, sem esforço, até R$ 16.754,34.
  // A vantagem REAL do PGBL é apenas o excedente da dedução sobre esse teto,
  // tributado na alíquota máxima de 27,5%.
  const incrementalDeduction = Math.max(0, idealLimit - SIMPLIFIED_DEDUCTION_CAP);
  const taxSavings = round2(incrementalDeduction * 0.275);

  if (isPJOnly || annualPFCLTIncome < 140000) {
    return { scenario: "A", annualPFCLTIncome, idealLimit, taxSavings };
  }

  if (annualPFCLTIncome >= 140000 && annualPFCLTIncome <= 200000) {
    return { scenario: "B", annualPFCLTIncome, idealLimit, taxSavings };
  }

  return { scenario: "C", annualPFCLTIncome, idealLimit, taxSavings };
}

export function globalIncomeMonthly(s: StoreState): number {
  const tp = s.taxProfile;
  if (!tp || !tp.completed) return 0;
  return (Object.keys(tp.sources) as IncomeSourceKind[])
    .filter((k) => k !== "SCP") // SCP isenta — fora da base de IRPF
    .reduce((acc, k) => acc + (tp.sources[k].enabled ? (tp.sources[k].monthly || 0) : 0), 0);
}
/** Indica se o médico está pagando IR na fonte (renda mensal global > faixa de isenção). */
export function isAboveIRPFExemption(s: StoreState): boolean {
  return globalIncomeMonthly(s) > IRPF_EXEMPTION_MONTHLY;
}

// ============== Context ==============
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(() => loadState());

  useEffect(() => { saveState(state); }, [state]);

  const actions: StoreActions = {
    completeOnboarding: () => setState((p) => ({ ...p, hasCompletedOnboarding: true })),
    resetOnboarding: () => setState((p) => ({ ...p, hasCompletedOnboarding: false })),
    saveTaxProfile: (taxProfile) => setState((p) => ({ ...p, taxProfile: { ...taxProfile, completed: true } })),
    resetTaxProfile: () => setState((p) => ({ ...p, taxProfile: emptyTaxProfile() })),
    setBase: (base) => setState((p) => ({ ...p, base })),
    setVehicle: (vehicle) => setState((p) => ({ ...p, vehicle })),
    addWorkplace: (w) => setState((p) => ({ ...p, workplaces: [...p.workplaces, { id: uid(), ...w }] })),
    updateWorkplace: (id, patch) =>
      setState((p) => ({ ...p, workplaces: p.workplaces.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
    removeWorkplace: (id) => setState((p) => ({ ...p, workplaces: p.workplaces.filter((w) => w.id !== id) })),
    addShift: (s) => setState((p) => {
      const wp = p.workplaces.find((w) => w.id === s.workplaceId);
      const expectedPaymentDate = wp ? fmtISO(calculateExpectedPaymentDate(s.date, wp)) : undefined;
      return { ...p, shifts: [...p.shifts, { id: uid(), ...s, expectedPaymentDate, projectedPaymentDate: expectedPaymentDate }] };
    }),
    updateShift: (id, patch) => setState((p) => ({
      ...p,
      shifts: p.shifts.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };
        const wp = p.workplaces.find((w) => w.id === next.workplaceId);
        if (wp) next.expectedPaymentDate = fmtISO(calculateExpectedPaymentDate(next.date, wp));
        return next;
      }),
    })),
    removeShift: (id) => setState((p) => ({ ...p, shifts: p.shifts.filter((s) => s.id !== id) })),
    addSurgery: (s) => setState((p) => ({ ...p, surgeries: [...p.surgeries, { id: uid(), ...s } as SurgeryRecord] })),
    updateSurgery: (id, patch) =>
      setState((p) => ({ ...p, surgeries: p.surgeries.map((s) => (s.id === id ? ({ ...s, ...patch } as SurgeryRecord) : s)) })),
    removeSurgery: (id) => setState((p) => ({ ...p, surgeries: p.surgeries.filter((s) => s.id !== id) })),
    addFixedCost: (c) => setState((p) => ({ ...p, fixedCosts: [...p.fixedCosts, { id: uid(), ...c }] })),
    removeFixedCost: (id) => setState((p) => ({ ...p, fixedCosts: p.fixedCosts.filter((c) => c.id !== id) })),
    addFixedIncome: (i) => setState((p) => ({
      ...p,
      fixedIncomes: [...p.fixedIncomes, { id: uid(), ...i, netMonthly: calculateCLTNetMonthly(i.grossMonthly) }],
    })),
    removeFixedIncome: (id) => setState((p) => ({ ...p, fixedIncomes: p.fixedIncomes.filter((i) => i.id !== id) })),
    addProLabore: (p2) => setState((p) => ({ ...p, proLabores: [...p.proLabores, { id: uid(), ...p2 }] })),
    removeProLabore: (id) => setState((p) => ({ ...p, proLabores: p.proLabores.filter((x) => x.id !== id) })),
    addDebt: (d) => setState((p) => ({ ...p, debts: [...p.debts, { id: uid(), ...d }] })),
    removeDebt: (id) => setState((p) => ({ ...p, debts: p.debts.filter((d) => d.id !== id) })),
    setWedding: (wedding) => setState((p) => ({ ...p, wedding })),
    addGoal: (g) => setState((p) => ({ ...p, goals: [...p.goals, { id: uid(), ...g }] })),
    updateGoal: (id, patch) => setState((p) => ({ ...p, goals: p.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
    removeGoal: (id) => setState((p) => ({ ...p, goals: p.goals.filter((g) => g.id !== id) })),
    addDocument: (d) => setState((p) => ({ ...p, documents: [...p.documents, { id: uid(), ...d }] })),
    removeDocument: (id) => setState((p) => ({ ...p, documents: p.documents.filter((d) => d.id !== id) })),
    addAsset: (a) => setState((p) => ({ ...p, assets: [...p.assets, { id: uid(), ...a }] })),
    removeAsset: (id) => setState((p) => ({ ...p, assets: p.assets.filter((a) => a.id !== id) })),
    setAssets: (assets) => setState((p) => ({ ...p, assets })),
    addLiability: (l) => setState((p) => ({ ...p, liabilities: [...p.liabilities, { id: uid(), ...l }] })),
    removeLiability: (id) => setState((p) => ({ ...p, liabilities: p.liabilities.filter((l) => l.id !== id) })),
    setLiabilities: (liabilities) => setState((p) => ({ ...p, liabilities })),
    updateUserProfile: (profile) => setState((p) => ({ ...p, userProfile: { ...p.userProfile, ...profile } })),
  };

  return <StoreContext.Provider value={{ ...state, ...actions }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// ============== Goal Helpers ==============
export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  "Casamento": "Casamento",
  "Viagem": "Viagem",
  "Imóvel": "Imóvel",
  "Carro": "Carro",
  "Educação": "Educação",
  "Outro": "Outro",
};

export function goalProgressPercent(goal: GeneralGoal): number {
  return goal.targetAmount > 0 ? Math.min(100, (goal.saved / goal.targetAmount) * 100) : 0;
}
