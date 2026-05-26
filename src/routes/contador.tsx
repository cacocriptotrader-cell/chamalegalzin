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
import { Calculator, Download, FileSpreadsheet, Inbox, ReceiptText, UserCheck, XCircle } from "lucide-react";
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

type TaxObligationStatus = "PENDING_VALIDATION" | "VALIDATED" | "PAID" | "CANCELLED" | string;

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

function ContadorPage() {
  const store = useStore();
  const linkedClients = store.userProfile.linkedClients ?? [];
  const [selectedClientId, setSelectedClientId] = useState(store.userProfile.activeClientShiftId ?? linkedClients[0]?.id ?? "");
  const [requests, setRequests] = useState<AccountantClientRequest[]>([]);
  const [taxObligations, setTaxObligations] = useState<TaxObligation[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [obligationsLoading, setObligationsLoading] = useState(false);
  const [syncingRequestId, setSyncingRequestId] = useState<string | null>(null);
  const [clientLoading, setClientLoading] = useState(false);
  const activeClient = linkedClients.find((client) => client.id === selectedClientId);
  const now = new Date();

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
    if (!selectedClientId) {
      setTaxObligations([]);
      return;
    }
    void refreshTaxObligations(selectedClientId);
  }, [selectedClientId]);

  const paidShifts = useMemo(
    () => store.shifts.filter((shift) => isConsolidatedRecord(shift) && shift.paymentStatus === "PAID"),
    [store.shifts],
  );
  const currentMonthPaidShifts = useMemo(
    () => paidShifts.filter((shift) => isCurrentMonth(shift.date, now)),
    [paidShifts, now],
  );
  const monthlyReceived = currentMonthPaidShifts.reduce((sum, shift) => sum + shift.gross, 0);
  const totalDeductions = currentMonthPaidShifts.reduce((sum, shift) => sum + calculateTotalDeductions(shift), 0);
  const fatorR = getRollingFatorRSnapshot(store, now.getFullYear(), now.getMonth() + 1);

  async function refreshRequests() {
    setRequestsLoading(true);
    const nextRequests = await store.fetchAccountantClientRequests();
    setRequests(nextRequests);
    setRequestsLoading(false);
  }

  async function refreshTaxObligations(clientId = selectedClientId) {
    if (!clientId) {
      setTaxObligations([]);
      return;
    }
    setObligationsLoading(true);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user?.id) {
      logger.warn("Painel Contábil: contador sem sessão para carregar obrigações.", authError);
      setTaxObligations([]);
      setObligationsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("tax_obligations")
      .select("id,doctor_id,accountant_id,reference_month,system_estimated_amount,official_amount,status,pix_code,pdf_url,created_at,updated_at")
      .eq("doctor_id", clientId)
      .eq("accountant_id", authData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Painel Contábil: falha ao carregar obrigações fiscais.", error);
      toast.error("Não foi possível carregar obrigações fiscais do cliente.", { duration: 5000 });
      setTaxObligations([]);
    } else {
      setTaxObligations((data ?? []).map((item) => ({
        ...item,
        system_estimated_amount: Number(item.system_estimated_amount ?? 0),
        official_amount: item.official_amount == null ? null : Number(item.official_amount),
      })));
    }
    setObligationsLoading(false);
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

  function exportCsv() {
    logger.info("Painel Contábil: exportação CSV solicitada.");
    alert("Exportação CSV simulada para este painel contábil.");
  }

  function generateOfx() {
    logger.info("Painel Contábil: geração de OFX solicitada.");
    alert("Geração de OFX simulada para este painel contábil.");
  }

  return (
    <div className="space-y-5 px-5 py-5">
      <header className="premium-card rounded-2xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Área do contador</p>
              <h1 className="mt-1 font-display text-2xl text-foreground">Painel Contábil (Visão do Contador)</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Acesse apenas clientes que liberaram permissão e consulte dados consolidados em modo somente leitura.
              </p>
            </div>
          </div>
          <ClientSelector
            clients={linkedClients}
            selectedClientId={selectedClientId}
            onSelect={setSelectedClientId}
            loading={clientLoading}
          />
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

      <TaxObligationsPanel
        activeClient={activeClient}
        obligations={taxObligations}
        loading={obligationsLoading}
        onRefresh={() => refreshTaxObligations()}
      />

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Faturamento Recebido (Mês Atual)" value={brl2(monthlyReceived)} />
        <SummaryCard label="Total de Glosas/Deduções" value={brl2(totalDeductions)} tone="warning" />
        <SummaryCard
          label="Status do Fator R"
          value={fatorR.hasRevenue ? `${fatorR.factorPercent.toFixed(1)}%` : "Sem base"}
          detail={fatorR.hasRevenue ? `Histórico ${brl2(fatorR.accumulatedRevenue)} · Folha ${brl2(fatorR.accumulatedProLabore)}` : "Sem faturamento PJ Simples na janela fiscal"}
          tone={fatorR.safe ? "success" : "warning"}
        />
      </section>

      <section className="premium-card rounded-2xl p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Plantões recebidos</p>
            <h2 className="mt-1 font-display text-xl text-foreground">Base de conferência contábil</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeClient
                ? `Cliente ativo: ${activeClient.name}. Apenas registros consolidados e recebidos aparecem nesta visão.`
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
    </div>
  );
}

function TaxObligationsPanel({
  activeClient,
  obligations,
  loading,
  onRefresh,
}: {
  activeClient?: LinkedClient;
  obligations: TaxObligation[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}) {
  const pending = obligations.filter((item) => item.status === "PENDING_VALIDATION");
  return (
    <section className="premium-card rounded-2xl p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <ReceiptText className="h-3.5 w-3.5" />
            Obrigações fiscais
          </p>
          <h2 className="mt-1 font-display text-xl text-foreground">Validações pendentes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeClient
              ? `Estimativas gerenciais aguardando conferência para ${activeClient.name}.`
              : "Selecione um cliente para visualizar pendências fiscais."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={loading || !activeClient}
          className="min-h-10 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Atualizando..." : "Atualizar obrigações"}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {!activeClient ? (
          <div className="rounded-2xl border border-border bg-surface/70 p-4 text-sm text-muted-foreground">
            Nenhum cliente selecionado.
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-border bg-surface/70 p-4 text-sm text-muted-foreground">
            Carregando obrigações fiscais...
          </div>
        ) : pending.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface/70 p-4 text-sm text-muted-foreground">
            Nenhuma obrigação pendente de validação para este cliente.
          </div>
        ) : (
          pending.map((obligation) => (
            <article key={obligation.id} className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">Competência {obligation.reference_month}</h3>
                    <span className="rounded-full border border-warning/35 bg-warning/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-warning">
                      Validação pendente
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Estimativa DocFin aguardando conferência oficial do contador.
                  </p>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Imposto estimado</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-warning tabular-nums">
                    {brl2(obligation.system_estimated_amount)}
                  </p>
                  {obligation.official_amount != null && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Oficial: {brl2(obligation.official_amount)}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
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
    <label className="w-full max-w-md">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Cliente vinculado</span>
      <select
        value={selectedClientId}
        onChange={(event) => onSelect(event.target.value)}
        disabled={clients.length === 0 || loading}
        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
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

function isCurrentMonth(date: string, now: Date): boolean {
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.getFullYear() === now.getFullYear() && parsed.getMonth() === now.getMonth();
}
