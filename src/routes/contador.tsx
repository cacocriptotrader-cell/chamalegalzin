import * as Dialog from "@radix-ui/react-dialog";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  brl2,
  calculateTotalDeductions,
  computeShift,
  fmtDate,
  getRollingFatorRSnapshot,
  isConsolidatedRecord,
  useStore,
  type AccountantClientRequest,
  type LinkedClient,
  type Shift,
} from "@/lib/store";
import {
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Inbox,
  Loader2,
  ReceiptText,
  ShieldCheck,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/contador")({
  head: () => ({
    meta: [
      { title: "Painel Contábil — Docfin" },
      { name: "description", content: "Visão do contador para clientes médicos vinculados." },
    ],
  }),
  component: ContadorPage,
});

type TaxObligationStatus = "PENDING_VALIDATION" | "PUBLISHED_TO_DOCTOR" | "VALIDATED" | "PAID" | "CANCELLED" | string;

type TaxObligation = {
  id: string;
  doctor_id: string;
  accountant_id: string;
  reference_month: string;
  system_estimated_amount: number;
  official_amount?: number | null;
  status: TaxObligationStatus;
  pix_code?: string | null;
  pdf_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

type TaxableShiftRow = {
  id: string;
  user_id: string;
  gross: number;
  invoice_issue_date: string | null;
  tax_regime_override: string | null;
};

type ObligationRow = {
  obligation: TaxObligation;
  client?: LinkedClient;
  taxableBase: number;
};

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const inputCls = "w-full min-h-11 rounded-xl border border-border bg-card px-3 py-2.5 text-base text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25";

function ContadorPage() {
  const store = useStore();
  const linkedClients = store.userProfile.linkedClients ?? [];
  const now = new Date();
  const [competenceDate, setCompetenceDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const selectedCompetence = formatReferenceMonth(competenceDate);
  const [selectedClientId, setSelectedClientId] = useState(store.userProfile.activeClientShiftId ?? linkedClients[0]?.id ?? "");
  const [requests, setRequests] = useState<AccountantClientRequest[]>([]);
  const [taxObligations, setTaxObligations] = useState<TaxObligation[]>([]);
  const [taxableBaseByDoctor, setTaxableBaseByDoctor] = useState<Record<string, number>>({});
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [obligationsLoading, setObligationsLoading] = useState(false);
  const [syncingRequestId, setSyncingRequestId] = useState<string | null>(null);
  const [clientLoading, setClientLoading] = useState(false);
  const [validatingObligation, setValidatingObligation] = useState<ObligationRow | null>(null);
  const activeClient = linkedClients.find((client) => client.id === selectedClientId);

  useEffect(() => {
    void refreshRequests();
  }, []);

  useEffect(() => {
    if (selectedClientId || linkedClients.length === 0) return;
    setSelectedClientId(linkedClients[0].id);
  }, [linkedClients, selectedClientId]);

  useEffect(() => {
    if (!selectedClientId) return;
    let cancelled = false;
    setClientLoading(true);
    void store.setActiveClient(selectedClientId)
      .then(() => store.loadLinkedClientOperationalState(selectedClientId))
      .finally(() => {
        if (!cancelled) setClientLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClientId]);

  useEffect(() => {
    void refreshTaxObligations(selectedCompetence);
  }, [selectedCompetence, linkedClients.length]);

  const obligationRows = useMemo<ObligationRow[]>(
    () => taxObligations.map((obligation) => {
      const client = linkedClients.find((item) => item.id === obligation.doctor_id);
      const taxableBase = taxableBaseByDoctor[obligation.doctor_id] ?? estimateTaxableBaseFromTax(obligation.system_estimated_amount);
      return { obligation, client, taxableBase };
    }),
    [linkedClients, taxableBaseByDoctor, taxObligations],
  );

  const pendingCount = obligationRows.filter((row) => row.obligation.status === "PENDING_VALIDATION").length;
  const publishedCount = obligationRows.filter((row) => row.obligation.status === "PUBLISHED_TO_DOCTOR").length;
  const paidCount = obligationRows.filter((row) => row.obligation.status === "PAID").length;
  const totalEstimated = obligationRows.reduce((sum, row) => sum + row.obligation.system_estimated_amount, 0);

  const paidShifts = useMemo(
    () => store.shifts.filter((shift) => isConsolidatedRecord(shift) && shift.paymentStatus === "PAID"),
    [store.shifts],
  );
  const selectedMonthPaidShifts = useMemo(
    () => paidShifts.filter((shift) => isInReferenceMonth(shift.actualPaymentDate ?? shift.date, selectedCompetence)),
    [paidShifts, selectedCompetence],
  );
  const monthlyReceived = selectedMonthPaidShifts.reduce((sum, shift) => sum + shift.gross, 0);
  const totalDeductions = selectedMonthPaidShifts.reduce((sum, shift) => sum + calculateTotalDeductions(shift), 0);
  const fatorR = getRollingFatorRSnapshot(store, competenceDate.getFullYear(), competenceDate.getMonth() + 1);

  async function refreshRequests() {
    setRequestsLoading(true);
    const nextRequests = await store.fetchAccountantClientRequests();
    setRequests(nextRequests);
    setRequestsLoading(false);
  }

  async function refreshTaxObligations(referenceMonth = selectedCompetence) {
    const clientIds = linkedClients.map((client) => client.id);
    setObligationsLoading(true);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user?.id) {
      logger.warn("Painel Contábil: contador sem sessão para carregar obrigações.", authError);
      setTaxObligations([]);
      setTaxableBaseByDoctor({});
      setObligationsLoading(false);
      return;
    }

    let obligationsQuery = supabase
      .from("tax_obligations")
      .select("id,doctor_id,accountant_id,reference_month,system_estimated_amount,official_amount,status,pix_code,pdf_url,created_at,updated_at")
      .eq("accountant_id", authData.user.id)
      .eq("reference_month", referenceMonth)
      .order("created_at", { ascending: false });

    if (clientIds.length > 0) obligationsQuery = obligationsQuery.in("doctor_id", clientIds);

    const [{ data: obligationsData, error: obligationsError }, baseMap] = await Promise.all([
      obligationsQuery,
      fetchTaxableBaseByDoctor(clientIds, referenceMonth),
    ]);

    if (obligationsError) {
      logger.error("Painel Contábil: falha ao carregar obrigações fiscais.", obligationsError);
      toast.error("Não foi possível carregar obrigações fiscais do mês.", { duration: 5000 });
      setTaxObligations([]);
    } else {
      setTaxObligations((obligationsData ?? []).map(normalizeTaxObligation));
    }
    setTaxableBaseByDoctor(baseMap);
    setObligationsLoading(false);
  }

  async function fetchTaxableBaseByDoctor(clientIds: string[], referenceMonth: string) {
    if (clientIds.length === 0) return {};
    const [month, year] = referenceMonth.split("/").map(Number);
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0);
    const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    const { data, error } = await supabase
      .from("shifts")
      .select("id,user_id,gross,invoice_issue_date,tax_regime_override")
      .in("user_id", clientIds)
      .gte("invoice_issue_date", start)
      .lte("invoice_issue_date", end)
      .eq("record_status", "consolidated");

    if (error) {
      logger.error("Painel Contábil: falha ao calcular base tributável.", error);
      return {};
    }

    return ((data ?? []) as TaxableShiftRow[]).reduce<Record<string, number>>((acc, shift) => {
      if (shift.tax_regime_override !== "PJ_SIMPLES" && shift.tax_regime_override !== "PJ_LUCRO_PRESUMIDO") return acc;
      acc[shift.user_id] = round2((acc[shift.user_id] ?? 0) + Number(shift.gross ?? 0));
      return acc;
    }, {});
  }

  async function acceptRequest(request: AccountantClientRequest) {
    if (syncingRequestId) return;
    const previousRequests = requests;
    setSyncingRequestId(request.id);
    setRequests((current) => current.filter((item) => item.id !== request.id));
    const status = await store.acceptAccountantClientRequest(request);
    if (status === "synced") {
      setSelectedClientId(request.id);
      toast.success(`Cliente ${request.name} vinculado ao seu painel.`, { duration: 4000 });
      await refreshTaxObligations();
    } else {
      setRequests(previousRequests);
      toast.error("Não foi possível aceitar a solicitação. Verifique permissões ou tente novamente.", { duration: 5000 });
    }
    setSyncingRequestId(null);
  }

  async function rejectRequest(request: AccountantClientRequest) {
    if (syncingRequestId) return;
    const previousRequests = requests;
    setSyncingRequestId(request.id);
    setRequests((current) => current.filter((item) => item.id !== request.id));
    const status = await store.rejectAccountantClientRequest(request);
    if (status === "synced") {
      toast.success(`Solicitação de ${request.name} recusada.`, { duration: 4000 });
    } else {
      setRequests(previousRequests);
      toast.error("Não foi possível recusar a solicitação. Tente novamente em instantes.", { duration: 5000 });
    }
    setSyncingRequestId(null);
  }

  async function approveTaxGuide(obligationId: string, officialAmount: number, pixCode: string) {
    const previous = taxObligations;
    setTaxObligations((current) => current.map((item) => (
      item.id === obligationId
        ? { ...item, official_amount: officialAmount, pix_code: pixCode, status: "PUBLISHED_TO_DOCTOR" }
        : item
    )));
    setValidatingObligation(null);

    const { data, error } = await supabase
      .from("tax_obligations")
      .update({
        official_amount: officialAmount,
        pix_code: pixCode,
        status: "PUBLISHED_TO_DOCTOR",
        updated_at: new Date().toISOString(),
      })
      .eq("id", obligationId)
      .select("id,doctor_id,accountant_id,reference_month,system_estimated_amount,official_amount,status,pix_code,pdf_url,created_at,updated_at")
      .maybeSingle();

    if (error || !data) {
      logger.error("Painel Contábil: falha ao publicar guia fiscal.", error);
      setTaxObligations(previous);
      toast.error("Não foi possível publicar a guia. Tente novamente.", { duration: 5000 });
      return;
    }

    setTaxObligations((current) => current.map((item) => (item.id === obligationId ? normalizeTaxObligation(data) : item)));
    toast.success("Guia aprovada e enviada para o cliente.", { duration: 4000 });
  }

  function exportCsv() {
    logger.info("Painel Contábil: exportação CSV solicitada.");
    alert("Exportação CSV simulada para este painel contábil.");
  }

  function generateOfx() {
    logger.info("Painel Contábil: geração de OFX solicitada.");
    alert("Geração de OFX simulada para este painel contábil.");
  }

  return (
    <div className="w-full max-w-full space-y-5 overflow-x-hidden px-4 py-4 sm:px-5 sm:py-5">
      <header className="premium-card rounded-2xl p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              <Calculator className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Área do contador</p>
              <h1 className="mt-1 font-display text-2xl text-foreground">Painel Contábil</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Valide competências, confira a base tributável e publique guias para médicos vinculados em uma esteira maker-checker.
              </p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto] xl:min-w-[560px]">
            <ClientSelector
              clients={linkedClients}
              selectedClientId={selectedClientId}
              onSelect={setSelectedClientId}
              loading={clientLoading}
            />
            <CompetencePicker value={competenceDate} onChange={setCompetenceDate} />
          </div>
        </div>
      </header>

      <ClientRequestsPanel
        requests={requests}
        loading={requestsLoading}
        syncingRequestId={syncingRequestId}
        onRefresh={refreshRequests}
        onAccept={acceptRequest}
        onReject={rejectRequest}
      />

      <section className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Competência" value={selectedCompetence} detail="Filtro global do painel" />
        <SummaryCard label="Estimativa Total" value={brl2(totalEstimated)} detail={`${obligationRows.length} guia(s) no mês`} />
        <SummaryCard label="Pendentes" value={String(pendingCount)} detail={`${publishedCount} publicada(s) · ${paidCount} paga(s)`} tone={pendingCount > 0 ? "warning" : "success"} />
        <SummaryCard
          label="Status do Fator R"
          value={fatorR.hasRevenue ? `${fatorR.factorPercent.toFixed(1)}%` : "Sem base"}
          detail={fatorR.hasRevenue ? `Histórico ${brl2(fatorR.accumulatedRevenue)} · Folha ${brl2(fatorR.accumulatedProLabore)}` : "Sem faturamento PJ Simples na janela fiscal"}
          tone={fatorR.safe ? "success" : "warning"}
        />
      </section>

      <TaxObligationTable
        rows={obligationRows}
        loading={obligationsLoading}
        referenceMonth={selectedCompetence}
        onRefresh={() => refreshTaxObligations()}
        onValidate={setValidatingObligation}
      />

      <section className="premium-card rounded-2xl p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Plantões recebidos</p>
            <h2 className="mt-1 font-display text-xl text-foreground">Base de conferência contábil</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeClient
                ? `Cliente ativo: ${activeClient.name}. Apenas registros consolidados e recebidos aparecem nesta visão auxiliar.`
                : "Selecione ou aceite um cliente para carregar dados operacionais."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={exportCsv}
              disabled={!activeClient}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            >
              <Download className="h-4 w-4" />
              Exportar relatório CSV
            </button>
            <button
              type="button"
              onClick={generateOfx}
              disabled={!activeClient}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Gerar OFX
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <SummaryCard label="Recebido no período" value={brl2(monthlyReceived)} />
          <SummaryCard label="Glosas/Deduções" value={brl2(totalDeductions)} tone="warning" />
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-surface-elevated/80 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Hospital</th>
                <th className="px-4 py-3">Procedimento</th>
                <th className="px-4 py-3 text-right">Bruto</th>
                <th className="px-4 py-3 text-right">Deduções</th>
                <th className="px-4 py-3 text-right">Líquido</th>
                <th className="px-4 py-3">Recebimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {!activeClient ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum cliente selecionado.
                  </td>
                </tr>
              ) : paidShifts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum plantão recebido disponível para conferência.
                  </td>
                </tr>
              ) : (
                paidShifts.map((shift) => <ReadOnlyShiftRow key={shift.id} shift={shift} />)
              )}
            </tbody>
          </table>
        </div>
      </section>

      <TaxValidationModal
        row={validatingObligation}
        open={Boolean(validatingObligation)}
        onOpenChange={(open) => {
          if (!open) setValidatingObligation(null);
        }}
        onConfirm={approveTaxGuide}
      />
    </div>
  );
}

function TaxObligationTable({
  rows,
  loading,
  referenceMonth,
  onRefresh,
  onValidate,
}: {
  rows: ObligationRow[];
  loading: boolean;
  referenceMonth: string;
  onRefresh: () => Promise<void>;
  onValidate: (row: ObligationRow) => void;
}) {
  return (
    <section className="premium-card rounded-2xl p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <ReceiptText className="h-3.5 w-3.5" />
            Obrigações fiscais
          </p>
          <h2 className="mt-1 font-display text-xl text-foreground">Roster da competência {referenceMonth}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Base tributável calculada a partir dos plantões PJ com NF emitida na competência selecionada.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {loading ? "Atualizando..." : "Atualizar roster"}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="min-w-[920px] w-full text-left text-sm">
          <thead className="bg-surface-elevated/80 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3 text-right">Faturamento Tributável Base</th>
              <th className="px-4 py-3 text-right">Imposto Estimado</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Carregando obrigações fiscais...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhuma obrigação fiscal encontrada para {referenceMonth}.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const disabled = row.obligation.status === "PUBLISHED_TO_DOCTOR" || row.obligation.status === "PAID";
                return (
                  <tr key={row.obligation.id} className="text-foreground/85">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{row.client?.name ?? "Cliente não listado"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.client?.email ?? row.obligation.doctor_id}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{brl2(row.taxableBase)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-warning tabular-nums">{brl2(row.obligation.system_estimated_amount)}</td>
                    <td className="px-4 py-3"><TaxStatusBadge status={row.obligation.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onValidate(row)}
                        disabled={disabled}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {disabled ? "Enviada" : "Validar Guia"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TaxValidationModal({
  row,
  open,
  onOpenChange,
  onConfirm,
}: {
  row: ObligationRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (obligationId: string, officialAmount: number, pixCode: string) => Promise<void>;
}) {
  const [officialAmount, setOfficialAmount] = useState("");
  const [pixCode, setPixCode] = useState("");
  const [amountError, setAmountError] = useState(false);
  const [pixError, setPixError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!row || !open) return;
    setOfficialAmount(String(row.obligation.official_amount ?? row.obligation.system_estimated_amount));
    setPixCode(row.obligation.pix_code ?? "");
    setAmountError(false);
    setPixError(false);
    setSubmitting(false);
  }, [open, row]);

  if (!row) return <Dialog.Root open={false} onOpenChange={onOpenChange} />;

  async function submit() {
    const normalizedAmount = Number(officialAmount.replace(",", "."));
    const normalizedPix = pixCode.trim();
    setAmountError(false);
    setPixError(false);

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setAmountError(true);
      return;
    }

    if (!normalizedPix) {
      setPixError(true);
      return;
    }

    setSubmitting(true);
    await onConfirm(row.obligation.id, round2(normalizedAmount), normalizedPix);
    setSubmitting(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md" />
        <Dialog.Content className="premium-modal fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[calc(100vw-32px)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl p-0">
          <div className="flex items-start justify-between gap-4 border-b border-border bg-surface-elevated/70 px-5 py-4">
            <div>
              <Dialog.Title className="font-display text-xl text-foreground">
                Aprovação de Guia - {row.client?.name ?? "Cliente"} - {row.obligation.reference_month}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Confira a base calculada pelo DocFin, informe o valor oficial e publique o Pix para o cliente.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-xl border border-border p-2 text-muted-foreground transition hover:text-foreground" aria-label="Fechar">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="premium-panel rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Faturamento Base</p>
                <p className="mt-2 font-mono text-2xl font-semibold text-foreground tabular-nums">{brl2(row.taxableBase)}</p>
                <p className="mt-2 text-xs text-muted-foreground">Plantões PJ com NF emitida na competência.</p>
              </div>
              <div className="premium-panel rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Imposto Estimado pelo Sistema</p>
                <p className="mt-2 font-mono text-2xl font-semibold text-warning tabular-nums">{brl2(row.obligation.system_estimated_amount)}</p>
                <p className="mt-2 text-xs text-muted-foreground">Estimativa gerencial antes da validação oficial.</p>
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Valor oficial da guia</span>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={officialAmount}
                onChange={(event) => {
                  setOfficialAmount(event.target.value);
                  setAmountError(false);
                }}
                className={`${inputCls} text-right font-mono tabular-nums ${amountError ? "border-rose-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-400/20" : ""}`}
              />
              {amountError && <p className="text-xs text-destructive">Informe um valor oficial maior que zero.</p>}
            </label>

            <label className="block space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Pix Copia e Cola</span>
              <textarea
                value={pixCode}
                onChange={(event) => {
                  setPixCode(event.target.value);
                  setPixError(false);
                }}
                rows={4}
                className={`${inputCls} min-h-28 resize-y ${pixError ? "border-rose-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-400/20" : ""}`}
                placeholder="Cole aqui o código Pix da guia validada"
              />
              {pixError && <p className="text-xs text-destructive">O código Pix é obrigatório para enviar a guia ao cliente.</p>}
            </label>

            <div className="premium-panel rounded-2xl p-3 text-xs leading-relaxed text-muted-foreground">
              Ao aprovar, o status muda para publicado ao cliente e esta guia deixa a fila de validação pendente.
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
                Cancelar
              </Dialog.Close>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:bg-muted disabled:text-muted-foreground"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Aprovar e Enviar para o Cliente
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ClientRequestsPanel({
  requests,
  loading,
  syncingRequestId,
  onRefresh,
  onAccept,
  onReject,
}: {
  requests: AccountantClientRequest[];
  loading: boolean;
  syncingRequestId: string | null;
  onRefresh: () => Promise<void>;
  onAccept: (request: AccountantClientRequest) => Promise<void>;
  onReject: (request: AccountantClientRequest) => Promise<void>;
}) {
  return (
    <section className="premium-card rounded-2xl p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Inbox className="h-3.5 w-3.5" />
            Solicitações de Clientes
          </p>
          <h2 className="mt-1 font-display text-xl text-foreground">Convites aguardando decisão</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aceite apenas médicos do seu escritório. A visão liberada é somente leitura.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={loading}
          className="min-h-10 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {requests.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface/70 p-4 text-sm text-muted-foreground">
            Nenhuma solicitação pendente para o seu e-mail.
          </div>
        ) : (
          requests.map((request) => (
            <article key={request.id} className="rounded-2xl border border-border bg-surface/70 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{request.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{request.email || "E-mail não informado"}</p>
                  {request.specialtyName && <p className="mt-1 text-xs text-muted-foreground">{request.specialtyName}</p>}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void onAccept(request)}
                    disabled={Boolean(syncingRequestId)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                  >
                    <UserCheck className="h-4 w-4" />
                    {syncingRequestId === request.id ? "Aceitando..." : "Aceitar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onReject(request)}
                    disabled={Boolean(syncingRequestId)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-destructive/35 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" />
                    Recusar
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function CompetencePicker({ value, onChange }: { value: Date; onChange: (value: Date) => void }) {
  function move(delta: number) {
    onChange(new Date(value.getFullYear(), value.getMonth() + delta, 1));
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-2">
      <span className="mb-1 block px-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Competência global</span>
      <div className="flex min-h-11 items-center gap-2">
        <button
          type="button"
          onClick={() => move(-1)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          aria-label="Competência anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-display text-lg text-foreground">{MONTH_NAMES[value.getMonth()]} {value.getFullYear()}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{formatReferenceMonth(value)}</p>
        </div>
        <button
          type="button"
          onClick={() => move(1)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          aria-label="Próxima competência"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ClientSelector({
  clients,
  selectedClientId,
  onSelect,
  loading,
}: {
  clients: LinkedClient[];
  selectedClientId: string;
  onSelect: (clientId: string) => void;
  loading: boolean;
}) {
  return (
    <label className="w-full">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Cliente ativo para leitura auxiliar</span>
      <select
        value={selectedClientId}
        onChange={(event) => onSelect(event.target.value)}
        disabled={clients.length === 0 || loading}
        className="w-full min-h-11 rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {clients.length === 0 ? (
          <option value="">Nenhum cliente liberado</option>
        ) : (
          clients.map((client) => (
            <option key={client.id} value={client.id}>{client.name} ({client.email})</option>
          ))
        )}
      </select>
      {loading && <p className="mt-2 text-xs text-muted-foreground">Carregando dados do cliente...</p>}
    </label>
  );
}

function SummaryCard({ label, value, detail, tone = "primary" }: { label: string; value: string; detail?: string; tone?: "primary" | "success" | "warning" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="premium-card rounded-2xl p-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-3 font-display text-2xl tabular-nums ${toneClass}`}>{value}</p>
      {detail && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>}
    </div>
  );
}

function TaxStatusBadge({ status }: { status: TaxObligationStatus }) {
  const normalized = normalizeStatus(status);
  const className = normalized.tone === "success"
    ? "border-success/35 bg-success/10 text-success"
    : normalized.tone === "warning"
      ? "border-warning/35 bg-warning/10 text-warning"
      : normalized.tone === "danger"
        ? "border-destructive/35 bg-destructive/10 text-destructive"
        : "border-border bg-surface text-muted-foreground";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${className}`}>
      {normalized.label}
    </span>
  );
}

function ReadOnlyShiftRow({ shift }: { shift: Shift }) {
  const store = useStore();
  const workplace = store.workplaces.find((item) => item.id === shift.workplaceId);
  const math = computeShift(store, shift);
  const deductions = calculateTotalDeductions(shift);

  return (
    <tr className="text-foreground/85">
      <td className="px-4 py-3 font-mono text-xs">{fmtDate(new Date(`${shift.date}T12:00:00`))}</td>
      <td className="px-4 py-3 font-medium text-foreground">{workplace?.name ?? "Hospital não cadastrado"}</td>
      <td className="px-4 py-3 text-muted-foreground">{shift.procedure || "Plantão"}</td>
      <td className="px-4 py-3 text-right font-mono tabular-nums">{brl2(shift.gross)}</td>
      <td className="px-4 py-3 text-right font-mono text-warning tabular-nums">{brl2(deductions)}</td>
      <td className="px-4 py-3 text-right font-mono text-success tabular-nums">{brl2(math.net)}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {shift.actualPaymentDate ? fmtDate(new Date(`${shift.actualPaymentDate}T12:00:00`)) : "Recebido"}
      </td>
    </tr>
  );
}

function normalizeTaxObligation(row: Record<string, unknown>): TaxObligation {
  return {
    id: String(row.id),
    doctor_id: String(row.doctor_id),
    accountant_id: String(row.accountant_id),
    reference_month: String(row.reference_month),
    system_estimated_amount: Number(row.system_estimated_amount ?? 0),
    official_amount: row.official_amount == null ? null : Number(row.official_amount),
    status: String(row.status ?? "PENDING_VALIDATION"),
    pix_code: row.pix_code == null ? null : String(row.pix_code),
    pdf_url: row.pdf_url == null ? null : String(row.pdf_url),
    created_at: row.created_at == null ? undefined : String(row.created_at),
    updated_at: row.updated_at == null ? undefined : String(row.updated_at),
  };
}

function normalizeStatus(status: TaxObligationStatus) {
  switch (status) {
    case "PENDING_VALIDATION":
      return { label: "Pendente", tone: "warning" as const };
    case "PUBLISHED_TO_DOCTOR":
      return { label: "Publicada", tone: "primary" as const };
    case "PAID":
      return { label: "Paga", tone: "success" as const };
    case "VALIDATED":
      return { label: "Validada", tone: "primary" as const };
    case "CANCELLED":
      return { label: "Cancelada", tone: "danger" as const };
    default:
      return { label: status.replaceAll("_", " ").toLowerCase(), tone: "primary" as const };
  }
}

function formatReferenceMonth(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function isInReferenceMonth(date: string, referenceMonth: string) {
  const [month, year] = referenceMonth.split("/").map(Number);
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.getFullYear() === year && parsed.getMonth() + 1 === month;
}

function estimateTaxableBaseFromTax(systemEstimatedAmount: number) {
  return round2((systemEstimatedAmount || 0) / 0.06);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
