import {
  calculateExpectedPaymentDate,
  fmtISO,
  type Asset,
  type ComplianceDoc,
  type ExpenseCategory,
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
import { logger } from "./logger";

const STORAGE_KEY = "docfin.store.v2";

type BetaSeedOptions = {
  reload?: boolean;
};

declare global {
  interface Window {
    inject90DaysBetaState?: (options?: BetaSeedOptions) => StoreState;
    inject1YearProductionState?: (options?: BetaSeedOptions) => StoreState;
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

export function build1YearProductionState(referenceDate: Date = new Date()): StoreState {
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 12, 0, 0, 0);
  const currentMonth = monthStart(ref);
  const monthRefs = Array.from({ length: 12 }, (_, index) => addMonths(currentMonth, index - 11));

  const workplaces: Workplace[] = [
    { id: "prod-hospital-aura", entityDomain: "PJ", name: "Hospital Aura Anestesia", address: "Av. Paulista, 1842", lat: -23.5614, lng: -46.6559, regime: "PJ_SIMPLES", hourlyRate: 330, paymentRule: "D0_PARTICULAR", color: "#deff9a", cutOffDay: 31, paymentDay: 1, paymentTermDays: 0 },
    { id: "prod-hospital-vita", entityDomain: "PJ", name: "Hospital Vita Jardins", address: "R. Estados Unidos, 900", lat: -23.5722, lng: -46.6699, regime: "PJ_SIMPLES", hourlyRate: 305, paymentRule: "D30_FECHAMENTO_20", color: "#a7f3d0", cutOffDay: 20, paymentDay: 20, paymentTermDays: 30 },
    { id: "prod-hospital-santa-helena", entityDomain: "PJ", name: "Santa Helena Day Clinic", address: "R. Vergueiro, 3185", lat: -23.5906, lng: -46.6351, regime: "PJ_LUCRO_PRESUMIDO", hourlyRate: 360, paymentRule: "D60_CONVENIO", color: "#bfdbfe", cutOffDay: 15, paymentDay: 15, paymentTermDays: 60 },
    { id: "prod-hospital-municipal", entityDomain: "PJ", name: "Pronto Atendimento Municipal Leste", address: "Av. Sapopemba, 7400", lat: -23.5892, lng: -46.5018, regime: "RPA", hourlyRate: 250, paymentRule: "D30_RPA", color: "#fca5a5", cutOffDay: 25, paymentDay: 10, paymentTermDays: 30 },
    { id: "prod-hospital-privato", entityDomain: "PJ", name: "Privato Surgical Center", address: "R. Oscar Freire, 1220", lat: -23.5618, lng: -46.6721, regime: "PARTICULAR_PIX", hourlyRate: 420, paymentRule: "PIX_D0", color: "#fde68a", cutOffDay: 31, paymentDay: 1, paymentTermDays: 0 },
    { id: "prod-hospital-corporate", entityDomain: "PJ", name: "Corporate Health Tower", address: "Av. Brigadeiro Faria Lima, 3900", lat: -23.5864, lng: -46.6823, regime: "PF", hourlyRate: 280, paymentRule: "D15_PF", color: "#c4b5fd", cutOffDay: 30, paymentDay: 15, paymentTermDays: 15 },
  ];

  const simpleHeavyMonths = new Set([1, 2, 5, 7, 10]);
  const shifts: Shift[] = [];
  const surgeries: SurgeryRecord[] = [];
  let shiftIndex = 0;
  let surgeryIndex = 0;

  monthRefs.forEach((month, monthIndex) => {
    const isCurrentMonth = monthIndex === monthRefs.length - 1;
    const shiftCount = isCurrentMonth ? 12 : 14;
    const heavySimple = simpleHeavyMonths.has(monthIndex);

    for (let dayIndex = 0; dayIndex < shiftCount; dayIndex += 1) {
      const draft = isCurrentMonth && dayIndex >= 4;
      const workplacePool = heavySimple
        ? [workplaces[0], workplaces[1], workplaces[1], workplaces[4], workplaces[2], workplaces[3]]
        : [workplaces[2], workplaces[3], workplaces[4], workplaces[5], workplaces[0], workplaces[1]];
      const workplace = workplacePool[(dayIndex + monthIndex) % workplacePool.length];
      const hours = [6, 8, 10, 12, 12, 14][(dayIndex + monthIndex) % 6];
      const date = fmtISO(new Date(month.getFullYear(), month.getMonth(), Math.min(27, 2 + dayIndex * 2), 12));
      const privateTransport = (dayIndex + monthIndex) % 4 !== 0;
      const expectedPaymentDate = fmtISO(calculateExpectedPaymentDate(date, workplace));
      const grossLift = heavySimple && workplace.regime === "PJ_SIMPLES" ? 650 : 0;
      const adjustment = draft ? 0 : [0, 0, 120, 0, 260, 0, 480, 0, 0, 175, 0, 320][(dayIndex + monthIndex) % 12];

      shifts.push({
        id: uid("prod-shift", shiftIndex + 1),
        entityDomain: "PJ",
        recordStatus: draft ? "draft" : "consolidated",
        date,
        workplaceId: workplace.id,
        originId: "home",
        hours,
        gross: round2(hours * workplace.hourlyRate + grossLift + ((dayIndex + monthIndex) % 5 === 0 ? 380 : 0)),
        procedure: draft ? ["Plantão rápido UTI", "Sala encaixada", "Sobreaviso capturado", "Noturno sem fechamento"][dayIndex % 4] : undefined,
        taxRegimeOverride: draft ? undefined : workplace.regime,
        extraCost: privateTransport ? 0 : [28, 36, 42, 55][dayIndex % 4],
        settlementAdjustment: adjustment,
        transportMode: privateTransport ? "PRIVATE_TRANSPORT" : "PERSONAL_VEHICLE",
        privateTransportCost: privateTransport ? [92, 118, 146, 174, 220][(dayIndex + monthIndex) % 5] : 0,
        commuteHours: privateTransport ? 1.1 : 1.8,
        status: draft ? "CONFIRMADO" : (dayIndex + monthIndex) % 19 === 0 ? "BUSCANDO_SUBSTITUTO" : (dayIndex + monthIndex) % 11 === 0 ? "REPASSADO" : "CONFIRMADO",
        coveredBy: (dayIndex + monthIndex) % 11 === 0 && !draft ? ["Dr. Felipe", "Dra. Aline", "Dr. Marcos"][dayIndex % 3] : undefined,
        expectedPaymentDate: draft ? undefined : expectedPaymentDate,
        projectedPaymentDate: draft ? undefined : expectedPaymentDate,
      });
      shiftIndex += 1;
    }

    [
      { procedure: "Colecistectomia videolaparoscópica", gross: heavySimple ? 7600 : 6200, split: 2100 },
      { procedure: "Artroscopia de joelho", gross: heavySimple ? 9800 : 7800, split: 2850 },
      { procedure: "Herniorrafia inguinal", gross: heavySimple ? 6900 : 5400, split: 1900 },
    ].forEach((template, localIndex) => {
      const titular = localIndex !== 2;
      const date = fmtISO(new Date(month.getFullYear(), month.getMonth(), 7 + localIndex * 8, 12));
      const hospital = heavySimple ? workplaces[localIndex % 2] : workplaces[(localIndex + 2) % workplaces.length];

      if (titular) {
        surgeries.push({
          id: uid("prod-surgery", surgeryIndex + 1),
          entityDomain: "PJ",
          recordStatus: "consolidated",
          date,
          myRole: "TITULAR",
          hospitalId: hospital.id,
          procedure: template.procedure,
          totalGross: template.gross,
          invoiceMode: localIndex === 0 ? "SINGLE" : "FRACTIONED",
          receivedFromHospital: month < currentMonth || monthIndex < 10,
          notes: (monthIndex + localIndex) % 4 === 0 ? "Glosa parcial aguardando contestação do convênio." : "Procedimento fechado no mês.",
          teamSplit: [
            { id: uid("prod-team", surgeryIndex * 2 + 1), name: "Dr. Bruno", role: "Auxiliar", amountDue: round2(template.gross * 0.16), isPaid: monthIndex < 10 },
            { id: uid("prod-team", surgeryIndex * 2 + 2), name: "Instrumentação externa", role: "Instrumentador", amountDue: round2(template.gross * 0.08), isPaid: monthIndex < 9 },
          ],
        });
      } else {
        surgeries.push({
          id: uid("prod-surgery", surgeryIndex + 1),
          entityDomain: "PJ",
          recordStatus: "consolidated",
          date,
          myRole: "MEMBRO_EQUIPE",
          payingSurgeonName: ["Dr. Renato Salles", "Dra. Vanessa Prado", "Dr. Mauro Teixeira"][monthIndex % 3],
          procedure: template.procedure,
          myExpectedShare: template.split,
          isReceived: monthIndex < 10 && monthIndex % 3 !== 1,
          notes: monthIndex % 3 === 1 ? "Repasse em atraso, cobrado por WhatsApp." : "Repasse recebido após fechamento da equipe.",
        });
      }
      surgeryIndex += 1;
    });
  });

  const fixedCosts: FixedCost[] = [
    { id: "prod-cost-contabilidade", entityDomain: "PJ", label: "Contabilidade médica + folha", monthly: 720 },
    { id: "prod-cost-crm", entityDomain: "PJ", label: "CRM e sociedades médicas", monthly: 260 },
    { id: "prod-cost-seguro", entityDomain: "PJ", label: "Seguro profissional anestesia", monthly: 390 },
    { id: "prod-cost-certificado", entityDomain: "PJ", label: "Certificado Digital PJ", monthly: 42 },
    { id: "prod-cost-software", entityDomain: "PJ", label: "Softwares médicos e assinatura prontuário", monthly: 310 },
    { id: "prod-cost-academia", entityDomain: "PF", label: "Academia e fisioterapia", monthly: 420 },
  ];

  const taxProfile: TaxProfile = {
    completed: true,
    sources: {
      PJ: { enabled: true, monthly: 54000 },
      CLT: { enabled: true, monthly: 4200 },
      RPA: { enabled: true, monthly: 7800 },
      PARTICULAR: { enabled: true, monthly: 5200 },
      SCP: { enabled: true, monthly: 3600 },
    },
  };

  return {
    hasCompletedOnboarding: true,
    userProfile: { fullName: "Dra. Thais Azevedo", trainingLevel: "Residente", specialtyName: "Anestesiologia R3", baseAddress: "Vila Mariana, São Paulo" },
    taxProfile,
    base: { label: "Casa - Vila Mariana", lat: -23.5897, lng: -46.6346 },
    vehicle: { entityDomain: "PF", model: "Volvo XC40 T5 2024", kmPerLiter: 9.2, fuelPrice: 6.19, depreciationPerKm: 0.68, maintenancePerKm: 0.31 },
    workplaces,
    shifts,
    fixedCosts,
    fixedIncomes: [{ id: "prod-fixed-income-residencia", entityDomain: "PF", label: "Bolsa residência R3", grossMonthly: 4200, netMonthly: 3970 }],
    proLabores: [{ id: "prod-prolabore-base", entityDomain: "PJ", label: "Pró-labore base DocFin", monthly: 11800 }],
    debts: [
      { id: "prod-debt-curso", entityDomain: "PF", label: "Curso ultrassom point-of-care", balance: 12800, annualRate: 12.5, monthlyPayment: 980 },
      { id: "prod-debt-cartao", entityDomain: "PF", label: "Parcelamentos congresso europeu", balance: 9400, annualRate: 21.2, monthlyPayment: 1240 },
      { id: "prod-debt-family", entityDomain: "PF", label: "Apoio familiar temporário", balance: 7200, annualRate: 0, monthlyPayment: 600 },
    ],
    wedding: { entityDomain: "PF", enabled: false, targetAmount: 0, targetDate: fmtISO(addMonths(ref, 24)), saved: 0 },
    goals: [
      { id: "prod-goal-fellowship", entityDomain: "PF", name: "Fellowship internacional em dor", category: "Educação", targetAmount: 90000, targetDate: fmtISO(addMonths(ref, 15)), saved: 41800 },
      { id: "prod-goal-apto", entityDomain: "PF", name: "Entrada apartamento perto do hospital", category: "Imóvel", targetAmount: 260000, targetDate: fmtISO(addMonths(ref, 30)), saved: 74500 },
      { id: "prod-goal-ferias", entityDomain: "PF", name: "Férias pós-R3 sem plantão", category: "Viagem", targetAmount: 32000, targetDate: fmtISO(addMonths(ref, 8)), saved: 18600 },
    ],
    documents: [
      { id: "prod-doc-crm", entityDomain: "PJ", kind: "CRM", label: "CRM-SP 2026", expiresAt: fmtISO(addDays(ref, 38)), renewalCost: 1180 },
      { id: "prod-doc-cert", entityDomain: "PJ", kind: "CERT_DIGITAL", label: "e-CNPJ consultório", expiresAt: fmtISO(addDays(ref, 21)), renewalCost: 340 },
      { id: "prod-doc-seguro", entityDomain: "PJ", kind: "MALPRACTICE", label: "Seguro responsabilidade civil", expiresAt: fmtISO(addDays(ref, 74)), renewalCost: 3820 },
      { id: "prod-doc-acls", entityDomain: "PJ", kind: "ACLS_BLS", label: "ACLS/BLS", expiresAt: fmtISO(addDays(ref, -9)), renewalCost: 1040 },
      { id: "prod-doc-sba", entityDomain: "PJ", kind: "OUTRO", label: "SBA - Sociedade Brasileira de Anestesiologia", expiresAt: fmtISO(addDays(ref, 122)), renewalCost: 890 },
    ],
    assets: [
      { id: "prod-asset-rf", entityDomain: "PF", category: "Renda Fixa", description: "Tesouro Selic, CDB liquidez diária e reserva de emergência", currentValue: 146800 },
      { id: "prod-asset-rv", entityDomain: "PF", category: "Renda Variável", description: "FIIs, ações e ETFs importados da DIRPF", currentValue: 69340 },
      { id: "prod-asset-car", entityDomain: "PF", category: "Veículo", description: "Volvo XC40 T5 2024", currentValue: 226000 },
      { id: "prod-asset-crypto", entityDomain: "PF", category: "Cripto", description: "USDC e BTC reserva internacional", currentValue: 42800, ticker: "USDC", yieldAPY: 4.2 },
      { id: "prod-asset-consorcio", entityDomain: "PF", category: "Consórcio", description: "Carta de crédito imóvel em andamento", currentValue: 38400 },
    ],
    liabilities: [
      { id: "prod-liability-vehicle", entityDomain: "PF", category: "Financiamento Veículo", description: "Saldo financiamento Volvo XC40", totalAmount: 168000, remainingBalance: 132600, interestRate: 13.8 },
      { id: "prod-liability-education", entityDomain: "PF", category: "Empréstimo", description: "Financiamento fellowship e cursos de dor", totalAmount: 42000, remainingBalance: 28600, interestRate: 16.4 },
      { id: "prod-liability-card", entityDomain: "PF", category: "Empréstimo", description: "Parcelamentos congresso e material médico", totalAmount: 18800, remainingBalance: 7300, interestRate: 19.7 },
    ],
    surgeries,
    receivables: [],
    invoices: [],
    expenses: build1YearExpenses(monthRefs),
  };
}

export function inject90DaysBetaState(options: BetaSeedOptions = {}): StoreState {
  const { reload = true } = options;
  const state = build90DaysBetaState();
  if (typeof window === "undefined") return state;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  logger.info("[DocFin Beta] Estado de stress test 90 dias injetado", {
    shifts: state.shifts.length,
    surgeries: state.surgeries.length,
    expenses: state.expenses.length,
    workplaces: state.workplaces.length,
  });
  if (reload) window.location.reload();
  return state;
}

export function inject1YearProductionState(options: BetaSeedOptions = {}): StoreState {
  const { reload = true } = options;
  const state = build1YearProductionState();
  if (typeof window === "undefined") return state;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  logger.info("[DocFin Beta] Estado de stress test 1 ano injetado", {
    shifts: state.shifts.length,
    draftShifts: state.shifts.filter((shift) => shift.recordStatus === "draft").length,
    surgeries: state.surgeries.length,
    expenses: state.expenses.length,
    workplaces: state.workplaces.length,
  });
  if (reload) window.location.reload();
  return state;
}

export function installBetaSeedConsoleHook() {
  if (typeof window === "undefined") return;
  if (!window.inject90DaysBetaState) window.inject90DaysBetaState = inject90DaysBetaState;
  if (!window.inject1YearProductionState) window.inject1YearProductionState = inject1YearProductionState;
}

function build1YearExpenses(monthRefs: Date[]): ExpenseTransaction[] {
  const baseTemplates: Array<{ description: string; amount: number; category: ExpenseCategory; sourceType: ExpenseTransaction["sourceType"]; sourceFileName?: string }> = [
    { description: "UBER BLACK POS PLANTAO 24H", amount: 148.9, category: "Transporte", sourceType: "MANUAL" },
    { description: "99 TAXI HOSPITAL MUNICIPAL", amount: 84.4, category: "Transporte", sourceType: "CSV", sourceFileName: "itau-cartao.csv" },
    { description: "CREMESP ANUIDADE", amount: 186.7, category: "CRM/Sociedades", sourceType: "OFX", sourceFileName: "pj-extrato.ofx" },
    { description: "SBA SOCIEDADE ANESTESIOLOGIA", amount: 95, category: "CRM/Sociedades", sourceType: "CSV", sourceFileName: "nubank.csv" },
    { description: "IFOOD POS PLANTAO NOTURNO", amount: 72.5, category: "Alimentação", sourceType: "CSV", sourceFileName: "nubank.csv" },
    { description: "MERCADO MARMITAS SEMANA", amount: 264.2, category: "Alimentação", sourceType: "MANUAL" },
    { description: "CURSO VIA AEREA DIFICIL", amount: 690, category: "Educação", sourceType: "OFX", sourceFileName: "bb-extrato.ofx" },
    { description: "LIVRO ANESTESIA REGIONAL", amount: 328, category: "Educação", sourceType: "CSV", sourceFileName: "itau-cartao.csv" },
    { description: "HOTEL CONGRESSO ANESTESIA", amount: 1240, category: "Viagens", sourceType: "CSV", sourceFileName: "itau-cartao.csv" },
    { description: "PASSAGEM CONGRESSO DOR", amount: 920, category: "Viagens", sourceType: "CSV", sourceFileName: "nubank.csv" },
    { description: "DARF AJUSTE MENSAL", amount: 480, category: "Impostos/Taxas", sourceType: "MANUAL" },
    { description: "FARMACIA POS PLANTAO", amount: 96.3, category: "Saúde", sourceType: "MANUAL" },
  ];

  const expenses: ExpenseTransaction[] = [];
  monthRefs.forEach((month, monthIndex) => {
    baseTemplates.forEach((template, templateIndex) => {
      if ((templateIndex + monthIndex) % 4 === 3) return;
      expenses.push({
        id: uid("prod-expense", expenses.length + 1),
        entityDomain: template.category === "CRM/Sociedades" || template.category === "Impostos/Taxas" ? "PJ" : "PF",
        date: fmtISO(new Date(month.getFullYear(), month.getMonth(), Math.min(27, 3 + templateIndex * 2), 12)),
        description: template.description,
        amount: round2(template.amount * (1 + ((monthIndex % 5) - 2) * 0.035)),
        category: template.category,
        sourceFileName: template.sourceFileName,
        sourceType: template.sourceType,
      });
    });
  });

  return expenses;
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
