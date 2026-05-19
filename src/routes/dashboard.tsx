import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  brl,
  brl2,
  calculateIRRF2026,
  calculateNetValue,
  calculateTotalDeductions,
  calculateRPAWithholding,
  computeShift,
  computedProLaboreMonthly,
  getEffectiveSimpleRate,
  getCurrentMonthRegimeTotal,
  getRollingFatorRSnapshot,
  getShiftRegime,
  isConsolidatedRecord,
  PROLABORE_INSS_RATE,
  remainingINSSBaseAfterCLT,
  round2,
  TAX_LABELS,
  TAX_RATE,
  useStore,
  type BatchShiftConsolidationData,
  type StoreState,
  type Deduction,
  type DeductionType,
  type PaymentStatus,
  type Shift,
  type ShiftTransportMode,
  type TaxRegime,
} from "@/lib/store";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  FileText,
  Inbox,
  PieChart,
  PlusCircle,
  Stethoscope,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { QuickCaptureModal } from "@/components/QuickCaptureModal";
import { DeductionManager } from "@/components/DeductionManager";
import { BatchConsolidationModal } from "@/components/BatchConsolidationModal";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Cockpit — Docfin" },
      { name: "description", content: "Central de comando com operação, fiscal e patrimônio do médico." },
    ],
  }),
  component: Dashboard,
});

type OperationEvent = {
  id: string;
  date: string;
  kind: "Plantão" | "Cirurgia";
  title: string;
  subtitle: string;
  value: number;
  tone: "emerald" | "petrol" | "gold";
};

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function Dashboard() {
  const store = useStore();
  const firstName = store.userProfile.fullName.trim().split(/\s+/)[0] || "Doutor(a)";
  const now = new Date();

  const operationEvents = useMemo(() => getUpcomingOperationEvents(store), [store]);
  const financialSummary = useMemo(() => getFinancialSummarySnapshot(store, now), [store, now]);
  const wealth = useMemo(() => getWealthSnapshot(store), [store]);
  const draftShifts = useMemo(() => store.shifts.filter((shift) => shift.recordStatus === "draft"), [store.shifts]);

  return (
    <div className="px-0 py-5 md:py-7 space-y-5 animate-fade-in">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Central de comando</p>
          <h1 className="font-display text-3xl md:text-4xl text-gradient mt-1">Hoje, {firstName}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Operação médica, backoffice fiscal e vida patrimonial consolidados em uma leitura de elevador.
          </p>
        </div>
        <div className="premium-panel rounded-2xl px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Mês atual</p>
          <p className="text-sm font-medium capitalize text-foreground">
            {now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
        </div>
      </header>

      <QuickActions />

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <QuickCaptureCard />
        </div>
        <div className="lg:col-span-7">
          <DraftInbox shifts={draftShifts} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <OperationWidget events={operationEvents} />
        </div>
        <div className="lg:col-span-5 grid gap-4">
          <FinancialSummaryWidget summary={financialSummary} />
          <WealthWidget wealth={wealth} />
        </div>
      </section>
    </div>
  );
}

function QuickActions() {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <QuickAction
        to="/novo-registro"
        icon={<PlusCircle className="h-4 w-4" />}
        label="Lançar Plantão"
        description="Plantão ou cirurgia"
      />
      <QuickAction
        to="/patrimonio"
        icon={<UploadCloud className="h-4 w-4" />}
        label="Importar PDF"
        description="DIRPF e patrimônio"
      />
      <QuickAction
        to="/fechamento"
        icon={<FileText className="h-4 w-4" />}
        label="Ver Dossiê Fiscal"
        description="Fechamento mensal"
      />
    </section>
  );
}

function OperationWidget({ events }: { events: OperationEvent[] }) {
  return (
    <CockpitCard
      eyebrow="Operação médica"
      title="Próximos compromissos"
      icon={<CalendarDays className="h-5 w-5" />}
      action={<CardLink to="/calendario">Ver calendário</CardLink>}
      className="h-full"
    >
      {events.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-5 w-5" />}
          title="Nenhum plantão futuro"
          body="Registre seus próximos plantões ou cirurgias para enxergar receita projetada e fluxo operacional."
          to="/novo-registro"
          cta="Lançar primeiro registro"
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="premium-panel rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${event.tone === "emerald" ? "bg-emerald-500" : event.tone === "petrol" ? "bg-teal-700" : "bg-amber-400"}`} />
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {event.kind} · {formatEventDate(event.date)}
                    </p>
                  </div>
                  <h3 className="text-base font-semibold mt-2 truncate text-foreground">{event.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.subtitle}</p>
                </div>
                <p className="font-display text-xl text-success tabular-nums shrink-0">{brl(event.value)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </CockpitCard>
  );
}

function FinancialSummaryWidget({ summary }: { summary: ReturnType<typeof getFinancialSummarySnapshot> }) {
  const resultTone = summary.consolidatedNet >= 0 ? "text-success" : "text-destructive";
  const taxesAndExpenses = summary.pjTax + summary.proLaboreTaxes + summary.pjCosts + summary.pjDeductions + summary.pfDeductions;
  const expenseRatio = summary.pjRevenue > 0 ? Math.min(100, (taxesAndExpenses / summary.pjRevenue) * 100) : 0;
  const badgeClass = summary.factorTone === "safe"
    ? "border-success/35 bg-success/10 text-success"
    : summary.factorTone === "risk"
      ? "border-warning/35 bg-warning/10 text-warning"
      : "border-border bg-surface-elevated text-muted-foreground";

  return (
    <CockpitCard
      eyebrow="Resultado"
      title="Resultado líquido do mês"
      icon={<CircleDollarSign className="h-5 w-5" />}
      action={<CardLink to="/fechamento">Dossiê</CardLink>}
    >
      <div className="premium-panel rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Dinheiro no bolso</p>
            <p className={`font-display text-4xl mt-2 tabular-nums ${resultTone}`}>
              {brl(summary.consolidatedNet)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Resultado líquido depois de impostos, custos e despesas do mês.</p>
          </div>
          <div className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${badgeClass}`}>
            {summary.factorBadge}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Bruto PJ</span>
            <span>Impostos & despesas</span>
          </div>
          <div className="h-3 rounded-full bg-surface overflow-hidden border border-border">
            <div className="h-full bg-destructive/80" style={{ width: `${expenseRatio}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
            <span>{brl2(summary.pjRevenue)}</span>
            <span>{brl2(taxesAndExpenses)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 mt-3">
        <MiniMetric label="Faturamento Bruto PJ" value={brl2(summary.pjRevenue)} />
        <MiniMetric label="Impostos & Despesas" value={brl2(taxesAndExpenses)} tone="danger" />
        <MiniMetric label="Resultado Líquido do Mês" value={brl2(summary.consolidatedNet)} tone={summary.consolidatedNet >= 0 ? "success" : "danger"} />
      </div>
    </CockpitCard>
  );
}

function WealthWidget({ wealth }: { wealth: ReturnType<typeof getWealthSnapshot> }) {
  const hasWealthData = wealth.totalAssets > 0 || wealth.totalLiabilities > 0;

  return (
    <CockpitCard
      eyebrow="Vida PF"
      title="Net Worth"
      icon={<PieChart className="h-5 w-5" />}
      action={<CardLink to="/patrimonio">Patrimônio</CardLink>}
    >
      <div
        className="premium-panel overflow-hidden rounded-2xl p-5"
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Patrimônio líquido</p>
        <p className={`font-display text-4xl mt-2 tabular-nums ${wealth.netWorth >= 0 ? "text-success" : "text-destructive"}`}>
          {brl(wealth.netWorth)}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Última visão consolidada a partir dos bens e dívidas salvos no Cofre.
        </p>

        {hasWealthData ? (
          <div className="mt-5">
            <div className="h-3 rounded-full bg-surface overflow-hidden flex border border-border">
              <div className="h-full bg-success" style={{ width: `${wealth.assetShare}%` }} />
              <div className="h-full bg-destructive/80" style={{ width: `${wealth.liabilityShare}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <MiniMetric label={`${wealth.assetCount} bens`} value={brl(wealth.totalAssets)} tone="success" />
              <MiniMetric label={`${wealth.liabilityCount} dívidas`} value={brl(wealth.totalLiabilities)} tone="danger" />
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <Link
              to="/patrimonio"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_rgba(15,118,110,0.18)] transition hover:bg-primary/90"
            >
              <UploadCloud className="h-4 w-4" />
              Importar DIRPF
            </Link>
          </div>
        )}
      </div>
    </CockpitCard>
  );
}

function CockpitCard({
  eyebrow,
  title,
  icon,
  action,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`premium-card rounded-2xl p-5 md:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
            <h2 className="font-display text-xl mt-0.5 text-foreground">{title}</h2>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function QuickAction({
  to,
  icon,
  label,
  description,
}: {
  to: "/" | "/novo-registro" | "/patrimonio" | "/fechamento";
  icon: ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="premium-card flex items-center justify-between gap-3 rounded-2xl p-4 transition hover:border-primary/40 hover:bg-primary/[0.045]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

function QuickCaptureCard() {
  const [open, setOpen] = useState(false);

  return (
    <CockpitCard
      eyebrow="Captura rápida"
      title="Plantão em 15 segundos"
      icon={<Clock className="h-5 w-5" />}
      className="h-full"
    >
      <div className="premium-panel rounded-2xl p-4">
        <p className="text-sm text-muted-foreground">
          Capture hospital, duração e transporte sem sair do Cockpit. O registro entra como pendência para revisão fiscal.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_rgba(15,118,110,0.18)] transition hover:bg-primary/90"
        >
          Abrir captura rápida
        </button>
      </div>
      <QuickCaptureModal open={open} onOpenChange={setOpen} />
    </CockpitCard>
  );
}

function TransportQuickButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${
        active ? "border border-primary/40 bg-primary/10 text-primary" : "border border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function DraftInbox({ shifts }: { shifts: Shift[] }) {
  const store = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState("ALL");
  const [batchOpen, setBatchOpen] = useState(false);
  const selectedShift = shifts.find((shift) => shift.id === selectedId) ?? null;
  const hospitalOptions = useMemo(() => {
    const options = new Map<string, string>();
    shifts.forEach((shift) => {
      const workplace = store.workplaces.find((item) => item.id === shift.workplaceId);
      options.set(shift.workplaceId, workplace?.name ?? "Hospital não cadastrado");
    });
    return Array.from(options.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [shifts, store.workplaces]);
  const visibleShifts = useMemo(
    () => selectedHospitalFilter === "ALL" ? shifts : shifts.filter((shift) => shift.workplaceId === selectedHospitalFilter),
    [selectedHospitalFilter, shifts],
  );
  const allSelected = visibleShifts.length > 0 && selectedIds.length === visibleShifts.length;

  useEffect(() => {
    const visibleIds = new Set(visibleShifts.map((shift) => shift.id));
    setSelectedIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [visibleShifts]);

  useEffect(() => {
    if (selectedHospitalFilter === "ALL") return;
    if (!hospitalOptions.some((option) => option.id === selectedHospitalFilter)) {
      setSelectedHospitalFilter("ALL");
    }
  }, [hospitalOptions, selectedHospitalFilter]);

  function toggleSelection(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAll() {
    setSelectedIds((current) => current.length === visibleShifts.length ? [] : visibleShifts.map((shift) => shift.id));
  }

  function handleBatchConfirm(data: BatchShiftConsolidationData) {
    store.batchConsolidateShifts(selectedIds, data);
    const count = selectedIds.length;
    setSelectedIds([]);
    setBatchOpen(false);
    toast.success(`${count} rascunho${count === 1 ? "" : "s"} consolidado${count === 1 ? "" : "s"}.`);
  }

  return (
    <CockpitCard
      eyebrow="Pendências"
      title="Inbox de triagem"
      icon={<Inbox className="h-5 w-5" />}
      className="h-full"
    >
      {shifts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/70 p-6 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
          <h3 className="font-display text-lg mt-3 text-foreground">Nenhuma pendência</h3>
          <p className="text-sm text-muted-foreground mt-1">Rascunhos rápidos aparecerão aqui antes de entrarem nos cálculos fiscais.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="premium-panel flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={visibleShifts.length === 0}
                  className="h-4 w-4 rounded border-border bg-card accent-primary disabled:opacity-40"
                />
                Selecionar Tudo
              </label>
              <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:min-w-[220px]">
                Hospital
                <select
                  value={selectedHospitalFilter}
                  onChange={(event) => setSelectedHospitalFilter(event.target.value)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs normal-case tracking-normal text-foreground outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
                >
                  <option value="ALL">Exibir Todos</option>
                  {hospitalOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </label>
            </div>
            {selectedIds.length > 0 && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-xs text-muted-foreground">{selectedIds.length} selecionado{selectedIds.length === 1 ? "" : "s"}</span>
                <button
                  type="button"
                  onClick={() => setBatchOpen(true)}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Consolidar {selectedIds.length} Selecionado{selectedIds.length === 1 ? "" : "s"}
                </button>
              </div>
            )}
          </div>
          {visibleShifts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/70 p-5 text-center">
              <p className="text-sm font-semibold text-foreground">Nenhum rascunho para este hospital</p>
              <p className="mt-1 text-xs text-muted-foreground">Troque o filtro para visualizar outras pendências.</p>
            </div>
          ) : (
            visibleShifts.map((shift) => (
              <DraftShiftRow
                key={shift.id}
                shift={shift}
                active={selectedId === shift.id}
                selected={selectedIds.includes(shift.id)}
                onToggleSelected={() => toggleSelection(shift.id)}
                onEdit={() => setSelectedId(shift.id)}
              />
            ))
          )}
          <ConsolidationModal shift={selectedShift} open={Boolean(selectedShift)} onOpenChange={(open) => { if (!open) setSelectedId(null); }} />
          <BatchConsolidationModal
            count={selectedIds.length}
            open={batchOpen}
            onOpenChange={setBatchOpen}
            onConfirm={handleBatchConfirm}
          />
        </div>
      )}
    </CockpitCard>
  );
}

function DraftShiftRow({
  shift,
  active,
  selected,
  onToggleSelected,
  onEdit,
}: {
  shift: Shift;
  active: boolean;
  selected: boolean;
  onToggleSelected: () => void;
  onEdit: () => void;
}) {
  const store = useStore();
  const workplace = store.workplaces.find((item) => item.id === shift.workplaceId);
  return (
    <div
      className={`rounded-2xl border p-4 text-left transition ${active ? "border-primary/45 bg-primary/10" : "premium-panel hover:border-primary/30"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelected}
            className="mt-1 h-4 w-4 rounded border-border bg-card accent-primary"
            aria-label={`Selecionar ${workplace?.name ?? "plantão"}`}
          />
          <button type="button" onClick={onEdit} className="min-w-0 text-left">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{formatEventDate(shift.date)} · Rascunho</p>
            <h3 className="mt-1 truncate text-sm font-semibold text-foreground">{workplace?.name ?? "Hospital não cadastrado"}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{shift.hours}h · {shift.procedure || "Plantão rápido"}</p>
          </button>
        </div>
        <span className="font-mono text-sm text-success tabular-nums">{brl2(shift.gross)}</span>
      </div>
    </div>
  );
}

function ConsolidationModal({ shift, open, onOpenChange }: { shift: Shift | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!shift) {
    return <Dialog.Root open={false} onOpenChange={onOpenChange} />;
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md" />
        <Dialog.Content className="premium-modal fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[calc(100vw-32px)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl p-0">
          <div className="flex items-start justify-between gap-4 border-b border-border bg-surface-elevated/70 px-5 py-4">
            <div>
              <Dialog.Title className="font-display text-xl text-foreground">Consolidar pendência</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Complete o enquadramento contábil antes deste plantão entrar nos motores financeiros.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-xl border border-border p-2 text-muted-foreground transition hover:text-foreground" aria-label="Fechar">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="max-h-[calc(88vh-92px)] overflow-y-auto p-5">
            <ConsolidateShiftForm shift={shift} onClose={() => onOpenChange(false)} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ConsolidateShiftForm({ shift, onClose }: { shift: Shift; onClose: () => void }) {
  const store = useStore();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const initialWorkplaceRegime = store.workplaces.find((item) => item.id === shift.workplaceId)?.regime ?? "";
  const legacyDeductions = shift.deductions ?? (shift.settlementAdjustment
    ? [{ id: `legacy-${shift.id}`, type: "OUTRO" as DeductionType, amount: Math.max(0, shift.settlementAdjustment || 0), notes: "Ajuste migrado do campo legado" }]
    : []);
  const [date, setDate] = useState(shift.date);
  const [workplaceId, setWorkplaceId] = useState(shift.workplaceId);
  const [expectedPaymentDate, setExpectedPaymentDate] = useState(shift.expectedPaymentDate ?? shift.projectedPaymentDate ?? shift.date);
  const [originId, setOriginId] = useState(shift.originId || "home");
  const [hours, setHours] = useState(shift.hours);
  const [gross, setGross] = useState(shift.gross);
  const [procedure, setProcedure] = useState(shift.procedure ?? "");
  const [transportMode, setTransportMode] = useState<ShiftTransportMode>(shift.transportMode ?? "PRIVATE_TRANSPORT");
  const [privateTransportCost, setPrivateTransportCost] = useState(shift.privateTransportCost ?? 0);
  const [extraCost, setExtraCost] = useState(shift.extraCost ?? 0);
  const [deductions, setDeductions] = useState<Deduction[]>(legacyDeductions);
  const [taxRegime, setTaxRegime] = useState<TaxRegime | "">(shift.taxRegimeOverride ?? initialWorkplaceRegime);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(shift.paymentStatus ?? "PENDING");
  const [actualPaymentDate, setActualPaymentDate] = useState(shift.actualPaymentDate ?? todayIso());
  const [paymentDateError, setPaymentDateError] = useState(false);
  const isValid = Boolean(workplaceId && date && expectedPaymentDate && taxRegime && hours > 0 && gross > 0);
  const requiresActualPaymentDate = paymentStatus === "PAID";
  const previewRegime = taxRegime || getShiftRegime(store, shift);
  const selectedWorkplace = store.workplaces.find((item) => item.id === workplaceId);
  const preview = computeShift(store, {
    ...shift,
    date,
    workplaceId,
    originId,
    hours,
    gross,
    procedure: procedure.trim() || undefined,
    transportMode,
    privateTransportCost: transportMode === "PRIVATE_TRANSPORT" ? privateTransportCost : 0,
    extraCost: transportMode === "PERSONAL_VEHICLE" ? extraCost : 0,
    deductions,
    taxRegimeOverride: previewRegime,
  });

  function consolidate() {
    if (!isValid) return;
    if (requiresActualPaymentDate && !actualPaymentDate) {
      setPaymentDateError(true);
      return;
    }
    store.updateShift(shift.id, {
      date,
      workplaceId,
      expectedPaymentDate,
      projectedPaymentDate: expectedPaymentDate,
      originId,
      hours,
      gross,
      procedure: procedure.trim() || undefined,
      transportMode,
      privateTransportCost: transportMode === "PRIVATE_TRANSPORT" ? privateTransportCost : 0,
      extraCost: transportMode === "PERSONAL_VEHICLE" ? extraCost : 0,
      deductions,
      settlementAdjustment: 0,
      taxRegimeOverride: taxRegime as TaxRegime,
      paymentStatus,
      actualPaymentDate: paymentStatus === "PAID" ? actualPaymentDate : undefined,
      recordStatus: "consolidated",
    });
    onClose();
  }

  function discard() {
    store.removeShift(shift.id);
    onClose();
  }

  useEffect(() => {
    window.requestAnimationFrame(() => firstFieldRef.current?.focus());
  }, []);

  return (
    <div
      className="space-y-4"
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          consolidate();
        }
      }}
    >
      <div className="premium-panel grid gap-3 rounded-2xl p-4 sm:grid-cols-3">
        <MiniMetric label="Capturado em" value={formatEventDate(shift.date)} />
        <MiniMetric label="Duração" value={`${shift.hours}h`} />
        <MiniMetric label="Transporte" value={shift.transportMode === "PRIVATE_TRANSPORT" ? "Privado" : "Veículo pessoal"} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Data do plantão</span>
          <input ref={firstFieldRef} type="date" value={date} onChange={(event) => setDate(event.target.value)} className={dashboardInputCls} />
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Hospital</span>
          <select
            value={workplaceId}
            onChange={(event) => {
              const nextWorkplaceId = event.target.value;
              const nextWorkplace = store.workplaces.find((item) => item.id === nextWorkplaceId);
              setWorkplaceId(nextWorkplaceId);
              setTaxRegime(nextWorkplace?.regime ?? "");
            }}
            className={dashboardInputCls}
          >
            {store.workplaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Previsão de recebimento</span>
          <input type="date" value={expectedPaymentDate} onChange={(event) => setExpectedPaymentDate(event.target.value)} className={dashboardInputCls} />
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Duração</span>
          <input type="number" min={1} value={hours || ""} onChange={(event) => setHours(+event.target.value || 0)} className={dashboardInputCls} />
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Valor bruto</span>
          <input type="number" min={0} value={gross || ""} onChange={(event) => setGross(+event.target.value || 0)} className={`${dashboardInputCls} text-right tabular-nums`} />
        </label>
        <label className="space-y-1.5 md:col-span-2">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Procedimento</span>
          <input value={procedure} onChange={(event) => setProcedure(event.target.value)} className={dashboardInputCls} />
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Origem</span>
          <select value={originId} onChange={(event) => setOriginId(event.target.value)} className={dashboardInputCls}>
            <option value="home">{store.base.label}</option>
            {store.workplaces.filter((item) => item.id !== workplaceId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Regime fiscal</span>
          <select value={taxRegime} onChange={(event) => setTaxRegime(event.target.value as TaxRegime | "")} className={dashboardInputCls}>
            <option value="">Selecione o enquadramento</option>
            {Object.entries(TAX_LABELS).map(([regime, label]) => <option key={regime} value={regime}>{label}</option>)}
          </select>
          {selectedWorkplace && (
            <p className="text-xs text-muted-foreground">
              Sugerido pelo cadastro do hospital: {TAX_LABELS[selectedWorkplace.regime]}.
            </p>
          )}
        </label>
      </div>

      <div className="premium-panel grid gap-3 rounded-2xl p-3 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Status de recebimento</span>
          <select
            value={paymentStatus}
            onChange={(event) => {
              const next = event.target.value as PaymentStatus;
              setPaymentStatus(next);
              setPaymentDateError(false);
              if (next === "PAID" && !actualPaymentDate) setActualPaymentDate(todayIso());
            }}
            className={dashboardInputCls}
          >
            <option value="PAID">Recebido</option>
            <option value="PENDING">A receber</option>
          </select>
        </label>
        {paymentStatus === "PAID" && (
          <label className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Data do recebimento</span>
            <input
              type="date"
              required
              value={actualPaymentDate}
              onChange={(event) => {
                setActualPaymentDate(event.target.value);
                setPaymentDateError(false);
              }}
              className={`${dashboardInputCls} ${paymentDateError ? "border-rose-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-400/20" : ""}`}
            />
            {paymentDateError && (
              <p className="text-xs text-destructive">
                Para marcar como recebido, informe a data exata do pagamento para a contabilidade.
              </p>
            )}
          </label>
        )}
      </div>

      <div className="premium-panel mt-3 rounded-2xl p-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
          <TransportQuickButton active={transportMode === "PRIVATE_TRANSPORT"} onClick={() => setTransportMode("PRIVATE_TRANSPORT")}>Transporte Privado</TransportQuickButton>
          <TransportQuickButton active={transportMode === "PERSONAL_VEHICLE"} onClick={() => setTransportMode("PERSONAL_VEHICLE")}>Veículo Pessoal</TransportQuickButton>
        </div>
        <label className="mt-3 space-y-1.5 block">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {transportMode === "PRIVATE_TRANSPORT" ? "Custo direto" : "Gastos extras"}
          </span>
          <input
            type="number"
            min={0}
            value={(transportMode === "PRIVATE_TRANSPORT" ? privateTransportCost : extraCost) || ""}
            onChange={(event) => transportMode === "PRIVATE_TRANSPORT" ? setPrivateTransportCost(+event.target.value || 0) : setExtraCost(+event.target.value || 0)}
            className={`${dashboardInputCls} text-right tabular-nums`}
          />
        </label>
      </div>

      <div className="space-y-3">
        <DeductionManager deductions={deductions} onChange={setDeductions} />
        <div className="grid grid-cols-2 gap-2">
          <MiniMetric label="Imposto estimado" value={brl2(preview.tax)} tone="danger" />
          <MiniMetric label="Líquido projetado" value={brl2(preview.net)} tone="success" />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={discard} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-destructive/40 hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          Descartar pendência
        </button>
        <button
          type="button"
          onClick={consolidate}
          disabled={!isValid}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          Consolidar registro
        </button>
      </div>
    </div>
  );
}

function CardLink({ to, children }: { to: "/" | "/calendario" | "/fechamento" | "/patrimonio"; children: ReactNode }) {
  return (
    <Link to={to} className="text-xs text-primary inline-flex items-center gap-1 transition hover:text-accent">
      {children}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

function MiniMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "success" | "danger" }) {
  return (
    <div className="premium-panel rounded-xl px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono text-sm font-semibold mt-1 tabular-nums ${tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
  to,
  cta,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  to: "/novo-registro" | "/patrimonio";
  cta: string;
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/70 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-muted-foreground">
        {icon}
      </div>
      <h3 className="font-display text-lg mt-4 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mt-2">{body}</p>
      <Link
        to={to}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function getUpcomingOperationEvents(store: StoreState): OperationEvent[] {
  const today = todayIso();
  const events: OperationEvent[] = [];

  for (const shift of store.shifts) {
    if (!isConsolidatedRecord(shift)) continue;
    if (shift.date < today) continue;
    const workplace = store.workplaces.find((item) => item.id === shift.workplaceId);
    const math = computeShift(store, shift);
    events.push({
      id: `shift-${shift.id}`,
      date: shift.date,
      kind: "Plantão",
      title: workplace?.name ?? "Hospital não cadastrado",
      subtitle: `${shift.hours}h · líquido projetado`,
      value: math.net,
      tone: "emerald",
    });
  }

  for (const surgery of store.surgeries) {
    if (!isConsolidatedRecord(surgery)) continue;
    if (surgery.date < today) continue;
    if (surgery.myRole === "TITULAR") {
      const workplace = store.workplaces.find((item) => item.id === surgery.hospitalId);
      events.push({
        id: `surgery-${surgery.id}`,
        date: surgery.date,
        kind: "Cirurgia",
        title: workplace?.name ?? "Hospital não cadastrado",
        subtitle: surgery.procedure || "Procedimento titular",
        value: surgery.totalGross,
        tone: "petrol",
      });
    } else {
      events.push({
        id: `surgery-${surgery.id}`,
        date: surgery.date,
        kind: "Cirurgia",
        title: surgery.payingSurgeonName || "Repasse de equipe",
        subtitle: surgery.procedure || "Procedimento como membro",
        value: surgery.myExpectedShare,
        tone: "gold",
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || b.value - a.value).slice(0, 3);
}

function getWealthSnapshot(store: StoreState) {
  const totalAssets = store.assets.reduce((sum, item) => sum + item.currentValue, 0);
  const totalLiabilities = store.liabilities.reduce((sum, item) => sum + item.remainingBalance, 0);
  const denominator = totalAssets + totalLiabilities;
  const assetShare = denominator > 0 ? (totalAssets / denominator) * 100 : 0;
  const liabilityShare = denominator > 0 ? (totalLiabilities / denominator) * 100 : 0;

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    assetCount: store.assets.length,
    liabilityCount: store.liabilities.length,
    assetShare,
    liabilityShare,
  };
}

function getFinancialSummarySnapshot(store: StoreState, now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const manualProLabore = store.proLabores.reduce((sum, item) => sum + (item.monthly || 0), 0);
  const automaticProLabore = computedProLaboreMonthly(store, now);
  const proLaboreGross = Math.max(manualProLabore, automaticProLabore);
  const proLaboreInssBase = Math.min(proLaboreGross, remainingINSSBaseAfterCLT(store));
  const proLaboreInss = round2(proLaboreInssBase * PROLABORE_INSS_RATE);
  const proLaboreIrrf = calculateIRRF2026(proLaboreGross, proLaboreInss);
  const proLaboreTaxes = round2(proLaboreInss + proLaboreIrrf);
  const proLaboreNet = round2(Math.max(0, proLaboreGross - proLaboreTaxes));
  const simplesRevenue = getCurrentMonthRegimeTotal(store, year, month, ["PJ_SIMPLES"]);
  const pjRevenue = getCurrentMonthRegimeTotal(store, year, month, ["PJ_SIMPLES", "PJ_LUCRO_PRESUMIDO"]);
  const simpleRate = getEffectiveSimpleRate(simplesRevenue, proLaboreGross);
  const rollingFatorR = getRollingFatorRSnapshot(store, year, month);
  const factorBadge = !rollingFatorR.hasRevenue ? "Sem PJ Simples" : rollingFatorR.safe ? "Anexo III (OK)" : "Anexo V (risco)";
  const factorTone = !rollingFatorR.hasRevenue ? "neutral" : rollingFatorR.safe ? "safe" : "risk";

  let pjTax = 0;
  let pfWorkRevenue = 0;
  let pfTax = 0;
  let pjDeductions = 0;
  let pfDeductions = 0;

  const addRevenueByRegime = (gross: number, regime: TaxRegime, deductions: number = 0) => {
    const amount = Math.max(0, gross || 0);
    const deductionAmount = Math.max(0, deductions || 0);
    if (amount <= 0) return;

    if (regime === "PJ_SIMPLES") {
      pjTax += amount * simpleRate;
      pjDeductions += deductionAmount;
      return;
    }

    if (regime === "PJ_LUCRO_PRESUMIDO") {
      pjTax += amount * TAX_RATE.PJ_LUCRO_PRESUMIDO;
      pjDeductions += deductionAmount;
      return;
    }

    pfWorkRevenue += amount;
    pfDeductions += deductionAmount;
    if (regime === "PF" || regime === "RPA") {
      pfTax += calculateRPAWithholding(amount, store).total;
    } else if (regime === "CLT") {
      pfTax += calculateIRRF2026(amount, 0);
    }
  };

  for (const shift of store.shifts) {
    if (!isConsolidatedRecord(shift)) continue;
    if (!isInMonth(shift.date, year, month)) continue;
    addRevenueByRegime(shift.gross, getShiftRegime(store, shift), calculateTotalDeductions(shift));
  }

  for (const surgery of store.surgeries) {
    if (!isConsolidatedRecord(surgery)) continue;
    if (!isInMonth(surgery.date, year, month)) continue;
    if (surgery.myRole === "TITULAR") {
      const workplace = store.workplaces.find((item) => item.id === surgery.hospitalId);
      if (workplace) addRevenueByRegime(surgery.totalGross, workplace.regime, calculateTotalDeductions(surgery));
    } else {
      pfWorkRevenue += Math.max(0, surgery.myExpectedShare || 0);
      pfDeductions += calculateTotalDeductions(surgery);
      pfTax += calculateRPAWithholding(surgery.myExpectedShare, store).total;
    }
  }

  const pjCosts = store.fixedCosts
    .filter((cost) => cost.entityDomain === "PJ")
    .reduce((sum, cost) => sum + (cost.monthly || 0), 0);
  const pjNet = calculateNetValue(pjRevenue - pjTax - pjCosts, undefined, pjDeductions);
  const pfWorkNet = calculateNetValue(pfWorkRevenue - pfTax, undefined, pfDeductions);
  const pfRevenue = round2(proLaboreNet + pfWorkRevenue);
  const pfNet = round2(proLaboreNet + pfWorkNet);

  return {
    pjRevenue: round2(pjRevenue),
    pjTax: round2(pjTax),
    pjCosts: round2(pjCosts),
    pjDeductions: round2(pjDeductions),
    pjNet,
    pfRevenue,
    pfWorkRevenue: round2(pfWorkRevenue),
    pfTax: round2(pfTax),
    pfDeductions: round2(pfDeductions),
    pfNet,
    proLaboreGross: round2(proLaboreGross),
    proLaboreNet,
    proLaboreTaxes,
    totalTaxes: round2(pjTax + pfTax + proLaboreTaxes),
    consolidatedNet: round2(pjNet + pfNet),
    factorBadge,
    factorTone,
  };
}

function isInMonth(iso: string, year: number, month: number) {
  const date = new Date(`${iso}T12:00:00`);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

function formatEventDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

const dashboardInputCls = "w-full min-h-11 rounded-xl border border-border bg-card px-3 py-2.5 text-base text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25";
