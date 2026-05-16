import { useState } from "react";
import { useStore, INCOME_SOURCE_LABELS, type IncomeSourceKind, type TaxProfile, brl } from "@/lib/store";
import { Building2, Landmark, FileText, Smartphone, Users, Sparkles, ArrowRight, type LucideIcon } from "lucide-react";

const SOURCES: IncomeSourceKind[] = ["PJ", "CLT", "RPA", "PARTICULAR", "SCP"];

const SOURCE_ICONS: Record<IncomeSourceKind, LucideIcon> = {
  PJ: Building2,
  CLT: Landmark,
  RPA: FileText,
  PARTICULAR: Smartphone,
  SCP: Users,
};

export function FiscalOnboardingModal() {
  const { taxProfile, saveTaxProfile } = useStore();
  const [draft, setDraft] = useState<TaxProfile>(() => ({
    completed: false,
    sources: {
      PJ: { ...taxProfile.sources.PJ },
      CLT: { ...taxProfile.sources.CLT },
      RPA: { ...taxProfile.sources.RPA },
      PARTICULAR: { ...taxProfile.sources.PARTICULAR },
      SCP: { ...taxProfile.sources.SCP },
    },
  }));

  const total = SOURCES.reduce(
    (a, k) => a + (draft.sources[k].enabled ? draft.sources[k].monthly || 0 : 0),
    0,
  );
  const anyEnabled = SOURCES.some((k) => draft.sources[k].enabled);

  const toggle = (k: IncomeSourceKind) =>
    setDraft((d) => ({
      ...d,
      sources: { ...d.sources, [k]: { ...d.sources[k], enabled: !d.sources[k].enabled } },
    }));

  const setAmount = (k: IncomeSourceKind, v: number) =>
    setDraft((d) => ({
      ...d,
      sources: { ...d.sources, [k]: { ...d.sources[k], monthly: isNaN(v) ? 0 : v } },
    }));

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="p-6 md:p-8 border-b border-white/5">
          <div className="flex items-center gap-2 text-emerald-400">
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-[0.25em]">Configuração inicial</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl mt-2 tracking-tight text-white">
            Quais são suas fontes de renda?
          </h2>
          <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
            Pode selecionar mais do que uma opção. Não se preocupe, o Docfin fará os cálculos complexos por si.
          </p>
        </div>

        <div className="p-6 md:p-8 space-y-3">
          {SOURCES.map((k) => {
            const s = draft.sources[k];
            const Icon = SOURCE_ICONS[k];
            return (
              <div
                key={k}
                className={`rounded-2xl border p-4 transition backdrop-blur ${
                  s.enabled ? "border-emerald-500/40 bg-emerald-500/[0.04]" : "border-white/5 bg-black/40"
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={() => toggle(k)}
                    className="h-4 w-4 accent-emerald-500"
                  />
                  <Icon className={`h-4 w-4 ${s.enabled ? "text-emerald-400" : "text-slate-500"}`} strokeWidth={1.75} />
                  <span className="text-sm font-medium text-white flex-1">{INCOME_SOURCE_LABELS[k]}</span>
                </label>
                {s.enabled && (
                  <div className="mt-3 pl-7 flex items-center gap-2">
                    <span className="text-zinc-500 text-sm">R$</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={s.monthly || ""}
                      onChange={(e) => setAmount(k, parseFloat(e.target.value))}
                      placeholder="Valor médio mensal"
                      className="flex-1 bg-transparent border-b border-white/10 focus:border-emerald-500 outline-none py-1.5 text-emerald-400 tabular-nums text-base"
                    />
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">/mês</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-6 md:p-8 border-t border-white/5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Renda global mensal</p>
            <p className="font-display text-2xl text-emerald-400 tabular-nums">{brl(total)}</p>
          </div>
          <button
            disabled={!anyEnabled}
            onClick={() => saveTaxProfile(draft)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm px-5 py-3 transition"
          >
            Concluir <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}