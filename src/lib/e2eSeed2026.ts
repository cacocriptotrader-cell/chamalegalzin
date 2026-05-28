import type { StoreActions, StoreState, TaxRegime, Workplace } from "@/lib/store";

const SEED_MARKER = "E2E_2026_FULL_REGIMES";
const SEED_YEAR = 2026;

type E2ESeedStore = Pick<StoreState, "workplaces" | "shifts"> & Pick<StoreActions, "addWorkplace" | "addShifts">;

type SeedWorkplaceInput = Parameters<StoreActions["addWorkplace"]>[0];
type SeedShiftInput = Parameters<StoreActions["addShifts"]>[0][number];

type SeedWorkplaceDefinition = {
  name: string;
  regime: TaxRegime;
  hourlyRate: number;
  address: string;
};

type SeedRecordTemplate = {
  workplaceName: string;
  regime: TaxRegime;
  gross: number;
  hours: number;
  days: number[];
  procedure: string;
  fixed?: boolean;
};

export type E2ESeedResult = {
  status: "seeded" | "already_seeded" | "local";
  year: number;
  totalRecords: number;
  byRegime: Record<string, number>;
};

const WORKPLACES: SeedWorkplaceDefinition[] = [
  {
    name: "Residência Médica",
    regime: "CLT",
    hourlyRate: 28.13,
    address: "São José dos Campos, SP",
  },
  {
    name: "UPA Santa Helena",
    regime: "PJ_SIMPLES",
    hourlyRate: 116.67,
    address: "São José dos Campos, SP",
  },
  {
    name: "UPA San Marino",
    regime: "PJ_SIMPLES",
    hourlyRate: 125,
    address: "São José dos Campos, SP",
  },
  {
    name: "Vale Paraibano",
    regime: "PARTICULAR_PIX",
    hourlyRate: 100,
    address: "Vale do Paraíba, SP",
  },
];

const MONTHLY_RECORDS: SeedRecordTemplate[] = [
  {
    workplaceName: "Residência Médica",
    regime: "CLT",
    gross: 4_500,
    hours: 160,
    days: [1],
    procedure: "Residência Médica (Bolsa/CLT)",
    fixed: true,
  },
  {
    workplaceName: "UPA Santa Helena",
    regime: "PJ_SIMPLES",
    gross: 1_400,
    hours: 12,
    days: [2, 7, 12, 17, 22, 27],
    procedure: "Plantão 12h - UPA Santa Helena",
  },
  {
    workplaceName: "UPA San Marino",
    regime: "PJ_SIMPLES",
    gross: 1_500,
    hours: 12,
    days: [3, 8, 13, 18, 23, 28],
    procedure: "Plantão 12h - UPA San Marino",
  },
  {
    workplaceName: "Vale Paraibano",
    regime: "PARTICULAR_PIX",
    gross: 1_200,
    hours: 12,
    days: [10, 25],
    procedure: "Plantão 12h - Vale Paraibano (PIX/PF)",
  },
];

export async function seedE2ETestData(store: E2ESeedStore): Promise<E2ESeedResult> {
  const existingSeedRecords = store.shifts.filter((shift) => shift.procedure?.includes(SEED_MARKER));
  if (existingSeedRecords.length > 0) {
    return {
      status: "already_seeded",
      year: SEED_YEAR,
      totalRecords: existingSeedRecords.length,
      byRegime: countByRegime(existingSeedRecords.map((shift) => shift.taxRegimeOverride ?? "UNDEFINED")),
    };
  }

  const knownWorkplaces = [...store.workplaces];
  const workplaceByName = new Map<string, Workplace>();

  for (const definition of WORKPLACES) {
    workplaceByName.set(definition.name, ensureWorkplace(store, knownWorkplaces, definition));
  }

  const shifts = buildSeedShifts(workplaceByName);
  const persistenceStatus = await store.addShifts(shifts);

  return {
    status: persistenceStatus === "synced" ? "seeded" : "local",
    year: SEED_YEAR,
    totalRecords: shifts.length,
    byRegime: countByRegime(shifts.map((shift) => shift.taxRegimeOverride ?? "UNDEFINED")),
  };
}

function ensureWorkplace(
  store: E2ESeedStore,
  knownWorkplaces: Workplace[],
  definition: SeedWorkplaceDefinition,
) {
  const existing = knownWorkplaces.find((workplace) => sameName(workplace.name, definition.name));
  if (existing) return existing;

  const workplace = store.addWorkplace(toWorkplaceInput(definition));
  knownWorkplaces.push(workplace);
  return workplace;
}

function toWorkplaceInput(definition: SeedWorkplaceDefinition): SeedWorkplaceInput {
  return {
    name: definition.name,
    address: definition.address,
    lat: 0,
    lng: 0,
    manualDistanceKm: 0,
    regime: definition.regime,
    hourlyRate: definition.hourlyRate,
    paymentRule: "E2E_2026_FIXED_CYCLE",
    cutOffDay: 30,
    paymentDay: 20,
    paymentTermDays: 30,
  };
}

function buildSeedShifts(workplaceByName: Map<string, Workplace>): SeedShiftInput[] {
  return Array.from({ length: 12 }, (_, monthIndex) => monthIndex + 1).flatMap((month) => (
    MONTHLY_RECORDS.flatMap((template) => {
      const workplace = workplaceByName.get(template.workplaceName);
      if (!workplace) return [];

      return template.days.map((day, occurrenceIndex) => {
        const date = isoDate(SEED_YEAR, month, day);
        const expectedPaymentDate = isoDate(SEED_YEAR, month + 1, 20);
        const paid = new Date(`${expectedPaymentDate}T12:00:00`).getTime() <= Date.now();

        return {
          recordStatus: "consolidated",
          date,
          workplaceId: workplace.id,
          originId: "home",
          hours: template.hours,
          gross: template.gross,
          procedure: `${SEED_MARKER} - ${template.procedure}`,
          taxRegimeOverride: template.regime,
          extraCost: 0,
          transportMode: "PRIVATE_TRANSPORT",
          privateTransportCost: 0,
          paymentStatus: paid ? "PAID" : "PENDING",
          expectedPaymentDate,
          projectedPaymentDate: expectedPaymentDate,
          actualPaymentDate: paid ? expectedPaymentDate : undefined,
          invoiceIssueDate: date,
          invoiceNumber: `${SEED_YEAR}${String(month).padStart(2, "0")}-${slug(template.workplaceName)}-${String(occurrenceIndex + 1).padStart(2, "0")}`,
          status: "CONFIRMADO",
          isFixedShift: template.fixed,
        } satisfies SeedShiftInput;
      });
    })
  ));
}

function countByRegime(regimes: string[]) {
  return regimes.reduce<Record<string, number>>((acc, regime) => {
    acc[regime] = (acc[regime] ?? 0) + 1;
    return acc;
  }, {});
}

function sameName(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function isoDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
}
