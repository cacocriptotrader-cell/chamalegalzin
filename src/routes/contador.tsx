import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  brl2,
  calculateTotalDeductions,
  computeShift,
  fmtDate,
  getRollingFatorRSnapshot,
  isConsolidatedRecord,
  useStore,
  type Shift,
} from "@/lib/store";
import { Calculator, Download, FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/contador")({
  head: () => ({
    meta: [
      { title: "Painel Contábil — Docfin" },
      { name: "description", content: "Visão temporária do contador para clientes médicos vinculados." },
    ],
  }),
  component: ContadorPage,
});

const clientesMockados = [
  { id: "thais-ruiz", label: "Dra. Thais Ruiz (thais@docfin.demo)" },
  { id: "felipe", label: "Dr. Felipe (felipe@docfin.demo)" },
];

function ContadorPage() {
  const store = useStore();
  const [selectedClientId, setSelectedClientId] = useState(clientesMockados[0].id);
  const now = new Date();
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

  function exportCsv() {
    console.log("Painel Contábil: exportação CSV solicitada.");
    alert("Exportação CSV simulada para este painel contábil.");
  }

  function generateOfx() {
    console.log("Painel Contábil: geração de OFX solicitada.");
    alert("Geração de OFX simulada para este painel contábil.");
  }

  return (
    <div className="px-5 py-5 space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Área do contador</p>
              <h1 className="font-display text-2xl mt-1 text-slate-900">Painel Contábil (Visão do Contador)</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                Visão somente leitura dos plantões recebidos, deduções e indicadores fiscais do cliente selecionado.
              </p>
            </div>
          </div>
          <label className="w-full max-w-md">
            <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-slate-500">Cliente vinculado</span>
            <select
              value={selectedClientId}
              onChange={(event) => setSelectedClientId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            >
              {clientesMockados.map((client) => (
                <option key={client.id} value={client.id}>{client.label}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Faturamento Recebido (Mês Atual)" value={brl2(monthlyReceived)} />
        <SummaryCard label="Total de Glosas/Deduções" value={brl2(totalDeductions)} tone="warning" />
        <SummaryCard
          label="Status do Fator R"
          value={fatorR.hasRevenue ? `${fatorR.factorPercent.toFixed(1)}%` : "Sem RBT12"}
          detail={fatorR.hasRevenue ? `RBT12 ${brl2(fatorR.accumulatedRevenue)} · FS12 ${brl2(fatorR.accumulatedProLabore)}` : "Sem faturamento PJ Simples na janela fiscal"}
          tone={fatorR.safe ? "success" : "warning"}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Plantões recebidos</p>
            <h2 className="font-display text-xl mt-1 text-slate-900">Base de conferência contábil</h2>
            <p className="mt-1 text-sm text-slate-500">
              Apenas registros consolidados e recebidos aparecem nesta visão. Rascunhos e pendências ficam fora da base do contador.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Exportar relatório CSV
            </button>
            <button
              type="button"
              onClick={generateOfx}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-sky-300 hover:text-slate-900"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Gerar OFX
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.16em] text-slate-500">
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
            <tbody className="divide-y divide-slate-200 bg-white">
              {paidShifts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
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

function SummaryCard({ label, value, detail, tone = "primary" }: { label: string; value: string; detail?: string; tone?: "primary" | "success" | "warning" }) {
  const toneClass = tone === "success" ? "text-teal-600" : tone === "warning" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-3 font-display text-2xl tabular-nums ${toneClass}`}>{value}</p>
      {detail && <p className="mt-2 text-xs leading-relaxed text-slate-500">{detail}</p>}
    </div>
  );
}

function ReadOnlyShiftRow({ shift }: { shift: Shift }) {
  const store = useStore();
  const workplace = store.workplaces.find((item) => item.id === shift.workplaceId);
  const math = computeShift(store, shift);
  const deductions = calculateTotalDeductions(shift);

  return (
    <tr className="text-slate-700">
      <td className="px-4 py-3 font-mono text-xs">{fmtDate(new Date(`${shift.date}T12:00:00`))}</td>
      <td className="px-4 py-3 font-medium text-slate-900">{workplace?.name ?? "Hospital não cadastrado"}</td>
      <td className="px-4 py-3 text-slate-500">{shift.procedure || "Plantão"}</td>
      <td className="px-4 py-3 text-right font-mono tabular-nums">{brl2(shift.gross)}</td>
      <td className="px-4 py-3 text-right font-mono text-amber-600 tabular-nums">{brl2(deductions)}</td>
      <td className="px-4 py-3 text-right font-mono text-teal-600 tabular-nums">{brl2(math.net)}</td>
      <td className="px-4 py-3 text-slate-500">
        {shift.actualPaymentDate ? fmtDate(new Date(`${shift.actualPaymentDate}T12:00:00`)) : "Recebido"}
      </td>
    </tr>
  );
}

function isCurrentMonth(date: string, now: Date): boolean {
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.getFullYear() === now.getFullYear() && parsed.getMonth() === now.getMonth();
}
