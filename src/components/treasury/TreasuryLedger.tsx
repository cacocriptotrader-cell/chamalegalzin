import { useMemo } from "react";
import { useStore, brl, type Asset } from "@/lib/store";
import { Trash2 } from "lucide-react";

export function TreasuryLedger() {
  const { assets, removeAsset } = useStore();

  const { total, rows } = useMemo(() => {
    const total = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
    const rows = [...assets].sort((a, b) => b.currentValue - a.currentValue);
    return { total, rows };
  }, [assets]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
        <p className="text-sm text-zinc-400">Nenhuma posição registrada.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-zinc-500 border-b border-zinc-800">
            <th className="text-left font-medium px-4 py-2.5 uppercase tracking-[0.14em] text-[10px]">Ativo</th>
            <th className="text-left font-medium px-4 py-2.5 uppercase tracking-[0.14em] text-[10px]">Ticker</th>
            <th className="text-right font-medium px-4 py-2.5 uppercase tracking-[0.14em] text-[10px]">Saldo</th>
            <th className="text-right font-medium px-4 py-2.5 uppercase tracking-[0.14em] text-[10px]">Yield</th>
            <th className="text-right font-medium px-4 py-2.5 uppercase tracking-[0.14em] text-[10px]">Alocação</th>
            <th className="px-2 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a: Asset) => {
            const pct = total > 0 ? (a.currentValue / total) * 100 : 0;
            return (
              <tr key={a.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-2.5">
                  <p className="text-white truncate max-w-[260px]">{a.description}</p>
                  <p className="text-[10px] text-zinc-500">{a.category}</p>
                </td>
                <td className="px-4 py-2.5 text-zinc-400 tabular-nums tracking-tight">
                  {a.ticker ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-right text-white tabular-nums tracking-tight">
                  {brl(a.currentValue)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums tracking-tight">
                  {a.yieldAPY ? (
                    <span className="text-emerald-500">{a.yieldAPY.toFixed(2)}%</span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums tracking-tight">
                  <span className="text-zinc-300">{pct.toFixed(2)}%</span>
                </td>
                <td className="px-2 py-2.5 text-right">
                  <button
                    onClick={() => removeAsset(a.id)}
                    className="p-1.5 text-zinc-600 hover:text-red-500 transition-colors"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-zinc-900/80">
            <td className="px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-zinc-500" colSpan={2}>Total</td>
            <td className="px-4 py-2.5 text-right text-white font-medium tabular-nums tracking-tight">{brl(total)}</td>
            <td></td>
            <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums tracking-tight">100.00%</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
