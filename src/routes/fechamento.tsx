import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, brl2, generateMonthlyReport } from "@/lib/store";
import { Section } from "@/components/Section";
import { FileSpreadsheet, Command } from "lucide-react";

export const Route = createFileRoute("/fechamento")({
  head: () => ({
    meta: [
      { title: "Fechamento Mensal — Docfin" },
      { name: "description", content: "Exportação contábil mensal por regime tributário para envio ao contador." },
    ],
  }),
  component: Fechamento,
});

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function Fechamento() {
  const s = useStore();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const report = useMemo(() => generateMonthlyReport(s, month, year), [s, month, year]);
  const generatedAt = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i);

  return (
    <>
      {/* On-screen UI */}
      <div className="no-print">
        <Section
          title="Exportação Contábil"
          subtitle="Fechamento mensal automático — pronto para enviar ao seu contador"
          action={
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Dossiê Contábil
            </div>
          }
        >
          <div className="glass-card rounded-2xl p-4 mb-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Mês</label>
              <select
                value={month}
                onChange={(e) => setMonth(+e.target.value)}
                className="bg-secondary/60 border border-border rounded-md h-9 px-3 text-sm"
              >
                {MONTH_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Ano</label>
              <select
                value={year}
                onChange={(e) => setYear(+e.target.value)}
                className="bg-secondary/60 border border-border rounded-md h-9 px-3 text-sm"
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Faturamento bruto</p>
              <p className="font-mono text-2xl font-semibold">{brl2(report.totalGross)}</p>
            </div>
          </div>

          {/* Resumo por regime */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {Object.entries(report.byRegime).length === 0 && (
              <div className="glass-card rounded-2xl p-6 sm:col-span-2 lg:col-span-3 text-center text-xs text-muted-foreground">
                Sem operações registradas em {monthLabel}.
              </div>
            )}
            {Object.entries(report.byRegime).map(([k, v]) => (
              <div key={k} className="glass-card rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{v.label}</p>
                <p className="font-mono text-xl font-semibold mt-1">{brl2(v.gross)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{v.count} operações</p>
              </div>
            ))}
          </div>

          {/* Tabela detalhada */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">Hospital / Pagador</th>
                  <th className="text-left px-4 py-2 font-medium">Regime</th>
                  <th className="text-right px-4 py-2 font-medium">Plantões</th>
                  <th className="text-right px-4 py-2 font-medium">Cirurgias</th>
                  <th className="text-right px-4 py-2 font-medium">Bruto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.rows.map((r) => (
                  <tr key={`${r.workplaceId}-${r.regime}`}>
                    <td className="px-4 py-2.5">{r.workplaceName}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{report.byRegime[r.regime]?.label ?? r.regime}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{r.shiftsCount}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{r.surgeriesCount}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{brl2(r.gross)}</td>
                  </tr>
                ))}
                {report.rows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma operação no período.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
            <FileSpreadsheet className="h-3 w-3" />
            O dossiê impresso/PDF é otimizado em A4, preto e branco, fonte Inter — pronto para auditoria.
          </p>
        </Section>
      </div>


    </>
  );
}
