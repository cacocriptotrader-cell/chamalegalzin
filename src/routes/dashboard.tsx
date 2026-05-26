import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  brl,
  brl2,
  calculateIRRF2026,
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
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  FileText,
  Inbox,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Table2,
  Trash2,
  TrendingUp,
  UploadCloud,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { QuickCaptureModal } from "@/components/QuickCaptureModal";
import { DeductionManager } from "@/components/DeductionManager";
import { BatchConsolidationModal } from "@/components/BatchConsolidationModal";
import { FiscalOnboardingModal } from "@/components/FiscalOnboardingModal";
import { supabase } from "@/lib/supabase";

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

type DoctorTaxObligation = {
  id: string;
  reference_month: string;
  official_amount: number | null;
  system_estimated_amount: number;
  pix_code: string | null;
  tax_annex: string | null;
  effective_tax_rate: number | null;
  status: string;
};

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function Dashboard() {
  const store = useStore();
  const [fiscalProfileOpen, setFiscalProfileOpen] = useState(false);
  const firstName = store.userProfile.fullName.trim().split(/\s+/)[0] || "Doutor(a)";
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const operationEvents = useMemo(() => getUpcomingOperationEvents(store), [store]);
  const financialSummary = useMemo(() => getFinancialSummarySnapshot(store, selectedMonth), [store, selectedMonth]);
  const draftShifts = useMemo(() => store.shifts.filter((shift) => shift.recordStatus === "draft"), [store.shifts]);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const hasOperationalData = store.shifts.length > 0 || store.surgeries.length > 0;
  const isZeroData = !hasOperationalData && draftShifts.length === 0;

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-4 px-0 py-4 animate-fade-in sm:space-y-5 sm:py-5 md:py-7">
      <header className="premium-card relative max-w-full overflow-hidden rounded-3xl p-4 sm:p-5 md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(15,118,110,0.18),transparent_30rem)]" />
        <div className="relative flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Cockpit privado
            </p>
            <h1 className="mt-4 font-display text-2xl text-foreground sm:text-3xl md:text-4xl">Hoje, {firstName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Uma leitura executiva do que importa agora: dinheiro no bolso, eficiência fiscal e pendências que precisam da sua decisão.
            </p>
          </div>
          <MonthPicker selectedMonth={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </header>

      <ExecutiveKpiDeck
        summary={financialSummary}
        draftCount={draftShifts.length}
        upcomingCount={operationEvents.length}
      />

      {!store.taxProfile.completed && <FiscalProfileBanner onOpen={() => setFiscalProfileOpen(true)} />}

      <DoctorTaxObligationsPanel />

      {isZeroData ? (
        <ZeroDataLaunchPad onQuickCapture={() => setQuickCaptureOpen(true)} />
      ) : (
        <div className="space-y-4">
          {draftShifts.length > 0 && (
            <DraftInbox shifts={draftShifts} />
          )}

          <ProgressiveSection
            eyebrow="Ações rápidas"
            title="Captura e rotas de trabalho"
            defaultOpen={draftShifts.length === 0}
          >
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <QuickCaptureCard onOpen={() => setQuickCaptureOpen(true)} />
              </div>
              <div className="lg:col-span-7">
                <QuickActions />
              </div>
            </div>
          </ProgressiveSection>

          <ProgressiveSection
            eyebrow="Camada executiva"
            title="Operação e caixa"
            defaultOpen={draftShifts.length === 0}
          >
            <section className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <OperationWidget events={operationEvents} />
              </div>
              <div className="grid gap-4 lg:col-span-6">
                <FinancialSummaryWidget summary={financialSummary} />
              </div>
            </section>
          </ProgressiveSection>
        </div>
      )}

      {fiscalProfileOpen && !store.taxProfile.completed && <FiscalOnboardingModal onOpenChange={setFiscalProfileOpen} />}
      <QuickCaptureModal open={quickCaptureOpen} onOpenChange={setQuickCaptureOpen} />
    </div>
  );
}

function MonthPicker({
  selectedMonth,
  onChange,
}: {
  selectedMonth: Date;
  onChange: (date: Date) => void;
}) {
  function moveMonth(offset: number) {
    onChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + offset, 1));
  }

  function resetToCurrentMonth() {
    const now = new Date();
    onChange(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  return (
    <div className="premium-panel w-full min-w-0 rounded-2xl px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:w-auto">
      <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Período analisado</p>
      <div className="flex w-full min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={resetToCurrentMonth}
          className="min-w-0 flex-1 truncate rounded-xl border border-border bg-card px-3 py-2 text-center font-mono text-sm font-semibold capitalize tabular-nums text-foreground transition hover:border-primary/40 sm:min-w-[150px] sm:flex-none"
          title="Voltar para o mês atual"
        >
          {selectedMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </button>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function FiscalProfileBanner({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="premium-card max-w-full overflow-hidden rounded-2xl p-4 md:p-5">
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-primary">Tarefa opcional</p>
            <h2 className="mt-1 text-base font-semibold text-foreground">Complete seu Perfil Fiscal quando for consolidar</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Você já pode lançar plantões. Fontes de renda, PJ/RPA e médias mensais ficam para depois, quando os dados forem necessários para o Dossiê.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/15 sm:w-auto"
        >
          Completar Perfil Fiscal
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function DoctorTaxObligationsPanel() {
  const [obligations, setObligations] = useState<DoctorTaxObligation[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadObligations() {
      setLoading(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user?.id) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("tax_obligations")
        .select("id,reference_month,official_amount,system_estimated_amount,pix_code,tax_annex,effective_tax_rate,status")
        .eq("doctor_id", authData.user.id)
        .eq("status", "PUBLISHED_TO_DOCTOR")
        .order("reference_month", { ascending: false });

      if (!cancelled) {
        if (error) {
          toast.error("Não foi possível carregar guias fiscais publicadas.", { duration: 5000 });
          setObligations([]);
        } else {
          setObligations((data ?? []).map((item) => ({
            id: String(item.id),
            reference_month: String(item.reference_month),
            official_amount: item.official_amount == null ? null : Number(item.official_amount),
            system_estimated_amount: Number(item.system_estimated_amount ?? 0),
            pix_code: item.pix_code == null ? null : String(item.pix_code),
            tax_annex: item.tax_annex == null ? null : String(item.tax_annex),
            effective_tax_rate: item.effective_tax_rate == null ? null : Number(item.effective_tax_rate),
            status: String(item.status ?? "PUBLISHED_TO_DOCTOR"),
          })));
        }
        setLoading(false);
      }
    }

    void loadObligations();
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyPix(obligation: DoctorTaxObligation) {
    if (!obligation.pix_code) {
      toast.warning("Esta guia ainda não tem código Pix publicado.", { duration: 4000 });
      return;
    }
    await navigator.clipboard.writeText(obligation.pix_code);
    toast.success("Código Pix copiado.", { duration: 4000 });
  }

  async function markAsPaid(obligation: DoctorTaxObligation) {
    if (syncingId) return;
    setSyncingId(obligation.id);
    const previous = obligations;
    setObligations((current) => current.filter((item) => item.id !== obligation.id));

    const { error } = await supabase
      .from("tax_obligations")
      .update({
        status: "PAID",
        updated_at: new Date().toISOString(),
      })
      .eq("id", obligation.id);

    if (error) {
      setObligations(previous);
      toast.error("Não foi possível marcar a guia como paga.", { duration: 5000 });
    } else {
      toast.success("Guia marcada como paga.", { duration: 4000 });
    }
    setSyncingId(null);
  }

  return (
    <section className="premium-card max-w-full overflow-hidden rounded-2xl p-4 md:p-5">
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-primary">Guias fiscais</p>
          <h2 className="mt-1 text-base font-semibold text-foreground">Pendências publicadas pelo contador</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Acompanhe guias disponíveis para pagamento e copie o Pix sem sair do painel.
          </p>
        </div>
        <div data-testid="doctor-tax-chart" className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          {obligations.length > 0 ? `${obligations.length} pendente${obligations.length === 1 ? "" : "s"}` : "Tudo quitado"}
        </div>
      </div>

      <div data-testid="doctor-tax-pending-list" className="mt-4 space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-border bg-surface/70 p-4 text-sm text-muted-foreground">
            Carregando guias fiscais...
          </div>
        ) : obligations.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface/70 p-4 text-sm text-muted-foreground">
            Nenhuma guia fiscal pendente.
          </div>
        ) : (
          obligations.map((obligation) => {
            const amount = obligation.official_amount ?? obligation.system_estimated_amount;
            return (
              <article
                key={obligation.id}
                data-testid={`doctor-tax-obligation-${obligation.reference_month.replace("/", "-")}`}
                className="rounded-2xl border border-border bg-surface/70 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">Guia {obligation.reference_month}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {obligation.tax_annex ?? "Anexo não informado"}
                      {obligation.effective_tax_rate != null ? ` · ${obligation.effective_tax_rate.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <p className="font-mono text-xl font-semibold text-warning tabular-nums">{brl2(amount)}</p>
                    <button
                      type="button"
                      data-testid="doctor-tax-copy-pix"
                      onClick={() => void copyPix(obligation)}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                    >
                      Copiar PIX
                    </button>
                    <button
                      type="button"
                      data-testid="doctor-tax-mark-paid"
                      onClick={() => void markAsPaid(obligation)}
                      disabled={syncingId === obligation.id}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:bg-muted disabled:text-muted-foreground"
                    >
                      {syncingId === obligation.id ? "Atualizando..." : "Marcar como Pago"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function ExecutiveKpiDeck({
  summary,
  draftCount,
  upcomingCount,
}: {
  summary: ReturnType<typeof getFinancialSummarySnapshot>;
  draftCount: number;
  upcomingCount: number;
}) {
  return (
    <section className="grid w-full max-w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <ExecutiveKpiCard
        label="Faturamento bruto PJ"
        value={brl2(summary.pjRevenue)}
        detail="Competência atual"
        icon={<WalletCards className="h-4 w-4" />}
        tone="neutral"
      />
      <ExecutiveKpiCard
        label="Resultado líquido"
        value={brl2(summary.consolidatedNet)}
        detail="Depois de impostos e despesas"
        icon={<CircleDollarSign className="h-4 w-4" />}
        tone={summary.consolidatedNet >= 0 ? "success" : "danger"}
      />
      <TaxBurdenKpiCard summary={summary} />
      <ExecutiveKpiCard
        label="Pendências"
        value={String(draftCount)}
        detail={draftCount > 0 ? "Rascunhos no Inbox" : `${upcomingCount} próximos eventos`}
        icon={<Inbox className="h-4 w-4" />}
        tone={draftCount > 0 ? "warning" : "neutral"}
      />
    </section>
  );
}

function TaxBurdenKpiCard({ summary }: { summary: ReturnType<typeof getFinancialSummarySnapshot> }) {
  return (
    <article className="premium-card min-w-0 overflow-hidden rounded-2xl p-4 shadow-[0_18px_64px_rgba(0,0,0,0.22)] transition hover:border-primary/35">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Índice tributário</p>
          <p className="mt-3 truncate font-mono text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
            Carga efetiva
          </p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-surface/70 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Carga PJ</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-success">
            {summary.effectiveRatePJ.toFixed(1)}%
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-surface/70 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Carga PF/RPA</span>
          <span className={`font-mono text-sm font-semibold tabular-nums ${summary.pfRevenue > 0 ? "text-warning" : "text-muted-foreground"}`}>
            {summary.effectiveRatePF.toFixed(1)}%
          </span>
        </div>
      </div>
    </article>
  );
}

function ExecutiveKpiCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    neutral: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  }[tone];

  return (
    <article className="premium-card min-w-0 overflow-hidden rounded-2xl p-4 shadow-[0_18px_64px_rgba(0,0,0,0.22)] transition hover:border-primary/35">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className={`mt-3 break-words font-mono text-xl font-semibold leading-tight tabular-nums tracking-tight sm:text-2xl ${toneClass}`}>
            {value}
          </p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </article>
  );
}

function ZeroDataLaunchPad({ onQuickCapture }: { onQuickCapture: () => void }) {
  return (
    <section className="premium-card max-w-full overflow-hidden rounded-3xl p-4 sm:p-5 md:p-7">
      <div className="grid min-w-0 gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            <TrendingUp className="h-3.5 w-3.5" />
            Primeiro valor em menos de um minuto
          </p>
          <h2 className="mt-5 font-display text-2xl text-foreground md:text-3xl">
            Comece pelo plantão que acabou de fazer.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            Não cadastre CNPJ, regime fiscal ou regra de repasse agora. Capture hospital, duração, valor e transporte. O DocFin cria uma pendência segura para você revisar quando estiver descansado.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onQuickCapture}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_0_28px_rgba(15,118,110,0.24)] transition hover:bg-primary/90 sm:w-auto"
            >
              Lançar primeiro plantão
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              to="/lancar-plantoes"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-primary sm:w-auto"
            >
              Abrir mesa em lote
              <Table2 className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-black/30 p-4">
          <div className="space-y-3">
            {[
              ["Hospital", "Digite o nome, mesmo que ainda não exista"],
              ["Duração", "12h"],
              ["Valor bruto", "R$ 3.600,00"],
              ["Transporte", "Privado · R$ 120,00"],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1 rounded-xl border border-border/80 bg-surface/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
                <span className="min-w-0 break-words font-mono text-sm font-semibold tabular-nums text-foreground sm:text-right">{value}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-xs leading-relaxed text-success">
            O rascunho entra no Inbox e fica fora dos cálculos globais até a consolidação.
          </p>
        </div>
      </div>
    </section>
  );
}

function ProgressiveSection({
  eyebrow,
  title,
  defaultOpen,
  children,
}: {
  eyebrow: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group premium-card min-w-0 overflow-hidden rounded-2xl p-4 md:p-5" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-1 font-display text-lg text-foreground sm:text-xl">{title}</h2>
        </div>
        <span className="shrink-0 rounded-full border border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition group-open:border-primary/35 group-open:text-primary">
          Ver detalhes
        </span>
      </summary>
      <div className="mt-5">{children}</div>
    </details>
  );
}

function QuickActions() {
  return (
    <section className="grid w-full min-w-0 gap-3 sm:grid-cols-3">
      <QuickAction
        to="/lancar-plantoes"
        icon={<Table2 className="h-4 w-4" />}
        label="Lançar Plantões"
        description="Mesa em lote"
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
          to="/lancar-plantoes"
          cta="Abrir mesa de lançamentos"
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="premium-panel min-w-0 overflow-hidden rounded-2xl p-4">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                <p className="w-full break-words font-mono text-lg font-semibold leading-tight tabular-nums text-success sm:w-auto sm:shrink-0 sm:text-xl sm:text-right">{brl(event.value)}</p>
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
  const taxesAndExpenses = summary.totalTaxes + summary.totalDeductions + summary.monthlyLoggedExpenses;
  const expenseRatio = summary.consolidatedGross > 0 ? Math.min(100, (taxesAndExpenses / summary.consolidatedGross) * 100) : 0;
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
      <div className="premium-panel max-w-full overflow-hidden rounded-2xl p-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Dinheiro no bolso</p>
            <p className={`mt-2 break-words font-mono text-2xl font-semibold leading-tight tabular-nums tracking-tight sm:text-3xl md:text-4xl ${resultTone}`}>
              {brl(summary.consolidatedNet)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Resultado líquido depois de impostos, custos e despesas do mês.</p>
          </div>
          <div className={`w-fit rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${badgeClass}`}>
            {summary.factorBadge}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>Bruto consolidado</span>
            <span>Impostos & despesas</span>
          </div>
          <div className="h-3 rounded-full bg-surface overflow-hidden border border-border">
            <div className="h-full bg-destructive/80" style={{ width: `${expenseRatio}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>{brl2(summary.consolidatedGross)}</span>
            <span>{brl2(taxesAndExpenses)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 mt-3">
        <MiniMetric label="Faturamento Bruto PJ" value={brl2(summary.pjRevenue)} />
        <MiniMetric label="Faturamento RPA / Autônomo" value={brl2(summary.pfRevenue)} />
        {summary.scpRevenue > 0 && <MiniMetric label="Faturamento SCP" value={brl2(summary.scpRevenue)} />}
        <MiniMetric label="Impostos & Despesas" value={brl2(taxesAndExpenses)} tone="danger" />
        <MiniMetric
          label="Resultado Líquido Consolidado"
          value={brl2(summary.consolidatedNet)}
          tone={summary.consolidatedNet >= 0 ? "success" : "danger"}
          strong
        />
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
    <section className={`premium-card min-w-0 overflow-hidden rounded-2xl p-4 sm:p-5 md:p-6 ${className}`}>
      <div className="mb-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
            <h2 className="mt-0.5 font-display text-lg text-foreground sm:text-xl">{title}</h2>
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
  to: "/" | "/novo-registro" | "/lancar-plantoes" | "/patrimonio" | "/fechamento";
  icon: ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="premium-card flex min-w-0 items-center justify-between gap-3 rounded-2xl p-4 transition hover:border-primary/40 hover:bg-primary/[0.045]"
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

function QuickCaptureCard({ onOpen }: { onOpen: () => void }) {
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
          onClick={onOpen}
          className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_rgba(15,118,110,0.18)] transition hover:bg-primary/90"
        >
          Abrir captura rápida
        </button>
      </div>
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
  const [optimisticIds, setOptimisticIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
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
    const ids = [...selectedIds];
    const count = selectedIds.length;
    setOptimisticIds(ids);
    setSelectedIds([]);
    setBatchOpen(false);
    store.batchConsolidateShifts(ids, data);
    toast.success(`${count} rascunho${count === 1 ? "" : "s"} consolidado${count === 1 ? "" : "s"}. Sincronizando em segundo plano.`);
    window.setTimeout(() => {
      setOptimisticIds((current) => current.filter((id) => !ids.includes(id)));
    }, 900);
  }

  async function handleDeleteShift(shiftId: string) {
    if (deletingIds.includes(shiftId)) return;
    if (!window.confirm("Deseja realmente excluir este plantão?")) return;
    setDeletingIds((current) => [...current, shiftId]);
    const status = await store.deleteShift(shiftId);
    setDeletingIds((current) => current.filter((id) => id !== shiftId));
    if (status === "synced") {
      setSelectedIds((current) => current.filter((id) => id !== shiftId));
      if (selectedId === shiftId) setSelectedId(null);
      toast.success("Plantão excluído com sucesso.", { duration: 4000 });
      return;
    }
    toast.error("Não foi possível excluir este plantão agora. Tente novamente em instantes.", { duration: 5000 });
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
        <div className="grid min-w-0 gap-3">
          <div className="premium-panel flex w-full min-w-0 flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
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
              <label className="flex w-full min-w-0 flex-col gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:min-w-[220px]">
                Hospital
                <select
                  value={selectedHospitalFilter}
                  onChange={(event) => setSelectedHospitalFilter(event.target.value)}
                  className="w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-xs normal-case tracking-normal text-foreground outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
                >
                  <option value="ALL">Exibir Todos</option>
                  {hospitalOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </label>
            </div>
            {selectedIds.length > 0 && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <span className="text-xs text-muted-foreground">{selectedIds.length} selecionado{selectedIds.length === 1 ? "" : "s"}</span>
                <button
                  type="button"
                  onClick={() => setBatchOpen(true)}
                  className="min-h-11 w-full rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 sm:w-auto"
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
                syncing={optimisticIds.includes(shift.id)}
                deleting={deletingIds.includes(shift.id)}
                onToggleSelected={() => toggleSelection(shift.id)}
                onEdit={() => setSelectedId(shift.id)}
                onDelete={() => void handleDeleteShift(shift.id)}
              />
            ))
          )}
          <ConsolidationModal
            shift={selectedShift}
            open={Boolean(selectedShift)}
            deleting={selectedShift ? deletingIds.includes(selectedShift.id) : false}
            onDelete={(id) => void handleDeleteShift(id)}
            onOpenChange={(open) => { if (!open) setSelectedId(null); }}
          />
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
  syncing,
  deleting,
  onToggleSelected,
  onEdit,
  onDelete,
}: {
  shift: Shift;
  active: boolean;
  selected: boolean;
  syncing: boolean;
  deleting: boolean;
  onToggleSelected: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const store = useStore();
  const workplace = store.workplaces.find((item) => item.id === shift.workplaceId);
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-2xl border p-4 text-left transition ${active ? "border-primary/45 bg-primary/10" : "premium-panel hover:border-primary/30"} ${syncing || deleting ? "opacity-60" : ""}`}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex w-full min-w-0 items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelected}
            className="mt-1 h-4 w-4 shrink-0 rounded border-border bg-card accent-primary"
            aria-label={`Selecionar ${workplace?.name ?? "plantão"}`}
          />
          <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {formatEventDate(shift.date)} · {syncing ? "Sincronizando" : "Rascunho"}
            </p>
            <h3 className="mt-1 truncate text-sm font-semibold text-foreground">{workplace?.name ?? "Hospital não cadastrado"}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{shift.hours}h · {shift.procedure || "Plantão rápido"}</p>
          </button>
        </div>
        <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          <span className="font-mono text-sm font-semibold text-success tabular-nums">{brl2(shift.gross)}</span>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-destructive/35 bg-destructive/10 px-3 text-xs font-semibold text-destructive transition hover:border-destructive/60 hover:bg-destructive/15 disabled:cursor-wait disabled:opacity-60"
            aria-label="Excluir plantão"
            title="Excluir plantão"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">{deleting ? "Excluindo..." : "Excluir"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ConsolidationModal({
  shift,
  open,
  deleting,
  onDelete,
  onOpenChange,
}: {
  shift: Shift | null;
  open: boolean;
  deleting: boolean;
  onDelete: (id: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!shift) {
    return <Dialog.Root open={false} onOpenChange={onOpenChange} />;
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md" />
        <Dialog.Content className="premium-modal fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[calc(100vw-32px)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl p-0">
          <div className="flex flex-col gap-4 border-b border-border bg-surface-elevated/70 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-xl text-foreground">Consolidar pendência</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Complete o enquadramento contábil antes deste plantão entrar nos motores financeiros.
              </Dialog.Description>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => onDelete(shift.id)}
                disabled={deleting}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-destructive/35 bg-destructive/10 text-destructive transition hover:border-destructive/60 hover:bg-destructive/15 disabled:cursor-wait disabled:opacity-60"
                aria-label="Excluir plantão"
                title="Excluir plantão"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <Dialog.Close className="rounded-xl border border-border p-2 text-muted-foreground transition hover:text-foreground" aria-label="Fechar">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
          </div>
          <div className="max-h-[calc(88vh-92px)] overflow-y-auto p-5">
            <ConsolidateShiftForm shift={shift} deleting={deleting} onDelete={onDelete} onClose={() => onOpenChange(false)} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ConsolidateShiftForm({
  shift,
  deleting,
  onDelete,
  onClose,
}: {
  shift: Shift;
  deleting: boolean;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
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
  const [invoiceIssueDate, setInvoiceIssueDate] = useState(shift.invoiceIssueDate ?? todayIso());
  const [invoiceNumber, setInvoiceNumber] = useState(shift.invoiceNumber ?? "");
  const [paymentDateError, setPaymentDateError] = useState(false);
  const [invoiceDateError, setInvoiceDateError] = useState(false);
  const [optimisticAction, setOptimisticAction] = useState<"consolidating" | "discarding" | null>(null);
  const isValid = Boolean(workplaceId && date && expectedPaymentDate && invoiceIssueDate && taxRegime && hours > 0 && gross > 0);
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
    if (optimisticAction || !isValid) return;
    if (!invoiceIssueDate) {
      setInvoiceDateError(true);
      return;
    }
    if (requiresActualPaymentDate && !actualPaymentDate) {
      setPaymentDateError(true);
      return;
    }
    setOptimisticAction("consolidating");
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
      invoiceIssueDate,
      invoiceNumber: invoiceNumber.trim() || undefined,
      recordStatus: "consolidated",
    });
    toast.success("Pendência consolidada. Sincronizando em segundo plano.");
    onClose();
  }

  function discard() {
    if (optimisticAction || deleting) return;
    onDelete(shift.id);
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
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Data de Emissão da NF</span>
          <input
            type="date"
            required
            value={invoiceIssueDate}
            onChange={(event) => {
              setInvoiceIssueDate(event.target.value);
              setInvoiceDateError(false);
            }}
            className={`${dashboardInputCls} ${invoiceDateError ? "border-rose-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-400/20" : ""}`}
          />
          {invoiceDateError && (
            <p className="text-xs text-destructive">
              Informe a data de emissão da NF para definir a competência fiscal.
            </p>
          )}
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Número da NF (opcional)</span>
          <input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} className={dashboardInputCls} placeholder="Ex.: 2026-0012" />
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
        <div className="grid gap-1 rounded-xl border border-border bg-card p-1 sm:grid-cols-2">
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
        <div className="grid gap-2 sm:grid-cols-2">
          <MiniMetric label="Imposto estimado" value={brl2(preview.tax)} tone="danger" />
          <MiniMetric label="Líquido projetado" value={brl2(preview.net)} tone="success" />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={discard}
          disabled={Boolean(optimisticAction) || deleting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition hover:border-destructive/60 hover:bg-destructive/15 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? "Excluindo..." : "Excluir plantão"}
        </button>
        <button
          type="button"
          onClick={consolidate}
          disabled={!isValid || Boolean(optimisticAction)}
          className="w-full rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:w-auto"
        >
          {optimisticAction === "consolidating" ? "Consolidando..." : "Consolidar registro"}
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

function MiniMetric({
  label,
  value,
  tone = "neutral",
  strong = false,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "danger";
  strong?: boolean;
}) {
  return (
    <div className={`premium-panel min-w-0 overflow-hidden rounded-xl px-3 py-2.5 ${strong ? "border-success/30 bg-success/10" : ""}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 break-words font-mono ${strong ? "text-base" : "text-sm"} font-semibold leading-tight tabular-nums ${tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-foreground"}`}>
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
  to: "/lancar-plantoes" | "/novo-registro" | "/patrimonio";
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
  const simpleRate = getEffectiveSimpleRate(simplesRevenue, proLaboreGross);
  const rollingFatorR = getRollingFatorRSnapshot(store, year, month);
  const factorBadge = !rollingFatorR.hasRevenue ? "Sem PJ Simples" : rollingFatorR.safe ? "Anexo III (OK)" : "Anexo V (risco)";
  const factorTone = !rollingFatorR.hasRevenue ? "neutral" : rollingFatorR.safe ? "safe" : "risk";

  let pjRevenue = 0;
  let pjTax = 0;
  let pfRevenue = 0;
  let scpRevenue = 0;
  let pfTax = 0;
  let pjDeductions = 0;
  let pfDeductions = 0;
  let scpDeductions = 0;

  const addRevenueByRegime = (gross: number, regime: TaxRegime, deductions: number = 0) => {
    const amount = Math.max(0, gross || 0);
    const deductionAmount = Math.abs(deductions || 0);
    if (amount <= 0) return;

    if (regime === "PJ_SIMPLES") {
      pjRevenue += amount;
      pjTax += Math.abs(amount * simpleRate);
      pjDeductions += deductionAmount;
      return;
    }

    if (regime === "PJ_LUCRO_PRESUMIDO") {
      pjRevenue += amount;
      pjTax += Math.abs(amount * TAX_RATE.PJ_LUCRO_PRESUMIDO);
      pjDeductions += deductionAmount;
      return;
    }

    if (regime === "SCP") {
      scpRevenue += amount;
      scpDeductions += deductionAmount;
      return;
    }

    pfRevenue += amount;
    pfDeductions += deductionAmount;
    if (regime === "PF" || regime === "RPA") {
      pfTax += Math.abs(calculateRPAWithholding(amount, store).total);
    } else if (regime === "CLT") {
      pfTax += Math.abs(calculateIRRF2026(amount, 0));
    }
  };

  for (const shift of store.shifts) {
    if (!isConsolidatedRecord(shift)) continue;
    if (!isInMonth(getShiftCashDate(shift), year, month)) continue;
    addRevenueByRegime(shift.gross, getShiftRegime(store, shift), calculateTotalDeductions(shift));
  }

  for (const surgery of store.surgeries) {
    if (!isConsolidatedRecord(surgery)) continue;
    if (!isInMonth(surgery.date, year, month)) continue;
    if (surgery.myRole === "TITULAR") {
      const workplace = store.workplaces.find((item) => item.id === surgery.hospitalId);
      if (workplace) addRevenueByRegime(surgery.totalGross, workplace.regime, calculateTotalDeductions(surgery));
    } else {
      const memberRevenue = Math.max(0, surgery.myExpectedShare || 0);
      scpRevenue += memberRevenue;
      scpDeductions += Math.abs(calculateTotalDeductions(surgery));
    }
  }

  const monthlyLoggedExpenses = store.expenses
    .filter((expense) => isInMonth(expense.date, year, month))
    .reduce((sum, expense) => sum + Math.abs(expense.amount || 0), 0);
  const totalDeductions = round2(pjDeductions + pfDeductions + scpDeductions);
  const totalTaxes = round2(pjTax + pfTax + proLaboreTaxes);
  const consolidatedGross = round2(pjRevenue + pfRevenue + scpRevenue);
  const pjNet = round2(Math.max(0, pjRevenue - pjTax - pjDeductions));
  const pfNet = round2(Math.max(0, pfRevenue - pfTax - pfDeductions));
  const scpNet = round2(Math.max(0, scpRevenue - scpDeductions));
  const consolidatedNet = round2(consolidatedGross - totalTaxes - totalDeductions - monthlyLoggedExpenses);
  const effectiveRatePJ = pjRevenue > 0 ? round2((pjTax / pjRevenue) * 100) : 0;
  const effectiveRatePF = pfRevenue > 0 ? round2((pfTax / pfRevenue) * 100) : 0;

  return {
    pjRevenue: round2(pjRevenue),
    pjTax: round2(pjTax),
    pjCosts: 0,
    monthlyLoggedExpenses: round2(monthlyLoggedExpenses),
    pjDeductions: round2(pjDeductions),
    pjNet,
    pfRevenue: round2(pfRevenue),
    pfWorkRevenue: round2(pfRevenue),
    pfTax: round2(pfTax),
    pfDeductions: round2(pfDeductions),
    pfNet,
    scpRevenue: round2(scpRevenue),
    scpDeductions: round2(scpDeductions),
    scpNet,
    proLaboreGross: round2(proLaboreGross),
    proLaboreNet,
    proLaboreTaxes,
    totalDeductions,
    totalTaxes,
    consolidatedGross,
    consolidatedNet,
    effectiveRatePJ,
    effectiveRatePF,
    factorBadge,
    factorTone,
    factorPercent: rollingFatorR.factorPercent,
    factorSafe: rollingFatorR.safe,
    hasSimpleRevenue: rollingFatorR.hasRevenue,
  };
}

function getShiftCashDate(shift: Shift) {
  if (shift.paymentStatus === "PAID" && shift.actualPaymentDate) return shift.actualPaymentDate;
  return shift.expectedPaymentDate ?? shift.projectedPaymentDate ?? shift.date;
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
