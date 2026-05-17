import { useEffect, useState } from "react";
import { useStore, type CryptoTicker } from "@/lib/store";
import { Plus, X } from "lucide-react";

const TICKERS: CryptoTicker[] = ["USDT", "USDC", "BTC", "ETH", "SOL", "OUTRO"];

export function TreasuryForm() {
  const { addAsset } = useStore();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [ticker, setTicker] = useState<CryptoTicker>("USDT");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [acquisitionValue, setAcquisitionValue] = useState<string>("");
  const [yieldAPY, setYieldAPY] = useState<string>("");

  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(t);
    }
    setMounted(false);
  }, [open]);

  const reset = () => {
    setTicker("USDT");
    setDescription("");
    setQuantity("");
    setAcquisitionValue("");
    setYieldAPY("");
  };

  const close = () => {
    setMounted(false);
    setTimeout(() => setOpen(false), 180);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(acquisitionValue.replace(",", "."));
    if (!value || !description.trim()) return;
    addAsset({
      category: "Cripto",
      description: description.trim(),
      currentValue: value,
      ticker,
      yieldAPY: yieldAPY ? parseFloat(yieldAPY.replace(",", ".")) : undefined,
    });
    reset();
    close();
  };

  const inputCls =
    "mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white tabular-nums tracking-tight placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-colors";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-medium px-3.5 py-2 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Nova posição
      </button>

      {open && (
        <div
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
            mounted ? "opacity-100" : "opacity-0"
          }`}
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full sm:max-w-md bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl transform transition-all duration-200 ${
              mounted ? "translate-y-0 sm:scale-100 opacity-100" : "translate-y-6 sm:translate-y-0 sm:scale-95 opacity-0"
            }`}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Tesouraria</p>
                <h3 className="text-white font-medium mt-0.5">Registrar posição em cripto</h3>
              </div>
              <button onClick={close} className="text-zinc-500 hover:text-white p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submit} className="px-5 py-4 space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Ticker</label>
                <select
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value as CryptoTicker)}
                  className={inputCls + " tracking-normal"}
                >
                  {TICKERS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Descrição</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex.: USDT na Binance — reserva hedge"
                  className={inputCls + " tracking-normal"}
                  style={{ fontVariantNumeric: "normal" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Quantidade</label>
                  <input
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0,00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Valor (BRL)</label>
                  <input
                    inputMode="decimal"
                    value={acquisitionValue}
                    onChange={(e) => setAcquisitionValue(e.target.value)}
                    placeholder="0,00"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Yield APY (%) — opcional</label>
                <input
                  inputMode="decimal"
                  value={yieldAPY}
                  onChange={(e) => setYieldAPY(e.target.value)}
                  placeholder="Ex.: 4,50"
                  className={inputCls}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { reset(); close(); }}
                  className="px-3.5 py-2 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black transition-colors"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
