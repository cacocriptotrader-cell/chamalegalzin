import { useMemo } from "react";
import {
  useStore,
  brl2,
  computeShift,
  monthlyFixedTotal,
  computedProLaboreMonthly,
  getCurrentMonthRegimeTotal,
  computeTaxForRegime,
  type ShiftStatus,
} from "@/lib/store";

/**
 * ExecutiveReport — Dossiê de Private Banking.
 * Tela: fundo deep-black com orbs esmeralda/cyan.
 * Impressão: branco puro, A4, sem efeitos.
 */
type Origin = "TUSS" | "SUS" | "SCP";

interface ProcedureRow {
  date: string;
  hospital: string;
  description: string;
  origin: Origin;
  gross: number;
  net: number;
}

export function ExecutiveReport() {
  const s = useStore();

  const data = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const inMonth = (iso: string) => {
      const d = new Date(iso + "T12:00:00");
      return d.getFullYear() === y && d.getMonth() === m;
    };

    const rows: ProcedureRow[] = [];
    let grossRevenue = 0;
    let totalTax = 0;
    let totalLogistics = 0;

    for (const sh of s?.shifts ?? []) {
      if (!inMonth(sh.date)) continue;
      if ((sh.status as ShiftStatus) === "REPASSADO") continue;
      const wp = s?.workplaces?.find((w) => w.id === sh.workplaceId);
      const math = computeShift(s, sh);
      const origin: Origin = wp?.regime === "PF" ? "SUS" : "TUSS";
      grossRevenue += sh.gross || 0;
      totalTax += math?.tax || 0;
      totalLogistics += math?.logistics || 0;
      rows.push({
        date: sh.date,
        hospital: wp?.name ?? "—",
        description: `Plantão · ${sh.hours}h`,
        origin,
        gross: sh.gross || 0,
        net: math?.net || 0,
      });
    }

    for (const sg of s?.surgeries ?? []) {
      if (!inMonth(sg.date)) continue;
      if (sg.myRole === "TITULAR") {
        const wp = s?.workplaces?.find((w) => w.id === sg.hospitalId);
        const origin: Origin = wp?.regime === "SCP" ? "SCP" : wp?.regime === "PF" || wp?.regime === "RPA" ? "SUS" : "TUSS";
        const tax = wp ? computeTaxForRegime(sg.totalGross || 0, wp.regime, s) : 0;
        grossRevenue += sg.totalGross || 0;
        totalTax += tax;
        rows.push({
          date: sg.date,
          hospital: wp?.name ?? "—",
          description: sg.procedure || "Cirurgia (Titular)",
          origin,
          gross: sg.totalGross || 0,
          net: (sg.totalGross || 0) - tax,
        });
      } else {
        grossRevenue += sg.myExpectedShare || 0;
        rows.push({
          date: sg.date,
          hospital: `SCP — ${sg.payingSurgeonName ?? "—"}`,
          description: sg.procedure || "Cirurgia (Membro de equipe)",
          origin: "SCP",
          gross: sg.myExpectedShare || 0,
          net: sg.myExpectedShare || 0,
        });
      }
    }

    rows.sort((a, b) => a.date.localeCompare(b.date));

    const fixedCosts = monthlyFixedTotal(s) || 0;
    const netProfit = grossRevenue - totalTax - totalLogistics - fixedCosts;
    const pjRevenue = getCurrentMonthRegimeTotal(s, y, m + 1, ["PJ_SIMPLES"]);
    const factorR = pjRevenue > 0 ? (computedProLaboreMonthly(s, today) / pjRevenue) * 100 : 0;

    return {
      label: today.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      }),
      rows,
      grossRevenue,
      totalTax,
      totalLogistics,
      fixedCosts,
      netProfit,
      factorR,
    };
  }, [s]);

  const fmtPt = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");

  const totalNet = data.rows.reduce((a, r) => a + (r.net || 0), 0);

  return (
    <div className="relative w-full max-w-5xl mx-auto bg-[#050505] text-slate-200 p-8 flex flex-col font-sans border-none overflow-hidden print:scale-[0.85] print:origin-top print:h-[297mm] print:w-full print:overflow-hidden">
      {/* Orbs de luz */}
      <div className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[150px] -left-[150px] w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Cabeçalho */}
      <div className="mb-16 border-l-4 border-emerald-500 pl-6 z-10 relative">
        <p className="text-emerald-500 font-bold tracking-[0.3em] text-sm mb-2">
          PRIVATE FINANCIAL DOSSIER
        </p>
        <h1 className="text-5xl font-black text-white leading-tight font-serif">
          Relatório
          <br />
          Executivo Financeiro
        </h1>
        <p className="text-zinc-400 mt-4 max-w-2xl text-lg">
          Docfin Wealth Management: Gestão de patrimônio e inteligência
          tributária.
        </p>
        <p className="text-zinc-500 mt-3 text-sm uppercase tracking-widest">
          Período de Referência ·{" "}
          <span className="text-emerald-500">
            {data.label}
          </span>
        </p>
      </div>

      {/* Grade de Performance */}
      <div className="grid grid-cols-3 gap-8 mb-16 z-10 relative">
        <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">
            Faturamento Bruto
          </p>
          <p className="tabular-nums text-4xl font-bold text-emerald-500">
            {brl2(data.grossRevenue)}
          </p>
          <p className="text-xs text-zinc-600 mt-2">
            Receita consolidada do mês
          </p>
        </div>
        <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">
            Lucro Líquido
          </p>
          <p className="tabular-nums text-4xl font-bold text-emerald-500">
            {brl2(data.netProfit)}
          </p>
          <p className="text-xs text-zinc-600 mt-2">
            Após impostos, logística e custos fixos
          </p>
        </div>
        <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">
            Fator R
          </p>
          <p className="tabular-nums text-4xl font-bold text-emerald-500">
            {data.factorR.toFixed(1)}%
          </p>
          <p className="text-xs text-zinc-600 mt-2">
            Pró-labore / Faturamento PJ Simples
          </p>
        </div>
      </div>

      {/* Demonstrativo */}
      <div className="grid grid-cols-3 gap-6 mb-16 z-10 relative">
        <div className="bg-[#09090b]/60 border border-zinc-900 rounded-lg p-5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">
            (–) Impostos
          </p>
          <p className="tabular-nums text-xl font-semibold text-zinc-200 mt-2">
            {brl2(data.totalTax)}
          </p>
        </div>
        <div className="bg-[#09090b]/60 border border-zinc-900 rounded-lg p-5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">
            (–) Logística
          </p>
          <p className="tabular-nums text-xl font-semibold text-zinc-200 mt-2">
            {brl2(data.totalLogistics)}
          </p>
        </div>
        <div className="bg-[#09090b]/60 border border-zinc-900 rounded-lg p-5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">
            (–) Custos Fixos
          </p>
          <p className="tabular-nums text-xl font-semibold text-zinc-200 mt-2">
            {brl2(data.fixedCosts)}
          </p>
        </div>
      </div>

      {/* Tabela TUSS/SUS */}
      <div className="z-10 relative">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-2xl font-serif font-bold text-white">
            Ledger de Procedimentos
          </h2>
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
            Conciliação fiscal por origem
          </p>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-zinc-800 text-zinc-500 uppercase tracking-widest text-xs">
              <th className="pb-4 pr-4 font-medium">Data</th>
              <th className="pb-4 pr-4 font-medium">Hospital / Origem</th>
              <th className="pb-4 pr-4 font-medium">Procedimento</th>
              <th className="pb-4 pr-4 font-medium">Origem</th>
              <th className="pb-4 pr-4 font-medium text-right">Bruto</th>
              <th className="pb-4 font-medium text-right">Líquido</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-12 text-center text-zinc-600"
                >
                  Nenhum procedimento registrado no período.
                </td>
              </tr>
            )}
            {data.rows.map((r, i) => (
              <tr
                key={i}
                className="border-b border-zinc-900"
              >
                <td className="py-4 pr-4 text-zinc-400 tabular-nums text-sm">
                  {fmtPt(r.date)}
                </td>
                <td className="py-4 pr-4 text-zinc-200">
                  {r.hospital}
                </td>
                <td className="py-4 pr-4 text-zinc-400 text-sm">
                  {r.description}
                </td>
                <td className="py-4 pr-4">
                  {r.origin === "TUSS" ? (
                    <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2 py-1 rounded">TUSS</span>
                  ) : r.origin === "SCP" ? (
                    <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-1 rounded">SCP</span>
                  ) : (
                    <span className="bg-cyan-500/10 text-cyan-500 text-xs px-2 py-1 rounded">SUS</span>
                  )}
                </td>
                <td className="py-4 pr-4 text-right tabular-nums text-zinc-200">
                  {brl2(r.gross)}
                </td>
                <td className="py-4 text-right tabular-nums text-emerald-500 font-semibold">
                  {brl2(r.net)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-800">
              <td
                colSpan={4}
                className="pt-5 text-xs uppercase tracking-[0.2em] text-zinc-500"
              >
                Total Consolidado
              </td>
              <td className="pt-5 text-right tabular-nums text-white font-bold">
                {brl2(data.grossRevenue)}
              </td>
              <td className="pt-5 text-right tabular-nums text-emerald-500 font-bold">
                {brl2(totalNet)}
              </td>
            </tr>
          </tfoot>
        </table>

        <p className="text-xs text-zinc-600 mt-8 leading-relaxed max-w-3xl">
          Tags contábeis:{" "}
          <span className="text-emerald-500 font-semibold">
            TUSS
          </span>{" "}
          identifica receita de saúde suplementar (planos/convênios via PJ);{" "}
          <span className="text-cyan-500 font-semibold">
            SUS
          </span>{" "}
          identifica receita de rede pública (RPA/PF) e <span className="text-amber-400 font-semibold">SCP</span> identifica distribuição de lucros isenta. Use esta diferenciação
          para conciliação fiscal.
        </p>
      </div>

      {/* Rodapé */}
      <div className="mt-20 pt-6 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-600 z-10 relative">
        <span className="tracking-widest uppercase">
          Docfin · Confidential Wealth Dossier
        </span>
        <span className="tabular-nums">
          Emitido em {new Date().toLocaleDateString("pt-BR")}
        </span>
      </div>
    </div>
  );
}
