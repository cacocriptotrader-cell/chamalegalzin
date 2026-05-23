import { createFileRoute, Link } from "@tanstack/react-router";
import { memo, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CheckCircle2, Keyboard, Plus, Save, Trash2 } from "lucide-react";
import { brl2, useStore, type ShiftTransportMode } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/lancar-plantoes")({
  head: () => ({
    meta: [
      { title: "Lançar Plantões — Docfin" },
      { name: "description", content: "Mesa de lançamentos em massa para registrar plantões como rascunhos." },
    ],
  }),
  component: ShiftStudioPage,
});

type StudioRow = {
  id: string;
  date: string;
  workplaceId: string;
  workplaceName: string;
  hours: number;
  transportMode: ShiftTransportMode;
  privateTransportCost: number;
  gross: number;
  grossTouched: boolean;
};

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const rowId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
};

function createEmptyRow(workplaceId = "", workplaceName = ""): StudioRow {
  return {
    id: rowId(),
    date: todayIso(),
    workplaceId,
    workplaceName,
    hours: 12,
    transportMode: "PRIVATE_TRANSPORT",
    privateTransportCost: 0,
    gross: 0,
    grossTouched: false,
  };
}

export function ShiftStudioPage() {
  const store = useStore();
  const firstCellRefs = useRef(new Map<string, HTMLInputElement>());
  const defaultWorkplace = store.workplaces[0];
  const defaultWorkplaceId = defaultWorkplace?.id ?? "";
  const defaultWorkplaceName = defaultWorkplace?.name ?? "";
  const [rows, setRows] = useState<StudioRow[]>(() => [createEmptyRow(defaultWorkplaceId, defaultWorkplaceName)]);
  const [saving, setSaving] = useState(false);

  const validRows = useMemo(
    () => rows.filter((row) => row.date && row.workplaceName.trim() && row.hours > 0 && getRowGross(row, store.workplaces) > 0),
    [rows, store.workplaces],
  );
  const estimatedGross = validRows.reduce((sum, row) => sum + getRowGross(row, store.workplaces), 0);
  const estimatedTransport = validRows.reduce((sum, row) => sum + (row.transportMode === "PRIVATE_TRANSPORT" ? row.privateTransportCost || 0 : 0), 0);

  function focusRow(id: string) {
    window.requestAnimationFrame(() => firstCellRefs.current.get(id)?.focus());
  }

  function addRow() {
    const next = createEmptyRow(defaultWorkplaceId, defaultWorkplaceName);
    setRows((current) => [...current, next]);
    focusRow(next.id);
  }

  function duplicateRow(source: StudioRow) {
    const next = { ...source, id: rowId(), grossTouched: source.grossTouched };
    setRows((current) => [...current, next]);
    focusRow(next.id);
  }

  function updateRow(id: string, patch: Partial<StudioRow>) {
    setRows((current) => current.map((row) => {
      if (row.id !== id) return row;
      const next = { ...row, ...patch };
      if (patch.workplaceName !== undefined) {
        const existing = findWorkplaceByName(patch.workplaceName, store.workplaces);
        next.workplaceId = existing?.id ?? "";
      }
      if ((patch.workplaceId || patch.workplaceName !== undefined || patch.hours !== undefined) && !row.grossTouched && !patch.grossTouched) {
        next.gross = getSuggestedGross(next.workplaceId, next.workplaceName, next.hours, store.workplaces);
      }
      return next;
    }));
  }

  function removeRow(id: string) {
    setRows((current) => current.length === 1 ? [createEmptyRow(defaultWorkplaceId, defaultWorkplaceName)] : current.filter((row) => row.id !== id));
  }

  async function saveValidRows() {
    if (saving) return;
    if (validRows.length === 0) {
      toast.warning("Preencha ao menos um plantão válido antes de salvar.");
      return;
    }

    setSaving(true);
    const validIds = new Set(validRows.map((row) => row.id));
    const quickWorkplaces = new Map<string, string>();
    const statuses = await Promise.all(validRows.map((row) => store.addShift({
      recordStatus: "draft",
      paymentStatus: "PENDING",
      date: row.date,
      workplaceId: resolveWorkplaceId(row, store, quickWorkplaces),
      originId: "home",
      hours: row.hours,
      gross: getRowGross(row, store.workplaces),
      extraCost: 0,
      transportMode: row.transportMode,
      privateTransportCost: row.transportMode === "PRIVATE_TRANSPORT" ? row.privateTransportCost || 0 : 0,
    })));

    setRows((current) => {
      const remaining = current.filter((row) => !validIds.has(row.id));
      return remaining.length > 0 ? remaining : [createEmptyRow(defaultWorkplaceId, defaultWorkplaceName)];
    });
    setSaving(false);

    const synced = statuses.filter((status) => status === "synced").length;
    if (synced === statuses.length) {
      toast.success(`${validRows.length} rascunho${validRows.length === 1 ? "" : "s"} salvo${validRows.length === 1 ? "" : "s"} no Inbox.`);
    } else {
      toast.warning(`${validRows.length} rascunho${validRows.length === 1 ? "" : "s"} salvo${validRows.length === 1 ? "" : "s"} localmente. Sincronização pendente.`);
    }
  }

  return (
    <div
      className="space-y-5 px-0 py-5 md:py-7"
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          void saveValidRows();
        }
      }}
    >
      <header className="premium-card rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Mesa de lançamentos</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Lançar plantões em massa</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Registre vários plantões como rascunhos. Nada entra no Fator R, no Caixa ou no Dossiê Fiscal até a consolidação no Inbox.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              to="/empresa"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
            >
              Completar cadastro fiscal
            </Link>
            <button
              type="button"
              onClick={() => void saveValidRows()}
              disabled={saving || validRows.length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_28px_rgba(15,118,110,0.18)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar rascunhos no Inbox"}
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="premium-card overflow-hidden rounded-2xl">
          <div className="flex flex-col gap-3 border-b border-border bg-surface-elevated/70 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Keyboard className="h-4 w-4 text-primary" />
              Tab navega pelas células. Enter cria nova linha. Cmd/Ctrl + Enter salva.
            </div>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15"
            >
              <Plus className="h-4 w-4" />
              Nova linha
            </button>
          </div>

          <div className="overflow-x-auto">
              <table className="min-w-[920px] w-full text-left text-sm">
                <thead className="border-b border-border bg-surface/80 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3">Data</th>
                    <th className="px-3 py-3">Hospital</th>
                    <th className="px-3 py-3">Duração</th>
                    <th className="px-3 py-3">Transporte</th>
                    <th className="px-3 py-3 text-right">Valor Bruto</th>
                    <th className="px-3 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <ShiftStudioRow
                      key={row.id}
                      row={row}
                      workplaces={store.workplaces}
                      setFirstCellRef={(node) => {
                        if (node) firstCellRefs.current.set(row.id, node);
                        else firstCellRefs.current.delete(row.id);
                      }}
                      onChange={(patch) => updateRow(row.id, patch)}
                      onEnter={addRow}
                      onDuplicate={() => duplicateRow(row)}
                      onRemove={() => removeRow(row.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
        </div>

        <aside className="premium-card h-fit rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Prévia do lote</p>
          <div className="mt-5 space-y-3">
            <PreviewMetric label="Linhas válidas" value={`${validRows.length}/${rows.length}`} />
            <PreviewMetric label="Bruto estimado" value={brl2(estimatedGross)} accent />
            <PreviewMetric label="Transporte privado" value={brl2(estimatedTransport)} />
          </div>
          <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Digite um hospital novo direto na grade. Ele será criado como cadastro provisório e os plantões vão para o Inbox.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

const ShiftStudioRow = memo(function ShiftStudioRow({
  row,
  workplaces,
  setFirstCellRef,
  onChange,
  onEnter,
  onDuplicate,
  onRemove,
}: {
  row: StudioRow;
  workplaces: Array<{ id: string; name: string; hourlyRate: number }>;
  setFirstCellRef: (node: HTMLInputElement | null) => void;
  onChange: (patch: Partial<StudioRow>) => void;
  onEnter: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const gross = getRowGross(row, workplaces);

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      onEnter();
    }
  }

  return (
    <tr className="transition hover:bg-primary/[0.035]" onKeyDown={handleKeyDown}>
      <td className="px-3 py-3">
        <input
          ref={setFirstCellRef}
          type="date"
          value={row.date}
          onChange={(event) => onChange({ date: event.target.value })}
          className={cellInputCls}
        />
      </td>
      <td className="px-3 py-3">
        <input
          value={row.workplaceName}
          onChange={(event) => onChange({ workplaceName: event.target.value })}
          list="shift-studio-hospitals"
          placeholder="Digite ou selecione"
          className={cellInputCls}
        />
        <datalist id="shift-studio-hospitals">
          {workplaces.map((workplace) => (
            <option key={workplace.id} value={workplace.name} />
          ))}
        </datalist>
        {row.workplaceName.trim() && !findWorkplaceByName(row.workplaceName, workplaces) && (
          <p className="mt-1 text-[11px] text-primary">Será criado como hospital provisório.</p>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={row.hours || ""}
            onChange={(event) => onChange({ hours: +event.target.value || 0 })}
            className={`${cellInputCls} w-20`}
          />
          <div className="flex gap-1">
            {[6, 12, 24].map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={() => onChange({ hours })}
                className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                  row.hours === hours ? "border-primary/45 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {hours}h
              </button>
            ))}
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="grid gap-2">
          <select value={row.transportMode} onChange={(event) => onChange({ transportMode: event.target.value as ShiftTransportMode })} className={cellInputCls}>
            <option value="PRIVATE_TRANSPORT">Transporte privado</option>
            <option value="PERSONAL_VEHICLE">Veículo pessoal</option>
          </select>
          {row.transportMode === "PRIVATE_TRANSPORT" && (
            <input
              type="number"
              min={0}
              value={row.privateTransportCost || ""}
              onChange={(event) => onChange({ privateTransportCost: +event.target.value || 0 })}
              placeholder="Uber ida/volta"
              className={`${cellInputCls} text-right`}
            />
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <input
          type="number"
          min={0}
          value={gross || ""}
          onChange={(event) => onChange({ gross: +event.target.value || 0, grossTouched: true })}
          className={`${cellInputCls} text-right font-mono tabular-nums`}
        />
      </td>
      <td className="px-3 py-3">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onDuplicate} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary">
            Duplicar
          </button>
          <button type="button" onClick={onRemove} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-destructive/40 hover:text-destructive" aria-label="Remover linha">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

function PreviewMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-elevated/55 p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={`mt-2 font-mono text-xl font-semibold tabular-nums ${accent ? "text-success" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function getSuggestedGross(workplaceId: string, workplaceName: string, hours: number, workplaces: Array<{ id: string; name: string; hourlyRate: number }>): number {
  const workplace = workplaces.find((item) => item.id === workplaceId) ?? findWorkplaceByName(workplaceName, workplaces);
  return Math.max(0, (workplace?.hourlyRate ?? 0) * (hours || 0));
}

function getRowGross(row: StudioRow, workplaces: Array<{ id: string; name: string; hourlyRate: number }>): number {
  return row.grossTouched ? row.gross : getSuggestedGross(row.workplaceId, row.workplaceName, row.hours, workplaces);
}

const cellInputCls = "w-full min-h-11 rounded-xl border border-border bg-card px-3 py-2.5 text-base text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25";

function findWorkplaceByName(name: string, workplaces: Array<{ id: string; name: string }>) {
  const normalizedName = name.trim().toLowerCase();
  if (!normalizedName) return undefined;
  return workplaces.find((workplace) => workplace.name.trim().toLowerCase() === normalizedName);
}

function resolveWorkplaceId(row: StudioRow, store: ReturnType<typeof useStore>, quickWorkplaces: Map<string, string>): string {
  const existing = store.workplaces.find((workplace) => workplace.id === row.workplaceId) ?? findWorkplaceByName(row.workplaceName, store.workplaces);
  if (existing) return existing.id;

  const normalizedName = row.workplaceName.trim().toLowerCase();
  const alreadyCreatedId = quickWorkplaces.get(normalizedName);
  if (alreadyCreatedId) return alreadyCreatedId;

  const quickWorkplace = store.addWorkplace(createQuickHospital(row.workplaceName.trim()));
  quickWorkplaces.set(normalizedName, quickWorkplace.id);
  return quickWorkplace.id;
}

function createQuickHospital(name: string) {
  return {
    name,
    address: "",
    lat: 0,
    lng: 0,
    regime: "PJ_SIMPLES" as const,
    hourlyRate: 0,
    paymentRule: "",
    cutOffDay: 20,
    paymentDay: 5,
    paymentTermDays: 30,
  };
}
