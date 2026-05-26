import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { addDays, addMonths, lastDayOfMonth, setDate, parseISO, startOfDay } from "date-fns";
import { supabase } from "@/lib/supabase";
import { logger } from "./logger";

// ============== Tipos ==============
export type TaxRegime =
  | "PF"
  | "PJ_SIMPLES"
  | "PJ_LUCRO_PRESUMIDO"
  | "CLT"
  | "RPA"
  | "PARTICULAR_PIX"
  | "SCP";
export type PaymentRule = string;
export type EntityDomain = "PF" | "PJ";
export type RecordStatus = "draft" | "consolidated";
export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "DEFAULTED";
export type FeedbackContext = "shift_capture" | "tax_projection";
export type FeedbackType = "CES" | "CSAT";

export const TAX_LABELS: Record<TaxRegime, string> = {
  PF: "PF (RPA) — IRPF progressivo",
  PJ_SIMPLES: "PJ (Simples Nacional)",
  PJ_LUCRO_PRESUMIDO: "PJ Lucro Presumido — 16,33%",
  CLT: "CLT",
  RPA: "RPA / Autônomo",
  PARTICULAR_PIX: "Particular (Pix)",
  SCP: "Sociedade (SCP)",
};

// PAYMENT_RULE_LABELS está depreciado porque PaymentRule agora é texto livre.
// Mantido como referência para dados existentes, mas não é mais usado na seleção da UI.
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
  entityDomain: EntityDomain;
  name: string;
  address: string;
  lat: number;
  lng: number;
  manualDistanceKm?: number;
  regime: TaxRegime;
  hourlyRate: number;
  paymentRule: PaymentRule;
  color?: string;
  /** Dia do mês (1-31) que fecha a folha de plantões. */
  cutOffDay: number;
  /** Dia do mês (1-31) em que o hospital efetivamente paga. */
  paymentDay: number;
  /** Prazo (em dias) entre o envio da nota e o pagamento efetivo. */
  paymentTermDays: number;
}

export type ShiftStatus = "CONFIRMADO" | "REPASSADO" | "BUSCANDO_SUBSTITUTO";
export type ShiftTransportMode = "PERSONAL_VEHICLE" | "PRIVATE_TRANSPORT";
export type DeductionType = "ISS_RETIDO" | "IRRF" | "CRF" | "GLOSA" | "TAXA_ADMIN" | "REPASSE" | "OUTRO";

export interface Deduction {
  id: string;
  type: DeductionType;
  amount: number;
  notes?: string;
}

export interface Shift {
  id: string;
  entityDomain: EntityDomain;
  recordStatus?: RecordStatus;
  date: string; // AAAA-MM-DD
  workplaceId: string;
  originId: string; // "home" ou workplaceId
  hours: number;
  gross: number;
  procedure?: string;
  taxRegimeOverride?: TaxRegime;
  extraCost: number;
  deductions?: Deduction[];
  deductionDescription?: string | null;
  /** @deprecated Utilize a propriedade deductions para manter trilha estruturada de auditoria. */
  settlementAdjustment?: number;
  transportMode?: ShiftTransportMode;
  privateTransportCost?: number;
  commuteHours?: number; // horas de ida e volta (padrão 1,5)
  status?: ShiftStatus;       // padrão CONFIRMADO
  coveredBy?: string;         // nome do colega que pegou o plantão
  /** Calculado automaticamente a partir do ciclo do hospital (AAAA-MM-DD). */
  expectedPaymentDate?: string;
  projectedNet?: number;
  projectedPaymentDate?: string;
  paymentStatus?: PaymentStatus;
  actualPaymentDate?: string;
  /** Data de emissão da NF usada para competência fiscal (AAAA-MM-DD). */
  invoiceIssueDate?: string;
  invoiceNumber?: string;
  agentNotified?: boolean;
  isFixedShift?: boolean;
}

// ============== Livro de Cirurgias ==============
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
  entityDomain: EntityDomain;
  recordStatus?: RecordStatus;
  date: string;        // AAAA-MM-DD
  procedure?: string;
  notes?: string;
  deductions?: Deduction[];
  /** @deprecated Utilize a propriedade deductions para manter trilha estruturada de auditoria. */
  settlementAdjustment?: number;
  paymentStatus?: PaymentStatus;
  actualPaymentDate?: string;
  /** Data de emissão da NF usada para competência fiscal (AAAA-MM-DD). */
  invoiceIssueDate?: string;
  invoiceNumber?: string;
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

export interface FixedCost { id: string; entityDomain: EntityDomain; label: string; monthly: number; }
export interface FixedIncome { id: string; entityDomain: EntityDomain; label: string; grossMonthly: number; netMonthly?: number; }
export interface ProLabore { id: string; entityDomain: EntityDomain; label: string; monthly: number; } // pró-labore mensal de PJ
export interface Debt { id: string; entityDomain: EntityDomain; label: string; balance: number; annualRate: number; monthlyPayment: number; }
export type ExpenseCategory =
  | "Transporte"
  | "Saúde"
  | "CRM/Sociedades"
  | "Alimentação"
  | "Educação"
  | "Moradia"
  | "Viagens"
  | "Impostos/Taxas"
  | "Outros";
export interface ExpenseTransaction {
  id: string;
  entityDomain: EntityDomain;
  date: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  sourceFileName?: string;
  sourceType: "CSV" | "OFX" | "MANUAL";
}

export interface DebtInstallmentExpense {
  id: string;
  entityDomain: EntityDomain;
  date: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  sourceType: "DEBT_INSTALLMENT";
  debtId: string;
  readOnly: true;
}

export type ExpenseWithDebtInstallment = ExpenseTransaction | DebtInstallmentExpense;
export interface Goal {
  id: string;
  entityDomain: EntityDomain;
  name: string;
  targetAmount: number;
  targetDate: string;
  saved: number;
  coverImage?: string; // imagem codificada em base64
}

export interface WeddingGoal { entityDomain: EntityDomain; enabled: boolean; targetAmount: number; targetDate: string; saved: number; }

// Metas gerais (pode ter múltiplas)
export type GoalCategory = "Casamento" | "Viagem" | "Imóvel" | "Carro" | "Educação" | "Outro";
export interface GeneralGoal {
  id: string;
  entityDomain: EntityDomain;
  name: string;
  category: GoalCategory;
  targetAmount: number;
  targetDate: string;
  saved: number;
  coverImage?: string; // imagem codificada em base64
}

export type AssetCategory = "Imóvel" | "Veículo" | "Renda Fixa" | "Renda Variável" | "Consórcio" | "Cripto";
export type CryptoTicker = "USDT" | "USDC" | "BTC" | "ETH" | "SOL" | "OUTRO";
export const USD_PEGGED_TICKERS: CryptoTicker[] = ["USDT", "USDC"];
export interface Asset {
  id: string;
  entityDomain: EntityDomain;
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
  entityDomain: EntityDomain;
  category: LiabilityCategory;
  description: string;
  totalAmount: number;
  remainingBalance: number;
  interestRate: number; // % ao ano
}

export type DocumentKind = "CRM" | "CERT_DIGITAL" | "MALPRACTICE" | "ACLS_BLS" | "OUTRO";
export interface ComplianceDoc {
  id: string;
  entityDomain: EntityDomain;
  kind: DocumentKind;
  label: string;
  expiresAt: string; // AAAA-MM-DD
  renewalCost?: number;
}
export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  CRM: "CRM (Anuidade)",
  CERT_DIGITAL: "Certificado Digital",
  MALPRACTICE: "Seguro Resp. Civil",
  ACLS_BLS: "ACLS / BLS",
  OUTRO: "Outro",
};

export type ReceivableStatus = "PREVISTO" | "NF_EMITIDA" | "PAGO";

export interface Receivable {
  id: string;
  entityDomain: "PJ";
  sourceType: "SHIFT" | "SURGERY";
  sourceId: string;
  payerName: string;
  payerDocument?: string;
  competenceDate: string;
  expectedPaymentDate: string;
  paidAt?: string;
  grossAmount: number;
  netAmount?: number;
  status: ReceivableStatus;
  invoiceId?: string;
}

export type InvoiceStatus = "RASCUNHO" | "EMITIDA" | "CANCELADA";

export interface Invoice {
  id: string;
  entityDomain: "PJ";
  receivableIds: string[];
  number?: string;
  payerName: string;
  payerDocument?: string;
  issueDate: string;
  competenceDate: string;
  grossAmount: number;
  status: InvoiceStatus;
}
// Documentos que devem sugerir automaticamente custos fixos (mensal = custo anual / 12).
export const DOC_KIND_TO_FIXED_COST: Partial<Record<DocumentKind, { label: string; defaultAnnual: number }>> = {
  CRM: { label: "Anuidade CRM", defaultAnnual: 900 },
  CERT_DIGITAL: { label: "Certificado Digital", defaultAnnual: 280 },
};

// INSS — teto contributivo exigido pela regra de negócio do produto para 2026.
export const INSS_CEILING = 8475.55;

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

// ============== Perfil Fiscal (configuração inicial única) ==============
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
  entityDomain: EntityDomain;
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
export type UserRole = "doctor" | "accountant";
export type AccountantAccessStatus = "PENDING" | "GRANTED" | "REVOKED";
export type OnboardingGoal = "ORGANIZAR_PLANTOES" | "OTIMIZAR_IMPOSTOS" | "ECONOMIZAR_TEMPO";

export interface LinkedClient {
  id: string;
  name: string;
  email: string;
}

export interface AccountantClientRequest extends LinkedClient {
  specialtyName?: string;
  requestedAt?: string;
}

export interface UserProfile {
  fullName: string;
  trainingLevel: TrainingLevel;
  specialtyName?: string;
  onboardingGoal?: OnboardingGoal;
  baseAddress: string;
  role: UserRole;
  linkedAccountantEmail?: string;
  accountantAccessStatus?: AccountantAccessStatus;
  activeClientShiftId?: string;
  linkedClients?: LinkedClient[];
}

export interface FatorRHistorySetup {
  previous11MonthsRevenue: number;
  previous11MonthsProLabore: number;
}

export interface StoreState {
  authenticatedUserId?: string | null;
  hasCompletedOnboarding: boolean;
  userProfile: UserProfile;
  taxProfile: TaxProfile;
  fatorRHistorySetup: FatorRHistorySetup;
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
  receivables: Receivable[];
  invoices: Invoice[];
  expenses: ExpenseTransaction[];
}

type NewEntity<T extends { id: string; entityDomain: EntityDomain }> =
  Omit<T, "id" | "entityDomain"> & Partial<Pick<T, "entityDomain">>;
type ExistingEntityInput<T extends { entityDomain: EntityDomain }> =
  Omit<T, "entityDomain"> & Partial<Pick<T, "entityDomain">>;
type NewSurgeryRecord = NewEntity<SurgeryTitular> | NewEntity<SurgeryMembro>;
type VehicleInput = Omit<Vehicle, "entityDomain"> & Partial<Pick<Vehicle, "entityDomain">>;
type WeddingGoalInput = Omit<WeddingGoal, "entityDomain"> & Partial<Pick<WeddingGoal, "entityDomain">>;
export type BatchShiftConsolidationData = {
  taxationType: string;
  paymentStatus: string;
  expectedPaymentDate?: string;
  actualPaymentDate?: string;
  invoiceIssueDate?: string;
  invoiceNumber?: string;
};
export type FeedbackPayload = {
  actionId: string;
  context: FeedbackContext;
  score: number;
  type: FeedbackType;
  comment?: string;
};
export type PersistenceStatus = "synced" | "local";

export interface StoreActions {
  resetStore: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  saveTaxProfile: (p: TaxProfile) => void;
  resetTaxProfile: () => void;
  setBase: (b: StoreState["base"]) => void;
  setVehicle: (v: VehicleInput) => void;
  addWorkplace: (w: NewEntity<Workplace>) => Workplace;
  updateWorkplace: (id: string, patch: Partial<Workplace>) => void;
  removeWorkplace: (id: string) => void;
  addShift: (s: NewEntity<Shift>) => Promise<PersistenceStatus>;
  updateShift: (id: string, patch: Partial<Shift>) => void;
  batchConsolidateShifts: (ids: string[], consolidationData: BatchShiftConsolidationData) => void;
  deleteShift: (id: string) => Promise<PersistenceStatus>;
  removeShift: (id: string) => Promise<PersistenceStatus>;
  addSurgery: (s: NewSurgeryRecord) => void;
  updateSurgery: (id: string, patch: Partial<SurgeryRecord>) => void;
  removeSurgery: (id: string) => void;
  addFixedCost: (c: NewEntity<FixedCost>) => void;
  removeFixedCost: (id: string) => void;
  addFixedIncome: (i: NewEntity<FixedIncome>) => void;
  removeFixedIncome: (id: string) => void;
  addProLabore: (p: NewEntity<ProLabore>) => void;
  removeProLabore: (id: string) => void;
  addDebt: (d: NewEntity<Debt>) => void;
  removeDebt: (id: string) => void;
  setWedding: (w: WeddingGoalInput) => void;
  addGoal: (g: NewEntity<GeneralGoal>) => void;
  updateGoal: (id: string, patch: Partial<GeneralGoal>) => void;
  removeGoal: (id: string) => void;
  addDocument: (d: NewEntity<ComplianceDoc>) => void;
  removeDocument: (id: string) => void;
  addAsset: (a: NewEntity<Asset>) => void;
  removeAsset: (id: string) => void;
  setAssets: (a: Array<ExistingEntityInput<Asset>>) => void;
  addLiability: (l: NewEntity<Liability>) => void;
  removeLiability: (id: string) => void;
  setLiabilities: (l: Array<ExistingEntityInput<Liability>>) => void;
  addExpenses: (expenses: Array<NewEntity<ExpenseTransaction>>) => void;
  updateExpense: (id: string, patch: Partial<ExpenseTransaction>) => void;
  removeExpense: (id: string) => void;
  updateUserProfile: (p: Partial<UserProfile>) => void;
  inviteAccountant: (email: string) => Promise<PersistenceStatus>;
  revokeAccountantAccess: () => Promise<PersistenceStatus>;
  fetchAccountantClientRequests: () => Promise<AccountantClientRequest[]>;
  acceptAccountantClientRequest: (request: AccountantClientRequest) => Promise<PersistenceStatus>;
  rejectAccountantClientRequest: (request: AccountantClientRequest) => Promise<PersistenceStatus>;
  setActiveClient: (clientId?: string) => Promise<PersistenceStatus>;
  loadLinkedClientOperationalState: (clientId: string) => Promise<PersistenceStatus>;
  updateFatorRHistorySetup: (revenue: number, proLabore: number) => void;
  saveFeedback: (payload: FeedbackPayload) => Promise<PersistenceStatus>;
}

type Store = StoreState & StoreActions;

// ============== Utilitários ==============
const uid = () => Math.random().toString(36).slice(2, 10);
const STORAGE_KEY = "docfin.store.v2";
const FEEDBACK_FALLBACK_KEY = "docfin.feedback.pending.v1";

const uuid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

function dbWorkplaceToStore(row: any): Workplace {
  return {
    id: row.id,
    entityDomain: row.entity_domain ?? "PJ",
    name: row.name ?? "",
    address: row.address ?? "",
    lat: Number(row.lat ?? 0),
    lng: Number(row.lng ?? 0),
    regime: row.regime ?? "PJ_SIMPLES",
    hourlyRate: Number(row.hourly_rate ?? 0),
    paymentRule: row.payment_rule ?? "",
    color: row.color ?? undefined,
    cutOffDay: Number(row.cut_off_day ?? 20),
    paymentDay: Number(row.payment_day ?? 5),
    paymentTermDays: Number(row.payment_term_days ?? 15),
  };
}

function storeWorkplaceToDb(userId: string, workplace: Workplace) {
  return {
    id: workplace.id,
    user_id: userId,
    entity_domain: workplace.entityDomain,
    name: workplace.name,
    address: workplace.address,
    lat: workplace.lat,
    lng: workplace.lng,
    regime: workplace.regime,
    hourly_rate: workplace.hourlyRate,
    payment_rule: workplace.paymentRule,
    color: workplace.color ?? null,
    cut_off_day: workplace.cutOffDay,
    payment_day: workplace.paymentDay,
    payment_term_days: workplace.paymentTermDays,
  };
}

function dbShiftToStore(row: any): Shift {
  return normalizeRecordDeductions({
    id: row.id,
    entityDomain: row.entity_domain ?? "PJ",
    recordStatus: row.record_status ?? "consolidated",
    date: row.date,
    workplaceId: row.workplace_id,
    originId: row.origin_id ?? "home",
    hours: Number(row.hours ?? 0),
    gross: Number(row.gross ?? 0),
    procedure: row.procedure ?? undefined,
    taxRegimeOverride: row.tax_regime_override ?? undefined,
    extraCost: Number(row.extra_cost ?? 0),
    deductions: Array.isArray(row.deductions) ? row.deductions : [],
    deductionDescription: row.deduction_description ?? undefined,
    settlementAdjustment: row.settlement_adjustment == null ? undefined : Number(row.settlement_adjustment),
    transportMode: row.transport_mode ?? undefined,
    privateTransportCost: row.private_transport_cost == null ? undefined : Number(row.private_transport_cost),
    commuteHours: row.commute_hours == null ? undefined : Number(row.commute_hours),
    status: row.status ?? undefined,
    coveredBy: row.covered_by ?? undefined,
    expectedPaymentDate: row.expected_payment_date ?? undefined,
    projectedNet: row.projected_net == null ? undefined : Number(row.projected_net),
    projectedPaymentDate: row.projected_payment_date ?? undefined,
    paymentStatus: row.payment_status ?? "PENDING",
    actualPaymentDate: row.actual_payment_date ?? undefined,
    invoiceIssueDate: row.invoice_issue_date ?? undefined,
    invoiceNumber: row.invoice_number ?? undefined,
    agentNotified: row.agent_notified ?? false,
    isFixedShift: row.is_fixed_shift ?? false,
  } as Shift);
}

function storeShiftToDb(userId: string, shift: Shift) {
  return {
    id: shift.id,
    user_id: userId,
    workplace_id: shift.workplaceId,
    entity_domain: shift.entityDomain,
    record_status: shift.recordStatus ?? "consolidated",
    date: shift.date,
    origin_id: shift.originId,
    hours: shift.hours,
    gross: shift.gross,
    procedure: shift.procedure ?? null,
    tax_regime_override: shift.taxRegimeOverride ?? null,
    extra_cost: shift.extraCost ?? 0,
    deductions: shift.deductions ?? [],
    deduction_description: shift.deductionDescription?.trim() || null,
    settlement_adjustment: shift.settlementAdjustment ?? null,
    transport_mode: shift.transportMode ?? null,
    private_transport_cost: shift.privateTransportCost ?? null,
    commute_hours: shift.commuteHours ?? null,
    status: shift.status ?? null,
    covered_by: shift.coveredBy ?? null,
    expected_payment_date: shift.expectedPaymentDate ?? null,
    projected_net: shift.projectedNet ?? null,
    projected_payment_date: shift.projectedPaymentDate ?? null,
    payment_status: shift.paymentStatus ?? "PENDING",
    actual_payment_date: shift.actualPaymentDate ?? null,
    invoice_issue_date: shift.invoiceIssueDate ?? null,
    invoice_number: shift.invoiceNumber ?? null,
    agent_notified: shift.agentNotified ?? false,
    is_fixed_shift: shift.isFixedShift ?? false,
  };
}

function normalizeAccountantStatus(value: unknown): AccountantAccessStatus {
  return value === "PENDING" || value === "GRANTED" || value === "REVOKED" ? value : "REVOKED";
}

function dbProfileToUserProfile(row: any): Partial<UserProfile> {
  return {
    fullName: row.full_name ?? "",
    trainingLevel: row.training_level ?? "Médico Generalista",
    specialtyName: row.specialty_name ?? "",
    onboardingGoal: row.onboarding_goal ?? "ORGANIZAR_PLANTOES",
    baseAddress: row.base_address ?? "",
    role: row.role === "accountant" ? "accountant" : "doctor",
    linkedAccountantEmail: row.linked_accountant_email ?? undefined,
    accountantAccessStatus: normalizeAccountantStatus(row.accountant_access_status),
    activeClientShiftId: row.active_client_shift_id ?? undefined,
    linkedClients: Array.isArray(row.linked_clients) ? row.linked_clients : [],
  };
}

function userProfilePatchToDb(patch: Partial<UserProfile>) {
  const row: Record<string, unknown> = {};
  if ("fullName" in patch) row.full_name = patch.fullName ?? "";
  if ("trainingLevel" in patch) row.training_level = patch.trainingLevel ?? "Médico Generalista";
  if ("specialtyName" in patch) row.specialty_name = patch.specialtyName ?? "";
  if ("onboardingGoal" in patch) row.onboarding_goal = patch.onboardingGoal ?? "ORGANIZAR_PLANTOES";
  if ("baseAddress" in patch) row.base_address = patch.baseAddress ?? "";
  if ("role" in patch) row.role = patch.role ?? "doctor";
  if ("linkedAccountantEmail" in patch) row.linked_accountant_email = patch.linkedAccountantEmail ?? null;
  if ("accountantAccessStatus" in patch) row.accountant_access_status = patch.accountantAccessStatus ?? "REVOKED";
  if ("activeClientShiftId" in patch) row.active_client_shift_id = patch.activeClientShiftId ?? null;
  if ("linkedClients" in patch) row.linked_clients = patch.linkedClients ?? [];
  row.updated_at = new Date().toISOString();
  return row;
}

function dbProfileToClientRequest(row: any): AccountantClientRequest {
  return {
    id: row.id,
    name: row.full_name || "Médico sem nome",
    email: row.email || "",
    specialtyName: row.specialty_name ?? undefined,
    requestedAt: row.updated_at ?? undefined,
  };
}

function uniqueLinkedClients(clients: LinkedClient[]): LinkedClient[] {
  const byId = new Map<string, LinkedClient>();
  for (const client of clients) byId.set(client.id, client);
  return Array.from(byId.values());
}

async function getSupabaseUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    logger.warn("Usuário não autenticado. Mantendo cache local como fallback.", error);
    return null;
  }
  return data.user.id;
}

async function fetchCurrentProfileFromSupabase(): Promise<Partial<UserProfile> | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    logger.warn("Usuário não autenticado. Perfil remoto não carregado.", authError);
    return null;
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .single();
  if (error) {
    logger.warn("Perfil remoto não encontrado. Mantendo perfil local.", error);
    return null;
  }
  return dbProfileToUserProfile(data);
}

async function updateCurrentProfileInSupabase(patch: Partial<UserProfile>): Promise<boolean> {
  const userId = await getSupabaseUserId();
  if (!userId) return false;
  const { error } = await supabase
    .from("profiles")
    .update(userProfilePatchToDb(patch))
    .eq("id", userId);
  if (error) {
    logger.error("Falha ao atualizar perfil no banco.", error);
    return false;
  }
  return true;
}

async function fetchOperationalStateFromSupabase(): Promise<Pick<StoreState, "workplaces" | "shifts"> | null> {
  const userId = await getSupabaseUserId();
  if (!userId) return null;

  const [workplacesResult, shiftsResult] = await Promise.all([
    supabase.from("workplaces").select("*").eq("user_id", userId).order("name", { ascending: true }),
    supabase.from("shifts").select("*").eq("user_id", userId).order("date", { ascending: false }),
  ]);

  if (workplacesResult.error || shiftsResult.error) {
    logger.error("Falha ao carregar dados operacionais. Usando cache local.", {
      workplaces: workplacesResult.error,
      shifts: shiftsResult.error,
    });
    return null;
  }

  logger.info("Dados operacionais carregados do banco.", {
    hospitais: workplacesResult.data?.length ?? 0,
    plantoes: shiftsResult.data?.length ?? 0,
  });

  return {
    workplaces: (workplacesResult.data ?? []).map(dbWorkplaceToStore),
    shifts: (shiftsResult.data ?? []).map(dbShiftToStore),
  };
}

async function fetchOperationalStateForUserFromSupabase(userId: string): Promise<Pick<StoreState, "workplaces" | "shifts"> | null> {
  const [workplacesResult, shiftsResult] = await Promise.all([
    supabase.from("workplaces").select("*").eq("user_id", userId).order("name", { ascending: true }),
    supabase.from("shifts").select("*").eq("user_id", userId).order("date", { ascending: false }),
  ]);

  if (workplacesResult.error || shiftsResult.error) {
    logger.error("Falha ao carregar dados do cliente vinculado.", {
      workplaces: workplacesResult.error,
      shifts: shiftsResult.error,
    });
    return null;
  }

  return {
    workplaces: (workplacesResult.data ?? []).map(dbWorkplaceToStore),
    shifts: (shiftsResult.data ?? []).map(dbShiftToStore),
  };
}

async function fetchAccountantRequestsFromSupabase(): Promise<AccountantClientRequest[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const accountantEmail = authData.user?.email?.trim().toLowerCase();
  if (authError || !accountantEmail) {
    logger.warn("Não foi possível carregar solicitações: contador sem sessão.", authError);
    return [];
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,specialty_name,updated_at")
    .eq("linked_accountant_email", accountantEmail)
    .eq("accountant_access_status", "PENDING")
    .order("updated_at", { ascending: false });
  if (error) {
    logger.error("Falha ao carregar solicitações de clientes.", error);
    return [];
  }
  return (data ?? []).map(dbProfileToClientRequest);
}

async function updateDoctorAccountingStatusInSupabase(doctorId: string, status: AccountantAccessStatus, accountantEmail?: string | null): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({
      linked_accountant_email: accountantEmail ?? null,
      accountant_access_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", doctorId);
  if (error) {
    logger.error("Falha ao atualizar vínculo do médico.", error);
    return false;
  }
  return true;
}

async function insertWorkplaceInSupabase(workplace: Workplace) {
  const userId = await getSupabaseUserId();
  if (!userId) return;
  const { error } = await supabase.from("workplaces").insert(storeWorkplaceToDb(userId, workplace));
  if (error) logger.error("Falha ao inserir hospital no banco.", error);
}

async function updateWorkplaceInSupabase(workplace: Workplace) {
  const userId = await getSupabaseUserId();
  if (!userId) return;
  const { id, user_id: _userId, ...row } = storeWorkplaceToDb(userId, workplace);
  const { error } = await supabase.from("workplaces").update(row).eq("id", id).eq("user_id", userId);
  if (error) logger.error("Falha ao atualizar hospital no banco.", error);
}

async function deleteWorkplaceFromSupabase(id: string) {
  const userId = await getSupabaseUserId();
  if (!userId) return;
  const { error } = await supabase.from("workplaces").delete().eq("id", id).eq("user_id", userId);
  if (error) logger.error("Falha ao remover hospital do banco.", error);
}

async function insertShiftInSupabase(shift: Shift): Promise<boolean> {
  const userId = await getSupabaseUserId();
  if (!userId) return false;
  const { error } = await supabase.from("shifts").insert(storeShiftToDb(userId, shift));
  if (error) {
    logger.error("Falha ao inserir plantão no banco.", error);
    return false;
  }
  return true;
}

async function updateShiftInSupabase(shift: Shift): Promise<boolean> {
  const userId = await getSupabaseUserId();
  if (!userId) return true;
  const { id, user_id: _userId, ...row } = storeShiftToDb(userId, shift);
  const { error } = await supabase.from("shifts").update(row).eq("id", id).eq("user_id", userId);
  if (error) {
    logger.error("Falha ao atualizar plantão no banco.", error);
    return false;
  }
  return true;
}

async function deleteShiftFromSupabase(id: string): Promise<boolean> {
  const userId = await getSupabaseUserId();
  if (!userId) return false;
  const { error } = await supabase.from("shifts").delete().eq("id", id).eq("user_id", userId);
  if (error) {
    logger.error("Falha ao remover plantão no banco.", error);
    return false;
  }
  return true;
}

function persistFeedbackFallback(row: Record<string, unknown>) {
  if (typeof localStorage === "undefined") return;
  try {
    const current = JSON.parse(localStorage.getItem(FEEDBACK_FALLBACK_KEY) || "[]");
    const rows = Array.isArray(current) ? current : [];
    localStorage.setItem(FEEDBACK_FALLBACK_KEY, JSON.stringify([...rows, row]));
  } catch (error) {
    logger.warn("Não foi possível guardar feedback localmente.", error);
  }
}

async function insertFeedbackInSupabase(payload: FeedbackPayload): Promise<PersistenceStatus> {
  const userId = await getSupabaseUserId();
  const row = {
    user_id: userId,
    action_id: payload.actionId,
    context: payload.context,
    score: payload.score,
    type: payload.type,
    comment: payload.comment ?? null,
    created_at: new Date().toISOString(),
  };

  if (!userId) {
    persistFeedbackFallback(row);
    return "local";
  }

  const { error } = await supabase.from("feedback_events").insert(row);
  if (error) {
    logger.warn("Feedback salvo localmente porque o banco não confirmou o envio.", error);
    persistFeedbackFallback(row);
    return "local";
  }

  return "synced";
}

function withEntityDomain<T extends object>(item: T, entityDomain: EntityDomain): T & { entityDomain: EntityDomain } {
  return { ...item, entityDomain };
}

function inferFixedCostDomain(label: string): EntityDomain {
  return /\b(contabilidade|crm|certificado|seguro profissional|pj)\b/i.test(label || "") ? "PJ" : "PF";
}

const asPF = <T extends object>(item: T) => withEntityDomain(item, "PF");
const asPJ = <T extends object>(item: T) => withEntityDomain(item, "PJ");

export function isConsolidatedRecord(record: { recordStatus?: RecordStatus } | null | undefined): boolean {
  return (record?.recordStatus ?? "consolidated") === "consolidated";
}

export function getRecordPaymentStatus(record: { recordStatus?: RecordStatus; paymentStatus?: PaymentStatus } | null | undefined): PaymentStatus {
  if (record?.paymentStatus) return record.paymentStatus;
  return isConsolidatedRecord(record) ? "PAID" : "PENDING";
}

export function getShiftRegime(s: Pick<StoreState, "workplaces">, shift: Shift): TaxRegime {
  return shift.taxRegimeOverride ?? s.workplaces.find((w) => w.id === shift.workplaceId)?.regime ?? "PJ_SIMPLES";
}

const initialState: StoreState = {
  authenticatedUserId: null,
  hasCompletedOnboarding: false,
  userProfile: {
    fullName: "",
    trainingLevel: "Médico Generalista",
    specialtyName: "",
    onboardingGoal: "ORGANIZAR_PLANTOES",
    baseAddress: "Casa",
    role: "doctor",
    accountantAccessStatus: "REVOKED",
    linkedClients: [],
  },
  taxProfile: emptyTaxProfile(),
  fatorRHistorySetup: {
    previous11MonthsRevenue: 0,
    previous11MonthsProLabore: 0,
  },
  base: { label: "Casa", lat: -23.55, lng: -46.63 },
  vehicle: {
    entityDomain: "PF",
    model: "Honda Civic",
    kmPerLiter: 11,
    fuelPrice: 5.89,
    depreciationPerKm: 0.35,
    maintenancePerKm: 0.18,
  },
  workplaces: [
    { id: uid(), entityDomain: "PJ", name: "Hospital São Lucas", address: "Av. Paulista, 1000", lat: -23.561, lng: -46.656, regime: "PJ_SIMPLES", hourlyRate: 280, paymentRule: "FIFTH_BUSINESS_DAY", cutOffDay: 20, paymentDay: 5, paymentTermDays: 15 },
    { id: uid(), entityDomain: "PJ", name: "UPA Leste", address: "R. das Flores, 200", lat: -23.541, lng: -46.611, regime: "PF", hourlyRate: 220, paymentRule: "TENTH_DAY", cutOffDay: 25, paymentDay: 10, paymentTermDays: 15 },
  ],
  shifts: [],
  fixedCosts: [
    { id: uid(), entityDomain: "PJ", label: "Contabilidade PJ", monthly: 350 },
    { id: uid(), entityDomain: "PJ", label: "CRM + Anuidade", monthly: 180 },
    { id: uid(), entityDomain: "PJ", label: "Seguro profissional", monthly: 220 },
  ],
  fixedIncomes: [],
  proLabores: [],
  debts: [],
  wedding: { entityDomain: "PF", enabled: true, targetAmount: 80000, targetDate: "2026-12-12", saved: 12000 },
  goals: [],
  documents: [],
  assets: [],
  liabilities: [],
  surgeries: [],
  receivables: [],
  invoices: [],
  expenses: [],
};

function loadState(): StoreState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);
    const merged: StoreState = { ...initialState, ...parsed };
    merged.userProfile = {
      ...initialState.userProfile,
      ...(merged.userProfile || {}),
      role: merged.userProfile?.role ?? "doctor",
      onboardingGoal: merged.userProfile?.onboardingGoal ?? "ORGANIZAR_PLANTOES",
      accountantAccessStatus: merged.userProfile?.accountantAccessStatus ?? "REVOKED",
      linkedClients: merged.userProfile?.linkedClients ?? [],
    };
    merged.fatorRHistorySetup = {
      ...initialState.fatorRHistorySetup,
      ...(merged.fatorRHistorySetup || {}),
    };
    merged.vehicle = asPF(merged.vehicle || initialState.vehicle);
    merged.wedding = asPF(merged.wedding || initialState.wedding);
    // Migração — garante cutOffDay/paymentDay nos workplaces antigos
    merged.workplaces = (merged.workplaces || []).map((w: any) => ({
      cutOffDay: 20,
      paymentDay: 5,
      paymentTermDays: 15,
      ...w,
      entityDomain: "PJ",
    }));
    merged.shifts = (merged.shifts || []).map((s: any) => normalizeRecordDeductions({
      ...asPJ(s),
      recordStatus: s.recordStatus ?? "consolidated",
      agentNotified: s.agentNotified ?? false,
    }));
    merged.fixedCosts = (merged.fixedCosts || []).map((c: any) => withEntityDomain(c, inferFixedCostDomain(c.label)));
    merged.fixedIncomes = (merged.fixedIncomes || []).map((i: any) => asPF(i));
    merged.proLabores = (merged.proLabores || []).map((p: any) => asPJ(p));
    merged.debts = (merged.debts || []).map((d: any) => asPF(d));
    merged.documents = (merged.documents || []).map((d: any) => asPJ(d));
    merged.assets = (merged.assets || []).map((a: any) => asPF(a));
    merged.liabilities = (merged.liabilities || []).map((l: any) => asPF(l));
    merged.surgeries = (merged.surgeries || []).map((s: any) => normalizeRecordDeductions({ ...asPJ(s), recordStatus: s.recordStatus ?? "consolidated" }));
    merged.receivables = (merged.receivables || []).map((r: any) => ({ ...r, entityDomain: "PJ" }));
    merged.invoices = (merged.invoices || []).map((i: any) => ({ ...i, entityDomain: "PJ" }));
    merged.expenses = (merged.expenses || []).map((e: any) => asPF(e));
    // Migração — garante goals array
    if (!merged.goals) merged.goals = [];
    merged.goals = merged.goals.map((g: any) => asPF(g));
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
    // Falha silenciosa para não bloquear a experiência local.
  }
}

function clearPersistedStoreState() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Falha silenciosa: o reset em memória ainda impede vazamento visual.
  }
}

function normalizeRecordDeductions<T extends { deductions?: Array<Deduction | any> }>(record: T): T {
  if (!Array.isArray(record.deductions)) return record;
  return {
    ...record,
    deductions: record.deductions.map((deduction) => ({
      ...deduction,
      type: deduction.type === "TAXA_ADMINISTRATIVA" ? "TAXA_ADMIN" : deduction.type,
    })),
  };
}

// ============== Geografia / cálculo de plantão ==============
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
    if (!isConsolidatedRecord(shift)) return sum;
    const d = new Date(shift.date + "T12:00:00");
    if (getShiftRegime({ workplaces: s.workplaces ?? [] }, shift) === "PJ_SIMPLES" && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
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
  settlementAdjustment: number;
}

export function calculateTotalDeductions(record: { deductions?: Deduction[]; settlementAdjustment?: number } | null | undefined): number {
  if (!record) return 0;
  if (Array.isArray(record.deductions)) {
    return round2(record.deductions.reduce((sum, deduction) => sum + Math.abs(deduction.amount || 0), 0));
  }
  return round2(Math.abs(record.settlementAdjustment || 0));
}

export const calculateNetValue = (gross: number, deductions?: Deduction[], legacyAdjustment?: number) => {
  const base = Number.isFinite(gross) ? gross : 0;
  if (Array.isArray(deductions)) {
    const structuredTotal = deductions.reduce((sum, deduction) => sum + Math.abs(deduction.amount || 0), 0);
    return round2(base - structuredTotal);
  }
  return round2(base - Math.abs(legacyAdjustment || 0));
};

export function computeShift(s: StoreState, shift: Shift): ShiftMath {
  const wp = s.workplaces.find((w) => w.id === shift.workplaceId);
  const settlementAdjustment = calculateTotalDeductions(shift);
  if (!wp) return { km: 0, fuelCost: 0, wearCost: 0, tax: 0, net: 0, logistics: 0, settlementAdjustment };
  const tax = computeTaxForRegime(shift.gross, getShiftRegime(s, shift), s);
  if (shift.transportMode === "PRIVATE_TRANSPORT") {
    const logistics = Math.max(0, shift.privateTransportCost || 0);
    const net = calculateNetValue(shift.gross - tax - logistics, shift.deductions, shift.settlementAdjustment);
    return { km: 0, fuelCost: 0, wearCost: 0, tax, net, logistics, settlementAdjustment };
  }

  const origin = shift.originId === "home"
    ? s.base
    : (s.workplaces.find((w) => w.id === shift.originId) ?? s.base);
  const oneWayKm = Math.max(0, wp.manualDistanceKm || 0) > 0
    ? Math.max(0, wp.manualDistanceKm || 0)
    : haversine({ lat: origin.lat, lng: origin.lng }, { lat: wp.lat, lng: wp.lng });
  const km = Math.max(2, oneWayKm * 2); // ida e volta, com piso mínimo
  const fuelCost = (km / s.vehicle.kmPerLiter) * s.vehicle.fuelPrice;
  const wearCost = km * (s.vehicle.depreciationPerKm + s.vehicle.maintenancePerKm);
  const logistics = fuelCost + wearCost + (shift.extraCost || 0);
  const net = calculateNetValue(shift.gross - tax - logistics, shift.deductions, shift.settlementAdjustment);
  return { km, fuelCost, wearCost, tax, net, logistics, settlementAdjustment };
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

// ============== Agregações ==============
export const monthlyFixedTotal = (s: StoreState) => s.fixedCosts.reduce((a, c) => a + c.monthly, 0);
export const monthlyFixedIncomeNet = (s: StoreState) => s.fixedIncomes.reduce((a, i) => a + calculateCLTNetMonthly(i.grossMonthly), 0);
export const monthlyFixedIncomeGross = (s: StoreState) => s.fixedIncomes.reduce((a, i) => a + i.grossMonthly, 0);
export const monthlyProLaboreTotal = (s: StoreState) => s.proLabores.reduce((a, p) => a + p.monthly, 0);
export const monthlyFixedIncomeGrossTotal = (s: StoreState) => monthlyCLTGrossTotal(s);
export const inssCeilingReached = (s: StoreState) => inssCeilingReachedByCLT(s);

function expenseMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function listMonthsInRange(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const limit = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= limit) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

export function getExpensesWithDebtInstallmentsForPeriod(
  s: Pick<StoreState, "expenses" | "debts">,
  start: Date,
  end: Date,
): ExpenseWithDebtInstallment[] {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const regularExpenses = (s.expenses || []).filter((expense) => {
    const date = new Date(`${expense.date}T12:00:00`);
    const time = date.getTime();
    return time >= startTime && time <= endTime;
  });

  const virtualDebtInstallments = (s.debts || []).flatMap((debt) => {
    const installment = Math.max(0, debt.monthlyPayment || 0);
    let remainingBalance = Math.max(0, debt.balance || 0);
    if (remainingBalance <= 0 || installment <= 0) return [];

    return listMonthsInRange(start, end).flatMap<DebtInstallmentExpense>((monthDate) => {
      if (remainingBalance <= 0) return [];

      const amount = round2(Math.min(installment, remainingBalance));
      remainingBalance = round2(remainingBalance - amount);
      const isoMonth = expenseMonthKey(monthDate);

      return [{
        id: `debt-installment-${debt.id}-${isoMonth}`,
        entityDomain: debt.entityDomain,
        date: `${isoMonth}-01`,
        description: `Parcela de dívida: ${debt.label}`,
        amount,
        category: "Outros",
        sourceType: "DEBT_INSTALLMENT",
        debtId: debt.id,
        readOnly: true,
      }];
    });
  });

  return [...regularExpenses, ...virtualDebtInstallments]
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getMonthlyExpensesWithDebts(
  s: Pick<StoreState, "expenses" | "debts">,
  month: number,
  year: number,
): ExpenseWithDebtInstallment[] {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return getExpensesWithDebtInstallmentsForPeriod(s, start, end);
}

export function daysUntil(iso: string): number {
  const target = new Date(iso + "T12:00:00").getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}


// ============== Utilitários de data ==============
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

/** Verdadeiro quando o pagamento "pulou" um ciclo (>1 mês após o plantão). */
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

// ============== Roteador Fiscal Inteligente (Fator R) ==============
// Limite legal do Fator R para manter a atividade médica no Anexo III.
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
    if (!isConsolidatedRecord(sh)) continue;
    if (!inMonth(sh.date)) continue;
    if (set.has(getShiftRegime(s, sh))) total += sh.gross;
  }
  for (const sg of s.surgeries) {
    if (!isConsolidatedRecord(sg)) continue;
    if (!inMonth(sg.date)) continue;
    if (sg.myRole !== "TITULAR") continue;
    const wp = s.workplaces.find((w) => w.id === sg.hospitalId);
    if (wp && set.has(wp.regime)) total += sg.totalGross;
  }
  return total;
}

export interface FatorRRollingSnapshot {
  currentMonthRevenue: number;
  currentMonthProLabore: number;
  previous11MonthsRevenueFromStore: number;
  previous11MonthsProLaboreFromStore: number;
  setupRevenue: number;
  setupProLabore: number;
  accumulatedRevenue: number;
  accumulatedProLabore: number;
  targetProLabore: number;
  missingProLabore: number;
  factorRatio: number;
  factorPercent: number;
  progressPercent: number;
  safe: boolean;
  hasRevenue: boolean;
}

export function getRollingFatorRSnapshot(s: StoreState, year: number, month: number): FatorRRollingSnapshot {
  const refDate = new Date(year, month - 1, 1);
  const currentMonthRevenue = getCurrentMonthRegimeTotal(s, year, month, ["PJ_SIMPLES"]);
  const currentMonthProLabore = currentMonthRevenue > 0 ? getFatorRMonthProLabore(s, refDate) : 0;
  let previous11MonthsRevenueFromStore = 0;
  let previous11MonthsProLaboreFromStore = 0;

  for (let offset = 1; offset <= 11; offset += 1) {
    const date = addMonths(refDate, -offset);
    const windowYear = date.getFullYear();
    const windowMonth = date.getMonth() + 1;
    const monthRevenue = getCurrentMonthRegimeTotal(s, windowYear, windowMonth, ["PJ_SIMPLES"]);
    previous11MonthsRevenueFromStore += monthRevenue;
    previous11MonthsProLaboreFromStore += monthRevenue > 0 ? getFatorRMonthProLabore(s, date) : 0;
  }

  const setupRevenue = Math.max(0, s.fatorRHistorySetup?.previous11MonthsRevenue || 0);
  const setupProLabore = Math.max(0, s.fatorRHistorySetup?.previous11MonthsProLabore || 0);
  const accumulatedRevenue = round2(currentMonthRevenue + previous11MonthsRevenueFromStore + setupRevenue);
  const accumulatedProLabore = round2(currentMonthProLabore + previous11MonthsProLaboreFromStore + setupProLabore);
  const targetProLabore = round2(accumulatedRevenue * FATOR_R_PROLABORE_RATIO);
  const missingProLabore = round2(Math.max(0, targetProLabore - accumulatedProLabore));
  const factorRatio = accumulatedRevenue > 0 ? accumulatedProLabore / accumulatedRevenue : 0;
  const factorPercent = round2(factorRatio * 100);
  const progressPercent = targetProLabore > 0 ? Math.min(100, round2((accumulatedProLabore / targetProLabore) * 100)) : 0;
  const hasRevenue = accumulatedRevenue > 0;

  return {
    currentMonthRevenue: round2(currentMonthRevenue),
    currentMonthProLabore: round2(currentMonthProLabore),
    previous11MonthsRevenueFromStore: round2(previous11MonthsRevenueFromStore),
    previous11MonthsProLaboreFromStore: round2(previous11MonthsProLaboreFromStore),
    setupRevenue,
    setupProLabore,
    accumulatedRevenue,
    accumulatedProLabore,
    targetProLabore,
    missingProLabore,
    factorRatio,
    factorPercent,
    progressPercent,
    safe: hasRevenue && factorRatio >= FATOR_R_PROLABORE_RATIO,
    hasRevenue,
  };
}

function getFatorRMonthProLabore(s: StoreState, ref: Date): number {
  void ref;
  return s.proLabores.reduce((sum, item) => sum + (item.monthly || 0), 0);
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
  for (const sh of s.shifts) if (isConsolidatedRecord(sh) && inMonth(sh.date)) total += sh.gross;
  for (const sg of s.surgeries) {
    if (!isConsolidatedRecord(sg)) continue;
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
    if (!isConsolidatedRecord(sh)) continue;
    if (!inMonth(sh.date)) continue;
    if (isPJ(getShiftRegime(s, sh))) total += sh.gross;
  }
  for (const sg of s.surgeries) {
    if (!isConsolidatedRecord(sg)) continue;
    if (!inMonth(sg.date)) continue;
    if (sg.myRole !== "TITULAR") continue;
    const wp = s.workplaces.find((w) => w.id === sg.hospitalId);
    if (wp && isPJ(wp.regime)) total += sg.totalGross;
  }
  return total;
}

// ============== Relatório de Fechamento Mensal ==============
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
    if (!isConsolidatedRecord(sh)) continue;
    if (!sh.invoiceIssueDate || !inMonth(sh.invoiceIssueDate)) continue;
    const wp = s.workplaces.find((w) => w.id === sh.workplaceId);
    if (!wp) continue;
    const row = ensureRow(wp.id, wp.name, getShiftRegime(s, sh));
    row.shiftsCount += 1;
    row.gross += sh.gross;
    totalShifts += 1;
  }

  // Cirurgias TITULAR — atribuídas ao hospital pagador
  let totalSurgeries = 0;
  for (const sg of s.surgeries) {
    if (!isConsolidatedRecord(sg)) continue;
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

// ============== Moeda ==============
export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const brl2 = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ============== Renda Global (soma de todas as fontes do perfil fiscal) ==============
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
  if (!tp || !tp.completed) return true; // Padrão PJ quando o perfil fiscal não existe ou não foi concluído.
  const hasPJ = tp.sources.PJ.enabled && tp.sources.PJ.monthly > 0;
  const hasPFCLT = (tp.sources.RPA.enabled && tp.sources.RPA.monthly > 0) || (tp.sources.CLT.enabled && tp.sources.CLT.monthly > 0);
  return hasPJ && !hasPFCLT; // Foco PJ quando há renda PJ e não há renda PF/CLT.
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

// ============== Contexto ==============
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(() => loadState());

  useEffect(() => { saveState(state); }, [state]);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromSupabase = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id ?? null;
      if (authError || !currentUserId) {
        if (!cancelled) setState({ ...initialState });
        return;
      }

      setState((previous) => {
        if (previous.authenticatedUserId && previous.authenticatedUserId !== currentUserId) {
          return { ...initialState, authenticatedUserId: currentUserId };
        }
        return { ...previous, authenticatedUserId: currentUserId };
      });

      const [remoteProfile, remoteState] = await Promise.all([
        fetchCurrentProfileFromSupabase(),
        fetchOperationalStateFromSupabase(),
      ]);
      if (cancelled) return;
      setState((previous) => ({
        ...previous,
        authenticatedUserId: currentUserId,
        userProfile: remoteProfile ? { ...previous.userProfile, ...remoteProfile } : previous.userProfile,
        workplaces: remoteState?.workplaces ?? previous.workplaces,
        shifts: remoteState?.shifts ?? previous.shifts,
      }));
    };

    void hydrateFromSupabase();

    return () => {
      cancelled = true;
    };
  }, []);

  const actions: StoreActions = {
    resetStore: () => {
      clearPersistedStoreState();
      setState({ ...initialState });
    },
    completeOnboarding: () => setState((p) => ({ ...p, hasCompletedOnboarding: true })),
    resetOnboarding: () => setState((p) => ({ ...p, hasCompletedOnboarding: false })),
    saveTaxProfile: (taxProfile) => setState((p) => ({ ...p, taxProfile: { ...taxProfile, completed: true } })),
    resetTaxProfile: () => setState((p) => ({ ...p, taxProfile: emptyTaxProfile() })),
    setBase: (base) => setState((p) => ({ ...p, base })),
    setVehicle: (vehicle) => setState((p) => ({ ...p, vehicle: asPF(vehicle) })),
    addWorkplace: (w) => {
      const workplace: Workplace = { id: uuid(), ...w, entityDomain: "PJ" };
      void insertWorkplaceInSupabase(workplace);
      setState((p) => ({ ...p, workplaces: [...p.workplaces, workplace] }));
      return workplace;
    },
    updateWorkplace: (id, patch) => {
      const nextWorkplace = state.workplaces.find((w) => w.id === id);
      if (nextWorkplace) void updateWorkplaceInSupabase({ ...nextWorkplace, ...patch });
      setState((p) => ({ ...p, workplaces: p.workplaces.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
    },
    removeWorkplace: (id) => {
      void deleteWorkplaceFromSupabase(id);
      setState((p) => ({ ...p, workplaces: p.workplaces.filter((w) => w.id !== id) }));
    },
    addShift: async (s) => {
      const wp = state.workplaces.find((w) => w.id === s.workplaceId);
      const expectedPaymentDate = wp ? fmtISO(calculateExpectedPaymentDate(s.date, wp)) : undefined;
      const finalExpectedPaymentDate = s.expectedPaymentDate ?? expectedPaymentDate;
      const shift: Shift = {
        id: uuid(),
        recordStatus: "consolidated",
        ...s,
        paymentStatus: s.recordStatus === "draft" ? s.paymentStatus : (s.paymentStatus ?? "PENDING"),
        expectedPaymentDate: finalExpectedPaymentDate,
        projectedPaymentDate: s.projectedPaymentDate ?? finalExpectedPaymentDate,
        agentNotified: s.agentNotified ?? false,
        entityDomain: "PJ",
      };
      const syncPromise = insertShiftInSupabase(shift);
      setState((p) => ({ ...p, shifts: [...p.shifts, shift] }));
      return await syncPromise ? "synced" : "local";
    },
    updateShift: (id, patch) => {
      const currentShift = state.shifts.find((s) => s.id === id);
      let optimisticShift: Shift | null = null;
      if (currentShift) {
        const nextShift: Shift = { ...currentShift, ...patch };
        const wp = state.workplaces.find((w) => w.id === nextShift.workplaceId);
        const hasManualExpectedPayment = typeof patch.expectedPaymentDate === "string" && patch.expectedPaymentDate.length > 0;
        if (hasManualExpectedPayment) {
          nextShift.projectedPaymentDate = patch.projectedPaymentDate ?? patch.expectedPaymentDate;
        } else if (wp) {
          nextShift.expectedPaymentDate = fmtISO(calculateExpectedPaymentDate(nextShift.date, wp));
          nextShift.projectedPaymentDate = patch.projectedPaymentDate ?? nextShift.expectedPaymentDate;
        }
        optimisticShift = nextShift;
      }
      setState((p) => ({
        ...p,
        shifts: p.shifts.map((s) => {
          if (s.id !== id) return s;
          const next = { ...s, ...patch };
          const wp = p.workplaces.find((w) => w.id === next.workplaceId);
          const hasManualExpectedPayment = typeof patch.expectedPaymentDate === "string" && patch.expectedPaymentDate.length > 0;
          if (hasManualExpectedPayment) {
            next.projectedPaymentDate = patch.projectedPaymentDate ?? patch.expectedPaymentDate;
          } else if (wp) {
            next.expectedPaymentDate = fmtISO(calculateExpectedPaymentDate(next.date, wp));
            next.projectedPaymentDate = patch.projectedPaymentDate ?? next.expectedPaymentDate;
          }
          return next;
        }),
      }));
      if (currentShift && optimisticShift) {
        void updateShiftInSupabase(optimisticShift).then((synced) => {
          if (synced) return;
          setState((p) => ({
            ...p,
            shifts: p.shifts.map((shift) => (shift.id === id ? currentShift : shift)),
          }));
        });
      }
    },
    batchConsolidateShifts: (ids, consolidationData) => {
      const selected = new Set(ids);
      const previousShifts = state.shifts;
      const nextSyncedShifts = state.shifts
        .filter((shift) => selected.has(shift.id))
        .map((shift) => {
          const next: Shift = {
            ...shift,
            recordStatus: "consolidated",
            taxRegimeOverride: consolidationData.taxationType as TaxRegime,
            paymentStatus: consolidationData.paymentStatus as PaymentStatus,
            actualPaymentDate: consolidationData.paymentStatus === "PAID" ? (consolidationData.actualPaymentDate ?? fmtISO(new Date())) : undefined,
            invoiceIssueDate: consolidationData.invoiceIssueDate,
            invoiceNumber: consolidationData.invoiceNumber,
          };
          if (consolidationData.expectedPaymentDate) {
            next.expectedPaymentDate = consolidationData.expectedPaymentDate;
            next.projectedPaymentDate = consolidationData.expectedPaymentDate;
          }
          return next;
        });
      setState((p) => {
        const selected = new Set(ids);
        return {
          ...p,
          shifts: p.shifts.map((shift) => {
            if (!selected.has(shift.id)) return shift;
            const next: Shift = {
              ...shift,
              recordStatus: "consolidated",
              taxRegimeOverride: consolidationData.taxationType as TaxRegime,
              paymentStatus: consolidationData.paymentStatus as PaymentStatus,
              actualPaymentDate: consolidationData.paymentStatus === "PAID" ? (consolidationData.actualPaymentDate ?? fmtISO(new Date())) : undefined,
              invoiceIssueDate: consolidationData.invoiceIssueDate,
              invoiceNumber: consolidationData.invoiceNumber,
            };
            if (consolidationData.expectedPaymentDate) {
              next.expectedPaymentDate = consolidationData.expectedPaymentDate;
              next.projectedPaymentDate = consolidationData.expectedPaymentDate;
            }
            return next;
          }),
        };
      });
      void Promise.all(nextSyncedShifts.map((shift) => updateShiftInSupabase(shift))).then((results) => {
        if (results.every(Boolean)) return;
        setState((p) => ({ ...p, shifts: previousShifts }));
      });
    },
    deleteShift: async (id) => {
      const synced = await deleteShiftFromSupabase(id);
      if (!synced) return "local";
      setState((p) => ({ ...p, shifts: p.shifts.filter((shift) => shift.id !== id) }));
      return "synced";
    },
    removeShift: async (id) => {
      const synced = await deleteShiftFromSupabase(id);
      if (!synced) return "local";
      setState((p) => ({ ...p, shifts: p.shifts.filter((shift) => shift.id !== id) }));
      return "synced";
    },
    addSurgery: (s) => setState((p) => ({ ...p, surgeries: [...p.surgeries, { id: uid(), recordStatus: "consolidated", ...s, paymentStatus: s.paymentStatus ?? "PENDING", entityDomain: "PJ" } as SurgeryRecord] })),
    updateSurgery: (id, patch) =>
      setState((p) => ({ ...p, surgeries: p.surgeries.map((s) => (s.id === id ? ({ ...s, ...patch } as SurgeryRecord) : s)) })),
    removeSurgery: (id) => setState((p) => ({ ...p, surgeries: p.surgeries.filter((s) => s.id !== id) })),
    addFixedCost: (c) => setState((p) => ({ ...p, fixedCosts: [...p.fixedCosts, { id: uid(), ...c, entityDomain: inferFixedCostDomain(c.label) }] })),
    removeFixedCost: (id) => setState((p) => ({ ...p, fixedCosts: p.fixedCosts.filter((c) => c.id !== id) })),
    addFixedIncome: (i) => setState((p) => ({
      ...p,
      fixedIncomes: [...p.fixedIncomes, { id: uid(), ...i, netMonthly: calculateCLTNetMonthly(i.grossMonthly), entityDomain: "PF" }],
    })),
    removeFixedIncome: (id) => setState((p) => ({ ...p, fixedIncomes: p.fixedIncomes.filter((i) => i.id !== id) })),
    addProLabore: (p2) => setState((p) => ({ ...p, proLabores: [...p.proLabores, { id: uid(), ...p2, entityDomain: "PJ" }] })),
    removeProLabore: (id) => setState((p) => ({ ...p, proLabores: p.proLabores.filter((x) => x.id !== id) })),
    addDebt: (d) => setState((p) => ({ ...p, debts: [...p.debts, { id: uid(), ...d, entityDomain: "PF" }] })),
    removeDebt: (id) => setState((p) => ({ ...p, debts: p.debts.filter((d) => d.id !== id) })),
    setWedding: (wedding) => setState((p) => ({ ...p, wedding: asPF(wedding) })),
    addGoal: (g) => setState((p) => ({ ...p, goals: [...p.goals, { id: uid(), ...g, entityDomain: "PF" }] })),
    updateGoal: (id, patch) => setState((p) => ({ ...p, goals: p.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
    removeGoal: (id) => setState((p) => ({ ...p, goals: p.goals.filter((g) => g.id !== id) })),
    addDocument: (d) => setState((p) => ({ ...p, documents: [...p.documents, { id: uid(), ...d, entityDomain: "PJ" }] })),
    removeDocument: (id) => setState((p) => ({ ...p, documents: p.documents.filter((d) => d.id !== id) })),
    addAsset: (a) => setState((p) => ({ ...p, assets: [...p.assets, { id: uid(), ...a, entityDomain: "PF" }] })),
    removeAsset: (id) => setState((p) => ({ ...p, assets: p.assets.filter((a) => a.id !== id) })),
    setAssets: (assets) => setState((p) => ({ ...p, assets: assets.map((asset) => asPF(asset)) })),
    addLiability: (l) => setState((p) => ({ ...p, liabilities: [...p.liabilities, { id: uid(), ...l, entityDomain: "PF" }] })),
    removeLiability: (id) => setState((p) => ({ ...p, liabilities: p.liabilities.filter((l) => l.id !== id) })),
    setLiabilities: (liabilities) => setState((p) => ({ ...p, liabilities: liabilities.map((liability) => asPF(liability)) })),
    addExpenses: (expenses) => setState((p) => ({
      ...p,
      expenses: [
        ...p.expenses,
        ...expenses.map((expense) => ({ id: uid(), ...expense, amount: Math.abs(expense.amount || 0), entityDomain: "PF" })),
      ],
    })),
    updateExpense: (id, patch) => setState((p) => ({
      ...p,
      expenses: p.expenses.map((expense) => (expense.id === id ? { ...expense, ...patch, amount: patch.amount === undefined ? expense.amount : Math.abs(patch.amount || 0) } : expense)),
    })),
    removeExpense: (id) => setState((p) => ({ ...p, expenses: p.expenses.filter((expense) => expense.id !== id) })),
    updateUserProfile: (profile) => {
      setState((p) => ({ ...p, userProfile: { ...p.userProfile, ...profile } }));
      void updateCurrentProfileInSupabase(profile);
    },
    inviteAccountant: async (email) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) return "local";
      const previousProfile = state.userProfile;
      const nextProfile: Partial<UserProfile> = {
        linkedAccountantEmail: normalizedEmail,
        accountantAccessStatus: "PENDING",
      };
      setState((p) => ({ ...p, userProfile: { ...p.userProfile, ...nextProfile } }));
      const synced = await updateCurrentProfileInSupabase(nextProfile);
      if (!synced) {
        setState((p) => ({ ...p, userProfile: previousProfile }));
        return "local";
      }
      return "synced";
    },
    revokeAccountantAccess: async () => {
      const previousProfile = state.userProfile;
      const nextProfile: Partial<UserProfile> = {
        linkedAccountantEmail: undefined,
        accountantAccessStatus: "REVOKED",
      };
      setState((p) => ({ ...p, userProfile: { ...p.userProfile, ...nextProfile } }));
      const synced = await updateCurrentProfileInSupabase(nextProfile);
      if (!synced) {
        setState((p) => ({ ...p, userProfile: previousProfile }));
        return "local";
      }
      return "synced";
    },
    fetchAccountantClientRequests: () => fetchAccountantRequestsFromSupabase(),
    acceptAccountantClientRequest: async (request) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const accountantEmail = authData.user?.email?.trim().toLowerCase();
      if (authError || !accountantEmail) return "local";

      const previousProfile = state.userProfile;
      const nextClients = uniqueLinkedClients([
        ...(state.userProfile.linkedClients ?? []),
        { id: request.id, name: request.name, email: request.email },
      ]);
      setState((p) => ({
        ...p,
        userProfile: {
          ...p.userProfile,
          linkedClients: uniqueLinkedClients([...(p.userProfile.linkedClients ?? []), { id: request.id, name: request.name, email: request.email }]),
          activeClientShiftId: p.userProfile.activeClientShiftId ?? request.id,
        },
      }));

      const doctorSynced = await updateDoctorAccountingStatusInSupabase(request.id, "GRANTED", accountantEmail);
      const accountantSynced = await updateCurrentProfileInSupabase({
        linkedClients: nextClients,
        activeClientShiftId: previousProfile.activeClientShiftId ?? request.id,
      });
      if (!doctorSynced || !accountantSynced) {
        setState((p) => ({ ...p, userProfile: previousProfile }));
        return "local";
      }
      return "synced";
    },
    rejectAccountantClientRequest: async (request) => {
      const synced = await updateDoctorAccountingStatusInSupabase(request.id, "REVOKED", null);
      return synced ? "synced" : "local";
    },
    setActiveClient: async (clientId) => {
      const previousProfile = state.userProfile;
      setState((p) => ({ ...p, userProfile: { ...p.userProfile, activeClientShiftId: clientId } }));
      const synced = await updateCurrentProfileInSupabase({ activeClientShiftId: clientId });
      if (!synced) {
        setState((p) => ({ ...p, userProfile: previousProfile }));
        return "local";
      }
      return "synced";
    },
    loadLinkedClientOperationalState: async (clientId) => {
      const isLinkedClient = (state.userProfile.linkedClients ?? []).some((client) => client.id === clientId);
      if (state.userProfile.role !== "accountant" || !isLinkedClient) return "local";
      const remoteState = await fetchOperationalStateForUserFromSupabase(clientId);
      if (!remoteState) return "local";
      setState((p) => ({
        ...p,
        workplaces: remoteState.workplaces,
        shifts: remoteState.shifts,
      }));
      return "synced";
    },
    updateFatorRHistorySetup: (revenue, proLabore) => setState((p) => ({
      ...p,
      fatorRHistorySetup: {
        previous11MonthsRevenue: Math.max(0, revenue || 0),
        previous11MonthsProLabore: Math.max(0, proLabore || 0),
      },
    })),
    saveFeedback: async (payload) => insertFeedbackInSupabase(payload),
  };

  return <StoreContext.Provider value={{ ...state, ...actions }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// ============== Utilitários de metas ==============
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
