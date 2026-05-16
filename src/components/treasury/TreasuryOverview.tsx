import { useMemo } from "react";
import { useStore, brl, USD_PEGGED_TICKERS, type CryptoTicker } from "@/lib/store";
import { Banknote, Bitcoin } from "lucide-react";

const HARD_CURRENCY_TICKERS: CryptoTicker[] = [...USD_PEGGED_TICKERS, "BTC", "ETH", "SOL"];

export function TreasuryOverview() {
  const { assets } = useStore();

  const data = useMemo(() => {
    const total = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
    const hard = assets
      .filter((a) => a.category === "Cripto" && a.ticker && HARD_CURRENCY_TICKERS.includes(a.ticker))
      .reduce((s, a) => s + a.currentValue, 0);
    const brlExp = total - hard;
    const hardShare = total > 0 ? (hard / total) * 100 : 0;
    const brlShare = 100 - hardShare;
    return { total, hard, brlExp, hardShare, brlShare };
  }, [assets]);

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Exposição em BRL</p>
          <Banknote className="h-4 w-4 text-emerald-500" />
        </div>
        <p className="font-display text-2xl text-white tabular-nums tracking-tight mt-2">
          {brl(data.brlExp)}
        </p>
        <div className="mt-3 h-1 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${data.brlShare}%` }} />
        </div>
        <p className="text-[11px] text-zinc-400 mt-2 tabular-nums tracking-tight">
          {data.brlShare.toFixed(1)}% do patrimônio total
        </p>
      </div>

      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Moeda Forte / Cripto</p>
          <Bitcoin className="h-4 w-4 text-amber-400" />
        </div>
        <p className="font-display text-2xl text-white tabular-nums tracking-tight mt-2">
          {brl(data.hard)}
        </p>
        <div className="mt-3 h-1 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full bg-amber-400" style={{ width: `${data.hardShare}%` }} />
        </div>
        <p className="text-[11px] text-zinc-400 mt-2 tabular-nums tracking-tight">
          {data.hardShare.toFixed(1)}% do patrimônio total
        </p>
      </div>
    </section>
  );
}
