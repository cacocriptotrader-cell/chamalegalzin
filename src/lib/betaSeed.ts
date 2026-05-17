import {
  calculateExpectedPaymentDate,
  fmtISO,
  type Asset,
  type ComplianceDoc,
  type ExpenseTransaction,
  type FixedCost,
  type FixedIncome,
  type GeneralGoal,
  type Liability,
  type ProLabore,
  type Shift,
  type StoreState,
  type SurgeryRecord,
  type TaxProfile,
  type Vehicle,
  type WeddingGoal,
  type Workplace,
} from "@/lib/store";

const STORAGE_KEY = "docfin.store.v2";

type BetaSeedOptions = {
  reload?: boolean;
};

declare global {
  interface Window {
    inject90DaysBetaState?: (options?: BetaSeedOptions) => StoreState;
  }
}

const uid = (prefix: string, index: number) => `${prefix}-${String(index).padStart(3, "0")}`;

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const round2 = (value: number) => Math.round(value * 100) / 100;

export function build90DaysBetaState(referenceDate: Date = new Date()): StoreState {
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 12, 0, 0, 0);
  const currentMonth = monthStart(ref);
  const previousMonth = addMonths(currentMonth, -1);
  const twoMonthsAgo = addMonths(currentMonth, -2);
  const nextMonth = addMonths(currentMonth, 1);

  const workplaces: Workplace[] = [
    {
      id: "beta-hospital-aura",
      entityDomain: "PJ",
      name: "Hospital Aura Anestesia",
      address: "Av. Paulista, 1842",
      lat: -23.5614,
      lng: -46.6559,
      regime: "PJ_SIMPLES",
      hourlyRate: 310,
      paymentRule: "INSTANT_D0",
      color: "#deff9a",
      cutOffDay: 31,
      paymentDay: 1,
      paymentTermDays: 0,
    },
    {
      id: "beta-hospital-vita",
      entityDomain: "PJ",
      name: "Hospital Vita Jardins",
      address: "R. Estados Unidos, 900",
      lat: -23.5722,
      lng: -46.6699,
      regime: "PJ_SIMPLES",
      hourlyRate: 295,
      paymentRule: "D30",
      color: "#93c5fd",
      cutOffDay: 20,
      paymentDay: 20,
      paymentTermDays: 30,
    },
    {
      id: "beta-hospital-santa-helena",
      entityDomain: "PJ",
      name: "Santa Helena Day Clinic",
      address: "R. Vergueiro, 3185",
      lat: -23.5906,
      lng: -46.6351,
      regime: "PJ_LUCRO_PRESUMIDO",
      hourlyRate: 340,
      paymentRule: "D60",
      color: "#c4b5fd",
      cutOffDay: 15,
      paymentDay: 15,
      paymentTermDays: 60,
    },
    {
      id: "beta-hospital-municipal",
      entityDomain: "PJ",
      name: "Pronto Atendimento Municipal Leste",
      address: "Av. Sapopemba, 7400",
      lat: -23.5892,
      lng: -46.5018,
      regime: "RPA",
      hourlyRate: 245,
      paymentRule: "D30_RPA",
      color: "#fda4af",
      cutOffDay: 25,
      paymentDay: 10,
      paymentTermDays: 30,
    },
  ];

  const shiftOffsets = [
    -59, -57, -55, -53, -51, -49, -47, -45, -43, -41, -39, -37, -35, -33, -31,
    -29, -27, -25, -23, -21, -19, -17, -15, -13, -11, -9, -7, -5, -3, -1,
    1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29,
  ];

  const shifts: Shift[] = shiftOffsets.map((offset, index) => {
    const workplace = workplaces[index % workplaces.length];
    const hours = [6, 8, 12, 12, 10][index % 5];
    const date = fmtISO(addDays(ref, offset));
    const privateTransport = index % 3 !== 1;
    const expectedPaymentDate = fmtISO(calculateExpectedPaymentDate(date, workplace));
    return {
      id: uid("beta-shift", index + 1),
      entityDomain: "PJ",
      recordStatus: "consolidated",
      date,
      workplaceId: workplace.id,
      originId: "home",
      hours,
      gross: round2(hours * workplace.hourlyRate + (index % 4 === 0 ? 420 : 0)),
      extraCost: privateTransport ? 0 : [22, 35, 48][index % 3],
      transportMode: privateTransport ? "PRIVATE_TRANSPORT" : "PERSONAL_VEHICLE",
      privateTransportCost: privateTransport ? [86, 124, 168, 210][index % 4] : 0,
      commuteHours: privateTransport ? 1.2 : 1.7,
      status: index % 13 === 0 ? "REPASSADO" : index % 17 === 0 ? "BUSCANDO_SUBSTITUTO" : "CONFIRMADO",
      coveredBy: index % 13 === 0 ? ["Dra. Marina", "Dr. Felipe", "Dra. Aline"][index % 3] : undefined,
      expectedPaymentDate,
      projectedPaymentDate: expectedPaymentDate,
    };
  });

  const surgeries: SurgeryRecord[] = [
    {
      id: "beta-surgery-001",
      entityDomain: "PJ",
      recordStatus: "consolidated",
      date: fmtISO(addDays(ref, -52)),
      myRole: "TITULAR",
      hospitalId: "beta-hospital-vita",
      procedure: "Colecistectomia videolaparoscópica",
      totalGross: 6800,
      invoiceMode: "SINGLE",
      receivedFromHospital: true,
      notes: "Equipe reduzida, pagamento D+30.",
      teamSplit: [
        { id: "tm-001", name: "Dr. Bruno", role: "Cirurgião auxiliar", amountDue: 1200, isPaid: true },
        { id: "tm-002", name: "Instrumentação externa", role: "Instrumentador", amountDue: 650, isPaid: true },
      ],
    },
    {
      id: "beta-surgery-002",
      entityDomain: "PJ",
      recordStatus: "consolidated",
      date: fmtISO(addDays(ref, -34)),
      myRole: "MEMBRO_EQUIPE",
      payingSurgeonName: "Dr. Renato Salles",
      procedure: "Herniorrafia inguinal",
      myExpectedShare: 1850,
      isReceived: true,
      notes: "Repasse recebido com 12 dias de atraso.",
    },
    {
      id: "beta-surgery-003",
      entityDomain: "PJ",
      recordStatus: "consolidated",
      date: fmtISO(addDays(ref, -16)),
      myRole: "TITULAR",
      hospitalId: "beta-hospital-santa-helena",
      procedure: "Artroscopia de joelho",
      totalGross: 9200,
      invoiceMode: "FRACTIONED",
      receivedFromHospital: false,
      notes: "Nota fracionada, previsão longa de pagamento.",
      teamSplit: [
        { id: "tm-003", name: "Dra. Paula", role: "Auxiliar", amountDue: 1600, isPaid: false },
        { id: "tm-004", name: "Dr. Leo", role: "Cirurgião", amountDue: 2200, isPaid: false },
      ],
    },
    {
      id: "beta-surgery-004",
      entityDomain: "PJ",
      recordStatus: "consolidated",
      date: fmtISO(addDays(ref, 8)),
      myRole: "MEMBRO_EQUIPE",
      payingSurgeonName: "Dra. Vanessa Prado",
      procedure: "Mamoplastia redutora",
      myExpectedShare: 2400,
      isReceived: false,
      notes: "Plantão encaixado pós-enfermaria.",
    },
    {
      id: "beta-surgery-005",
      entityDomain: "PJ",
      recordStatus: "consolidated",
      date: fmtISO(addDays(ref, 22)),
      myRole: "TITULAR",
      hospitalId: "beta-hospital-aura",
      procedure: "Endoscopia terapêutica",
      totalGross: 5100,
      invoiceMode: "SINGLE",
      receivedFromHospital: false,
      notes: "Pagamento D+0 por contrato particular do centro.",
      teamSplit: [
        { id: "tm-005", name: "Enf. Joana", role: "Sala", amountDue: 480, isPaid: false },
      ],
    },
  ];

  const fixedCosts: FixedCost[] = [
    { id: "beta-cost-contabilidade", entityDomain: "PJ", label: "Contabilidade PJ", monthly: 580 },
    { id: "beta-cost-crm", entityDomain: "PJ", label: "CRM + Anuidade", monthly: 210 },
    { id: "beta-cost-seguro", entityDomain: "PJ", label: "Seguro profissional", monthly: 340 },
    { id: "beta-cost-certificado", entityDomain: "PJ", label: "Certificado Digital PJ", monthly: 39 },
    { id: "beta-cost-coworking", entityDomain: "PF", label: "Coworking de estudo", monthly: 260 },
  ];

  const proLabores: ProLabore[] = [
    { id: "beta-prolabore-r3", entityDomain: "PJ", label: "Pró-labore R3 beta", monthly: 9800 },
  ];

  const fixedIncomes: FixedIncome[] = [
    { id: "beta-fixed-income-residencia", entityDomain: "PF", label: "Bolsa residência R3", grossMonthly: 4200, netMonthly: 3970 },
  ];

  const expenses = buildExpenses(ref);

  const documents: ComplianceDoc[] = [
    { id: "beta-doc-crm", entityDomain: "PJ", kind: "CRM", label: "CRM-SP 2026", expiresAt: fmtISO(addDays(ref, 34)), renewalCost: 1120 },
    { id: "beta-doc-cert", entityDomain: "PJ", kind: "CERT_DIGITAL", label: "e-CNPJ Docfin Beta", expiresAt: fmtISO(addDays(ref, 18)), renewalCost: 310 },
    { id: "beta-doc-seguro", entityDomain: "PJ", kind: "MALPRACTICE", label: "Seguro responsabilidade civil", expiresAt: fmtISO(addDays(ref, 58)), renewalCost: 3280 },
    { id: "beta-doc-acls", entityDomain: "PJ", kind: "ACLS_BLS", label: "ACLS", expiresAt: fmtISO(addDays(ref, -3)), renewalCost: 980 },
  ];

  const assets: Asset[] = [
    { id: "beta-asset-rf", entityDomain: "PF", category: "Renda Fixa", description: "Tesouro Selic e CDB reserva de emergência", currentValue: 84250 },
    { id: "beta-asset-rv", entityDomain: "PF", category: "Renda Variável", description: "FIIs e ações importados da DIRPF beta", currentValue: 38640 },
    { id: "beta-asset-car", entityDomain: "PF", category: "Veículo", description: "Honda HR-V 2023", currentValue: 118000 },
    { id: "beta-asset-crypto", entityDomain: "PF", category: "Cripto", description: "USDC reserva internacional", currentValue: 21400, ticker: "USDC", yieldAPY: 4.8 },
  ];

  const liabilities: Liability[] = [
    { id: "beta-liability-vehicle", entityDomain: "PF", category: "Financiamento Veículo", description: "Saldo financiamento HR-V", totalAmount: 72000, remainingBalance: 51800, interestRate: 14.2 },
    { id: "beta-liability-loan", entityDomain: "PF", category: "Empréstimo", description: "Empréstimo especialização", totalAmount: 26000, remainingBalance: 18400, interestRate: 18.7 },
  ];

  const goals: GeneralGoal[] = [
    { id: "beta-goal-fellowship", entityDomain: "PF", name: "Fellowship em dor", category: "Educação", targetAmount: 60000, targetDate: fmtISO(addMonths(ref, 13)), saved: 18500 },
    { id: "beta-goal-viagem", entityDomain: "PF", name: "Férias pós-R3", category: "Viagem", targetAmount: 22000, targetDate: fmtISO(addMonths(ref, 7)), saved: 9200 },
  ];

  const vehicle: Vehicle = {
    entityDomain: "PF",
    model: "Honda HR-V 2023",
    kmPerLiter: 10.5,
    fuelPrice: 6.09,
    depreciationPerKm: 0.42,
    maintenancePerKm: 0.22,
  };

  const wedding: WeddingGoal = {
    entityDomain: "PF",
    enabled: false,
    targetAmount: 0,
    targetDate: fmtISO(addMonths(ref, 18)),
    saved: 0,
  };

  const taxProfile: TaxProfile = {
    completed: true,
    sources: {
      PJ: { enabled: true, monthly: 52000 },
      CLT: { enabled: true, monthly: 4200 },
      RPA: { enabled: true, monthly: 6500 },
      PARTICULAR: { enabled: true, monthly: 3500 },
      SCP: { enabled: true, monthly: 2400 },
    },
  };

  return {
    hasCompletedOnboarding: true,
    userProfile: {
      fullName: "Dra. Thais Azevedo",
      trainingLevel: "Residente",
      specialtyName: "Anestesiologia R3",
      baseAddress: "Vila Mariana, São Paulo",
    },
    taxProfile,
    base: { label: "Casa - Vila Mariana", lat: -23.5897, lng: -46.6346 },
    vehicle,
    workplaces,
    shifts,
    fixedCosts,
    fixedIncomes,
    proLabores,
    debts: [
      { id: "beta-debt-cartao", entityDomain: "PF", label: "Parcelamento cartão congresso", balance: 6200, annualRate: 19.8, monthlyPayment: 780 },
      { id: "beta-debt-curso", entityDomain: "PF", label: "Curso de ultrassom point-of-care", balance: 11800, annualRate: 12.5, monthlyPayment: 980 },
    ],
    wedding,
    goals,
    documents,
    assets,
    liabilities,
    surgeries,
    receivables: [],
    invoices: [],
    expenses,
  };
}

export function inject90DaysBetaState(options: BetaSeedOptions = {}): StoreState {
  const { reload = true } = options;
  const state = build90DaysBetaState();
  if (typeof window === "undefined") return state;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  console.info("[DocFin Beta] Estado de stress test 90 dias injetado", {
    shifts: state.shifts.length,
    surgeries: state.surgeries.length,
    expenses: state.expenses.length,
    workplaces: state.workplaces.length,
  });
  if (reload) window.location.reload();
  return state;
}

export function installBetaSeedConsoleHook() {
  if (typeof window === "undefined") return;
  if (window.inject90DaysBetaState) return;
  window.inject90DaysBetaState = inject90DaysBetaState;
}

function buildExpenses(ref: Date): ExpenseTransaction[] {
  const templates: Array<Omit<ExpenseTransaction, "id" | "entityDomain" | "date"> & { offset: number }> = [
    { offset: -58, description: "UBER BLACK HOSPITAL AURA", amount: 118.9, category: "Transporte", sourceType: "MANUAL" },
    { offset: -55, description: "CREMESP anuidade parcela", amount: 186.7, category: "CRM/Sociedades", sourceType: "CSV", sourceFileName: "nubank-maio.csv" },
    { offset: -51, description: "IFOOD pós-plantão noturno", amount: 74.2, category: "Alimentação", sourceType: "CSV", sourceFileName: "nubank-maio.csv" },
    { offset: -48, description: "99 TAXI retorno PA Municipal", amount: 92.5, category: "Transporte", sourceType: "MANUAL" },
    { offset: -44, description: "SBA sociedade anestesiologia", amount: 95, category: "CRM/Sociedades", sourceType: "CSV", sourceFileName: "itau-cartao.csv" },
    { offset: -39, description: "Curso via aérea difícil", amount: 690, category: "Educação", sourceType: "OFX", sourceFileName: "bb-extrato.ofx" },
    { offset: -35, description: "Hotel congresso anestesia", amount: 1240, category: "Viagens", sourceType: "CSV", sourceFileName: "itau-cartao.csv" },
    { offset: -30, description: "Mercado plantão semanal", amount: 238.45, category: "Alimentação", sourceType: "MANUAL" },
    { offset: -25, description: "Uber Black Santa Helena", amount: 146.3, category: "Transporte", sourceType: "MANUAL" },
    { offset: -21, description: "Livro anestesia regional", amount: 312, category: "Educação", sourceType: "OFX", sourceFileName: "bb-extrato.ofx" },
    { offset: -17, description: "DARF ajuste mensal", amount: 420, category: "Impostos/Taxas", sourceType: "MANUAL" },
    { offset: -12, description: "Restaurante equipe centro cirúrgico", amount: 166.8, category: "Alimentação", sourceType: "CSV", sourceFileName: "nubank-junho.csv" },
    { offset: -8, description: "Uber Black pós-24h", amount: 188.9, category: "Transporte", sourceType: "MANUAL" },
    { offset: -4, description: "Passagem congresso dor", amount: 890, category: "Viagens", sourceType: "CSV", sourceFileName: "nubank-junho.csv" },
    { offset: -1, description: "Farmácia plantão", amount: 87.35, category: "Saúde", sourceType: "MANUAL" },
    { offset: 2, description: "99 Hospital Vita", amount: 76.4, category: "Transporte", sourceType: "MANUAL" },
    { offset: 6, description: "Seguro profissional parcela", amount: 340, category: "CRM/Sociedades", sourceType: "OFX", sourceFileName: "pj-extrato.ofx" },
    { offset: 11, description: "Supermercado marmitas semana", amount: 286.1, category: "Alimentação", sourceType: "MANUAL" },
    { offset: 18, description: "Congresso anestesia inscrição", amount: 1450, category: "Educação", sourceType: "CSV", sourceFileName: "itau-julho.csv" },
    { offset: 26, description: "Uber Black plantão futuro", amount: 132.7, category: "Transporte", sourceType: "MANUAL" },
  ];

  return templates.map((expense, index) => ({
    id: uid("beta-expense", index + 1),
    entityDomain: "PF",
    date: fmtISO(addDays(ref, expense.offset)),
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    sourceFileName: expense.sourceFileName,
    sourceType: expense.sourceType,
  }));
}
