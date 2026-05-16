import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { toast } from "sonner";
import {
  UploadCloud,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Building2,
  Car,
  Landmark,
  LineChart,
  AlertTriangle,
  Trash2,
  FileText,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from "recharts";
import {
  useStore,
  brl,
  type AssetCategory,
} from "@/lib/store";
import { CACHE_BUSTER_DOCFIN } from "@/lib/buildInfo";
import { DIRPF_PARSER_VERSION, DirpfPdfParseError, parseDirpfPdf } from "@/lib/dirpfPdfParser";
import { TreasuryPanel } from "@/components/TreasuryPanel";
import { TreasuryOverview } from "@/components/treasury/TreasuryOverview";
import { TreasuryLedger } from "@/components/treasury/TreasuryLedger";
import { TreasuryForm } from "@/components/treasury/TreasuryForm";

export const Route = createFileRoute("/patrimonio")({
  head: () => ({
    meta: [
      { title: "Raio-X Patrimonial — Docfin" },
      { name: "description", content: "Importe sua DIRPF e veja seu balanço patrimonial completo." },
    ],
  }),
  component: PatrimonioPage,
});

import { Bitcoin } from "lucide-react";

const CATEGORY_ICON: Record<AssetCategory, typeof Building2> = {
  "Imóvel": Building2,
  "Veículo": Car,
  "Renda Fixa": Landmark,
  "Renda Variável": LineChart,
  "Consórcio": FileText,
  "Cripto": Bitcoin,
};

const ALLOC_COLORS: Record<string, string> = {
  "Renda Fixa": "#3b82f6",
  "Renda Variável": "#8b5cf6",
  "Imobilizado": "#10b981",
  "Outros": "#64748b",
};

const LIQUID_CATEGORIES: AssetCategory[] = ["Renda Fixa", "Renda Variável"];

function PatrimonioPage() {
  const store = useStore();
  const { assets, liabilities, setAssets, setLiabilities, removeAsset, removeLiability } = store;
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const totalAssets = assets.reduce((a, x) => a + x.currentValue, 0);
  const totalLiabilities = liabilities.reduce((a, x) => a + x.remainingBalance, 0);
  const netWorth = totalAssets - totalLiabilities;

  const allocation = useMemo(() => {
    const buckets: Record<string, number> = {
      "Renda Fixa": 0,
      "Renda Variável": 0,
      "Imobilizado": 0,
      "Outros": 0,
    };
    for (const a of assets) {
      if (a.category === "Renda Fixa") buckets["Renda Fixa"] += a.currentValue;
      else if (a.category === "Renda Variável") buckets["Renda Variável"] += a.currentValue;
      else if (a.category === "Imóvel" || a.category === "Veículo") buckets["Imobilizado"] += a.currentValue;
      else buckets["Outros"] += a.currentValue;
    }
    return Object.entries(buckets)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [assets]);

  const liquidAssets = assets
    .filter((a) => LIQUID_CATEGORIES.includes(a.category))
    .reduce((s, a) => s + a.currentValue, 0);
  const expensiveDebts = liabilities.filter((l) => l.interestRate >= 10);
  const arbitrageOpportunity = liquidAssets > 0 && expensiveDebts.length > 0;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [readSuccess, setReadSuccess] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [readInfo, setReadInfo] = useState<string | null>(null);

  const ACCEPTED_EXT = [".pdf"];

  const processFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      setReadError(null);
      setReadInfo(null);
      setReadSuccess(false);

      const name = file.name.toLowerCase();
      const accepted = ACCEPTED_EXT.some((ext) => name.endsWith(ext));
      if (!accepted || (file.type && file.type !== "application/pdf") || file.size === 0) {
        const msg = "Formato não suportado. Envie um PDF textual da DIRPF.";
        setReadError(msg);
        toast.error(msg);
        return;
      }

      setAnalyzing(true);
      setFileName(file.name);

      try {
        const parsed = await parseDirpfPdf(file);
        setAssets(parsed.assets);
        setLiabilities(parsed.liabilities);
        setReadSuccess(true);

        const totalItems = parsed.assets.length + parsed.liabilities.length;
        if (totalItems === 0) {
          const msg = `PDF lido pelo parser legacy worker (${DIRPF_PARSER_VERSION}), mas o layout desta declaração ainda não foi reconhecido. Verifique o console para detalhes.`;
          setReadInfo(msg);
          toast.info(msg);
        } else {
          setReadInfo(null);
          toast.success(`${totalItems} item(ns) patrimoniais extraídos da DIRPF`);
        }
      } catch (error) {
        console.error("[Patrimônio] Erro ao processar DIRPF", error);
        const msg = error instanceof DirpfPdfParseError
          ? error.message
          : "Erro ao ler arquivo. Formato não suportado ou corrompido.";
        setReadError(msg);
        toast.error(msg);
      } finally {
        setAnalyzing(false);
      }
    },
    [setAssets, setLiabilities],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFileName(null);
      setReadSuccess(false);
      setReadError(null);
      setReadInfo(null);
      return;
    }
    processFile(f);
  };

  const clearFile = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileName(null);
    setReadSuccess(false);
    setReadError(null);
    setReadInfo(null);
  };

  return (
    <div className="px-5 py-4 space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3" /> Raio-X Patrimonial
        </p>
        <h2 className="font-display text-2xl text-gradient mt-1">O Cofre</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Sua visão consolidada de Bens, Direitos e Dívidas — padrão private bank.
        </p>
      </header>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`glass-card rounded-2xl p-6 border-2 border-dashed transition-all ${
          dragOver ? "border-primary bg-primary/5" : "border-border/60"
        }`}
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            {analyzing ? (
              <Loader2 className="h-7 w-7 text-primary-foreground animate-spin" />
            ) : (
              <UploadCloud className="h-7 w-7 text-primary-foreground" />
            )}
          </div>
          {analyzing ? (
            <>
              <p className="font-medium">Analisando ativos…</p>
              <p className="text-xs text-muted-foreground">
                Cruzando Bens & Direitos, Dívidas e Ônus do PDF {fileName}
              </p>
              <div className="w-full max-w-xs h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                <div className="h-full rounded-full animate-pulse" style={{ width: "70%", background: "var(--gradient-primary)" }} />
              </div>
            </>
          ) : (
            <>
              <h3 className="font-display text-lg">Importe sua Declaração de IR</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Arraste o PDF da sua última Declaração de Imposto de Renda, ou selecione manualmente. Nossa IA extrairá
                seus Bens, Direitos e Dívidas diretamente no navegador, de forma <span className="text-foreground">100% local</span>.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={onFileChange}
                className="hidden"
                aria-label="Selecionar arquivo da declaração de IR"
              />

              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2 border border-border/60 hover:bg-muted/40 transition"
                >
                  <UploadCloud className="h-4 w-4" /> Selecionar arquivo
                </button>
                {readSuccess && (
                  <CheckCircle2 className="h-5 w-5 text-success" aria-label="Arquivo lido com sucesso" />
                )}
              </div>

              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-1">
                <ShieldCheck className="h-3 w-3" /> Criptografia AES-256
              </span>
              <span className="text-[10px] text-muted-foreground/70 mt-0.5">
                Parser {DIRPF_PARSER_VERSION}
              </span>
              <span className="text-[10px] text-muted-foreground/50 mt-0.5">
                Build {CACHE_BUSTER_DOCFIN}
              </span>

              {readSuccess && fileName && (
                <div className="mt-2 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-success/10 text-success border border-success/30">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Arquivo {fileName} lido com sucesso</span>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="ml-1 opacity-70 hover:opacity-100"
                    aria-label="Remover arquivo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {readInfo && (
                <div className="mt-2 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-muted/30 text-muted-foreground border border-border/60">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{readInfo}</span>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="ml-1 opacity-70 hover:opacity-100"
                    aria-label="Limpar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {readError && (
                <div className="mt-2 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/30">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{readError}</span>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="ml-1 opacity-70 hover:opacity-100"
                    aria-label="Limpar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Net Worth + Donut */}
      <section className="grid gap-4">
        <div
          className="glass-card rounded-2xl p-5 relative overflow-hidden"
          style={{ background: "var(--gradient-primary)" }}
        >
          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-[0.18em] text-primary-foreground/80">Patrimônio Líquido</p>
            <p className="font-display text-4xl text-primary-foreground mt-1">{brl(netWorth)}</p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-primary-foreground/70 inline-flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Ativos
                </p>
                <p className="font-semibold text-primary-foreground mt-1">{brl(totalAssets)}</p>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-primary-foreground/70 inline-flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" /> Passivos
                </p>
                <p className="font-semibold text-primary-foreground mt-1">{brl(totalLiabilities)}</p>
              </div>
            </div>
          </div>
        </div>

        {allocation.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Alocação de Ativos</p>
            <h4 className="font-display text-lg mt-0.5">Distribuição da carteira</h4>
            <div className="h-56 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocation}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {allocation.map((entry) => (
                      <Cell key={entry.name} fill={ALLOC_COLORS[entry.name] ?? "#64748b"} />
                    ))}
                  </Pie>
                  <RTooltip
                    contentStyle={{
                      background: "rgba(15,23,42,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={((v: any) => brl(Number(v))) as any}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {allocation.map((a) => {
                const pct = totalAssets > 0 ? (a.value / totalAssets) * 100 : 0;
                return (
                  <div key={a.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: ALLOC_COLORS[a.name] }} />
                    <span className="text-muted-foreground flex-1">{a.name}</span>
                    <span className="font-medium">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Tesouraria Internacional & Hedge */}
      <TreasuryPanel />

      {/* Tesouraria — Visão Institucional */}
      <section className="space-y-4 pt-2">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Tesouraria</p>
            <h3 className="font-display text-lg text-white mt-0.5">Posições & Hedge</h3>
          </div>
          <TreasuryForm />
        </div>
        <TreasuryOverview />
        <TreasuryLedger />
      </section>

      {/* Diagnóstico Docfin */}
      {(arbitrageOpportunity || (assets.length === 0 && liabilities.length === 0)) && (
        <section className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Diagnóstico Docfin
          </p>
          {arbitrageOpportunity && (
            <div className="rounded-2xl p-4 border border-amber-500/30 bg-amber-500/10">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-amber-200">Oportunidade de Arbitragem</h5>
                  <p className="text-sm text-amber-100/80 mt-1">
                    Você possui financiamentos com juros de até{" "}
                    <span className="font-semibold">
                      {Math.max(...expensiveDebts.map((d) => d.interestRate)).toFixed(1)}% a.a.
                    </span>{" "}
                    e {brl(liquidAssets)} em Renda Fixa/Variável. Considere amortizar parte das
                    dívidas — o custo do financiamento provavelmente supera o rendimento líquido
                    da sua aplicação.
                  </p>
                </div>
              </div>
            </div>
          )}
          {assets.length === 0 && liabilities.length === 0 && (
            <div className="rounded-2xl p-4 border border-border/60 bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Nenhum ativo ou passivo cadastrado. Importe sua DIRPF para começar.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Lists */}
      {assets.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Bens & Direitos ({assets.length})
          </p>
          <div className="space-y-2">
            {assets.map((a) => {
              const Icon = CATEGORY_ICON[a.category];
              return (
                <div key={a.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.description}</p>
                    <p className="text-[11px] text-muted-foreground">{a.category}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{brl(a.currentValue)}</p>
                  <button
                    onClick={() => removeAsset(a.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {liabilities.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Dívidas & Ônus ({liabilities.length})
          </p>
          <div className="space-y-2">
            {liabilities.map((l) => (
              <div key={l.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{l.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {l.category} • {l.interestRate.toFixed(1)}% a.a.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{brl(l.remainingBalance)}</p>
                  <p className="text-[10px] text-muted-foreground">de {brl(l.totalAmount)}</p>
                </div>
                <button
                  onClick={() => removeLiability(l.id)}
                  className="text-muted-foreground hover:text-destructive p-1"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
