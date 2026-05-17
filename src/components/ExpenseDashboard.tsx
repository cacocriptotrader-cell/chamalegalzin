import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AlertTriangle, FileSpreadsheet, Trash2, UploadCloud, X } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import { brl2, useStore, type ExpenseCategory } from "@/lib/store";
import { parseExpenseFile, type ParsedExpenseDraft } from "@/lib/expenseImportParser";

type PeriodFilter = "MONTH" | "QUARTER" | "SEMESTER" | "YEAR";

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Transporte",
  "Saúde",
  "CRM/Sociedades",
  "Alimentação",
  "Educação",
  "Moradia",
  "Viagens",
  "Impostos/Taxas",
  "Outros",
];

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  MONTH: "Mensal",
  QUARTER: "Trimestral",
  SEMESTER: "Semestral",
  YEAR: "Anual",
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  "Transporte": "#deff9a",
  "Saúde": "#93c5fd",
  "CRM/Sociedades": "#facc15",
  "Alimentação": "#fb923c",
  "Educação": "#c4b5fd",
  "Moradia": "#67e8f9",
  "Viagens": "#f0abfc",
  "Impostos/Taxas": "#fda4af",
  "Outros": "#94a3b8",
};

export function ExpenseDashboard() {
  const store = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [period, setPeriod] = useState<PeriodFilter>("MONTH");
  const [dragOver, setDragOver] = useState(false);
  const [drafts, setDrafts] = useState<ParsedExpenseDraft[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredExpenses = useMemo(() => {
    const start = periodStart(new Date(), period);
    return store.expenses
      .filter((expense) => new Date(`${expense.date}T12:00:00`) >= start)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [store.expenses, period]);

  const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const chartData = EXPENSE_CATEGORIES
    .map((category) => ({
      name: category,
      value: filteredExpenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }))
    .filter((item) => item.value > 0);

  async function processFile(file: File | null | undefined) {
    if (!file) return;
    setError(null);
    setLoading(true);
    setFileName(file.name);
    try {
      const parsed = await parseExpenseFile(file);
      if (parsed.length === 0) {
        setDrafts([]);
        setError("Não encontramos Data, Descrição e Valor neste arquivo. Verifique se é CSV ou OFX bancário exportado.");
        return;
      }
      setDrafts(parsed);
    } catch (err) {
      console.error("[Despesas] Falha ao importar arquivo", err);
      setError("Não foi possível ler o arquivo. Envie um CSV ou OFX válido.");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(index: number, patch: Partial<ParsedExpenseDraft>) {
    setDrafts((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function confirmImport() {
    store.addExpenses(drafts);
    setDrafts([]);
    setFileName(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function cancelImport() {
    setDrafts([]);
    setFileName(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    processFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    processFile(event.dataTransfer.files?.[0]);
  }

  return (
    <section className="px-5 space-y-4">
      <div className="glass-card rounded-3xl border border-border/60 p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Despesas importadas</p>
            <h2 className="font-display text-xl mt-1">Análise de consumo</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Importe CSV ou OFX do banco para auditar despesas reais, sem OCR e sem digitação manual.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-surface-elevated/40 p-1">
            {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`rounded-lg px-2 py-2 text-[11px] font-semibold transition ${
                  period === key ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground border border-transparent hover:text-foreground"
                }`}
              >
                {PERIOD_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-5 mt-5">
          <div className="lg:col-span-2">
            <div
              onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`rounded-2xl border border-dashed p-5 min-h-[220px] flex flex-col items-center justify-center text-center transition ${
                dragOver ? "border-primary bg-primary/10" : "border-border bg-surface-elevated/40"
              }`}
            >
              <div className="h-12 w-12 rounded-2xl border border-primary/20 bg-primary/10 flex items-center justify-center text-primary">
                {loading ? <FileSpreadsheet className="h-5 w-5 animate-pulse" /> : <UploadCloud className="h-5 w-5" />}
              </div>
              <h3 className="font-display text-lg mt-4">Importar CSV ou OFX</h3>
              <p className="text-xs text-muted-foreground mt-2 max-w-xs">
                Arraste o arquivo exportado do banco ou selecione manualmente. Nada é salvo antes da revisão.
              </p>
              <input ref={fileInputRef} type="file" accept=".csv,.ofx,text/csv,application/x-ofx" onChange={onFileChange} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
              >
                Selecionar arquivo
              </button>
              {fileName && <p className="text-[11px] text-muted-foreground mt-3 truncate max-w-xs">{fileName}</p>}
              {error && (
                <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 rounded-2xl border border-border bg-surface-elevated/40 p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Total do período</p>
                <p className="font-display text-4xl text-primary mt-1 tabular-nums">{brl2(total)}</p>
              </div>
              <p className="text-xs text-muted-foreground">{filteredExpenses.length} lançamento(s)</p>
            </div>
            <div className="h-64 mt-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2} stroke="none">
                      {chartData.map((item) => <Cell key={item.name} fill={CATEGORY_COLORS[item.name as ExpenseCategory]} />)}
                    </Pie>
                    <RTooltip
                      contentStyle={{
                        background: "rgba(38,38,38,0.96)",
                        border: "1px solid rgba(218,255,222,0.14)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={((value: any) => brl2(Number(value))) as any}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                  Nenhuma despesa no período selecionado.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {drafts.length > 0 && (
        <div className="glass-card rounded-3xl border border-primary/20 p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary">Revisão antes de salvar</p>
              <h3 className="font-display text-xl mt-1">{drafts.length} despesa(s) encontradas</h3>
              <p className="text-sm text-muted-foreground mt-1">Confira data, descrição, valor e categoria antes de consolidar.</p>
            </div>
            <button type="button" onClick={cancelImport} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm">
              <X className="h-4 w-4" />
              Cancelar
            </button>
          </div>

          <div className="space-y-2">
            {drafts.map((draft, index) => (
              <div key={`${draft.date}-${draft.description}-${index}`} className="grid gap-2 rounded-2xl border border-border bg-surface-elevated/50 p-3 md:grid-cols-[140px_1fr_140px_180px]">
                <input type="date" value={draft.date} onChange={(event) => updateDraft(index, { date: event.target.value })} className={inputCls} />
                <input type="text" value={draft.description} onChange={(event) => updateDraft(index, { description: event.target.value })} className={inputCls} />
                <input type="number" min={0} value={draft.amount || ""} onChange={(event) => updateDraft(index, { amount: Math.abs(+event.target.value || 0) })} className={`${inputCls} text-right tabular-nums`} />
                <select value={draft.category} onChange={(event) => updateDraft(index, { category: event.target.value as ExpenseCategory })} className={inputCls}>
                  {EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Total a importar: <span className="font-mono text-primary">{brl2(drafts.reduce((sum, draft) => sum + draft.amount, 0))}</span>
            </p>
            <button type="button" onClick={confirmImport} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition">
              Confirmar Importação
            </button>
          </div>
        </div>
      )}

      <div className="glass-card rounded-3xl border border-border/60 p-5 md:p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Lançamentos</p>
            <h3 className="font-display text-xl mt-1">Despesas do período</h3>
          </div>
        </div>
        <div className="space-y-2">
          {filteredExpenses.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Nenhuma despesa importada ainda.</p>
          ) : (
            filteredExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated/40 p-3">
                <div className="h-9 w-1.5 rounded-full" style={{ background: CATEGORY_COLORS[expense.category] }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{expense.description}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDate(expense.date)} · {expense.category} · {expense.sourceType}</p>
                </div>
                <p className="font-mono text-sm text-primary tabular-nums">{brl2(expense.amount)}</p>
                <button type="button" onClick={() => store.removeExpense(expense.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function periodStart(now: Date, period: PeriodFilter) {
  const months = period === "MONTH" ? 1 : period === "QUARTER" ? 3 : period === "SEMESTER" ? 6 : 12;
  return new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
}

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");
}

const inputCls = "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
