import { useMemo } from "react";
import { useStore, monthlyFixedTotal, brl, USD_PEGGED_TICKERS } from "@/lib/store";
import { Coins, Bitcoin, ShieldAlert, TrendingUp } from "lucide-react";

export function TreasuryPanel() {
  const store = useStore();

  const data = useMemo(() => {
    const totalAssets = store.assets.reduce((a, x) => a + (x.currentValue || 0), 0);
    const usdValue = store.assets
      .filter((a) => a.category === "Cripto" && a.ticker && (USD_PEGGED_TICKERS.includes(a.ticker) || a.ticker === "BTC" || a.ticker === "ETH"))
      .reduce((s, a) => s + a.currentValue, 0);
    const stableUsdValue = store.assets
      .filter((a) => a.category === "Cripto" && a.ticker && USD_PEGGED_TICKERS.includes(a.ticker))
      .reduce((s, a) => s + a.currentValue, 0);
    const brlValue = totalAssets - usdValue;
    const usdShare = totalAssets > 0 ? (usdValue / totalAssets) * 100 : 0;
    const brlShare = 100 - usdShare;

    // Caixa Livre = Renda Fixa líquida (proxy de liquidez imediata)
    const liquidCash = store.assets
      .filter((a) => a.category === "Renda Fixa" || (a.category === "Cripto" && a.ticker && USD_PEGGED_TICKERS.includes(a.ticker)))
      .reduce((s, a) => s + a.currentValue, 0);

    const monthlyFixed = monthlyFixedTotal(store);
    const monthsOfRunway = monthlyFixed > 0 ? liquidCash / monthlyFixed : 0;
    const surplusCash = Math.max(0, liquidCash - monthlyFixed * 3);
    const hedgeOpportunity = monthsOfRunway > 3 && surplusCash > 0 && stableUsdValue / Math.max(1, liquidCash) < 0.3;
    const suggestedHedge = surplusCash * 0.5;

    return {
      totalAssets, usdValue, brlValue, usdShare, brlShare,
      liquidCash, monthlyFixed, monthsOfRunway, surplusCash, hedgeOpportunity, suggestedHedge,
    };
  }, [store]);

  if (data.totalAssets === 0) return null;

  return (
    <section className="mt-2 mb-6 animate-fade-in">
      <div className="flex items-center gap-2 px-1 mb-3">
        <Coins className="h-3.5 w-3.5 text-muted-foreground" />
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
          Tesouraria & Hedge
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl bg-zinc-900/50 border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Exposição cambial</p>
            <Bitcoin className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-2 rounded-full bg-secondary/60 overflow-hidden flex">
            <div className="h-full bg-emerald-500/80" style={{ width: `${data.brlShare}%` }} />
            <div className="h-full bg-amber-400/80" style={{ width: `${data.usdShare}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] font-mono">
            <span className="text-emerald-400">BRL {data.brlShare.toFixed(0)}% · {brl(data.brlValue)}</span>
            <span className="text-amber-400">USD {data.usdShare.toFixed(0)}% · {brl(data.usdValue)}</span>
          </div>
        </div>

        <div className="rounded-xl bg-zinc-900/50 border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Caixa livre / Runway</p>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="font-display text-2xl text-white tabular-nums tracking-tight">
            {data.monthsOfRunway.toFixed(1)}<span className="text-base text-muted-foreground"> meses</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
            {brl(data.liquidCash)} líquidos · custo fixo {brl(data.monthlyFixed)}/mês
          </p>
        </div>
      </div>

      {data.hedgeOpportunity && (
        <div
          className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/[0.06] p-4 flex items-start gap-3"
        >
          <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-amber-100">
              Oportunidade de Hedge — caixa ocioso acima de 3 meses
            </p>
            <p className="text-[12px] text-amber-100/75 mt-1 leading-relaxed">
              Considere converter ~<strong className="text-amber-300 tabular-nums">{brl(data.suggestedHedge)}</strong>{" "}
              ({((data.suggestedHedge / data.liquidCash) * 100).toFixed(0)}% do seu caixa) para ativos em dólar
              (USDT/USDC) e preservar o poder de compra da sua reserva de valor.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
