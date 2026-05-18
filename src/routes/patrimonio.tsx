import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
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
  Bitcoin,
  X,
  Search,
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
  type Asset,
  type AssetCategory,
  type Liability,
} from "@/lib/store";
import { CACHE_BUSTER_DOCFIN } from "@/lib/buildInfo";
import {
  DIRPF_PARSER_VERSION,
  DirpfPdfParseError,
  parseDirpfPdf,
  type ParsedDirpfAsset,
  type ParsedDirpfLiability,
} from "@/lib/dirpfPdfParser";
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
  "Renda Variável": "#2563eb",
  "Imobilizado": "#22c55e",
  "Outros": "#64748b",
};

const LIQUID_CATEGORIES: AssetCategory[] = ["Renda Fixa", "Renda Variável"];

type DraftAsset = ParsedDirpfAsset;

type DraftLiability = ParsedDirpfLiability & {
  currentValue: number;
};

const toMoneyInput = (value: number) => Number.isFinite(value) ? value.toFixed(2) : "0.00";

function parseMoneyInput(value: string) {
  const clean = value.replace(/[^\d,.-]/g, "");
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function PatrimonioPage() {
  const store = useStore();
  const { assets, liabilities, setAssets, setLiabilities, removeAsset, removeLiability } = store;
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [draftAssets, setDraftAssets] = useState<DraftAsset[]>([]);
  const [draftLiabilities, setDraftLiabilities] = useState<DraftLiability[]>([]);
  const [reviewSearch, setReviewSearch] = useState("");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

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
  const hasDraftReview = draftAssets.length > 0 || draftLiabilities.length > 0;
  const projectedNetWorth = useMemo(() => {
    const draftTotalAssets = draftAssets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const draftTotalLiabilities = draftLiabilities.reduce((sum, liability) => sum + liability.currentValue, 0);
    return draftTotalAssets - draftTotalLiabilities;
  }, [draftAssets, draftLiabilities]);
  const normalizedReviewSearch = reviewSearch.trim().toLowerCase();
  const filteredDraftAssets = useMemo(
    () => draftAssets.filter((asset) => matchesReviewSearch(asset.description, asset.category, asset.code, normalizedReviewSearch)),
    [draftAssets, normalizedReviewSearch],
  );
  const filteredDraftLiabilities = useMemo(
    () => draftLiabilities.filter((liability) => matchesReviewSearch(liability.description, liability.category, liability.code, normalizedReviewSearch)),
    [draftLiabilities, normalizedReviewSearch],
  );

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
      setProcessingMessage(null);
      setDraftAssets([]);
      setDraftLiabilities([]);
      setReviewSearch("");

      const name = file.name.toLowerCase();
      const accepted = ACCEPTED_EXT.some((ext) => name.endsWith(ext));
      if (!accepted || (file.type && file.type !== "application/pdf") || file.size === 0) {
        const msg = "Formato não suportado. Envie um PDF da DIRPF.";
        setReadError(msg);
        toast.error(msg);
        return;
      }

      setAnalyzing(true);
      setFileName(file.name);
      setProcessingMessage("Extraindo texto do PDF...");

      try {
        const parsed = await parseDirpfPdf(file, {
          onProgress: (progress) => {
            setProcessingMessage(progress.message);
          },
        });
        const totalItems = parsed.assets.length + parsed.liabilities.length;
        if (totalItems === 0) {
          setReadSuccess(true);
          const msg = "Conseguimos abrir o PDF, mas não encontramos bens ou dívidas automaticamente. Tente outro arquivo da declaração ou revise manualmente depois.";
          setReadInfo(msg);
          toast.info(msg);
        } else {
          setDraftAssets(parsed.assets);
          setDraftLiabilities(parsed.liabilities.map((liability) => ({
            ...liability,
            currentValue: liability.currentValue ?? liability.remainingBalance,
          })));
          setReadSuccess(true);
          setReadInfo(null);
          toast.success(`${totalItems} item(ns) extraídos. Revise antes de salvar.`);
        }
      } catch (error) {
        console.error("[Patrimônio] Erro ao processar DIRPF", error);
        const msg = error instanceof DirpfPdfParseError
          ? "Não conseguimos ler os dados deste PDF. Se ele for uma imagem escaneada, tente uma versão textual ou confira se o arquivo está legível."
          : "Erro ao ler arquivo. Formato não suportado ou corrompido.";
        setReadError(msg);
        toast.error(msg);
      } finally {
        setAnalyzing(false);
        setProcessingMessage(null);
      }
    },
    [],
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
      setProcessingMessage(null);
      setDraftAssets([]);
      setDraftLiabilities([]);
      setReviewSearch("");
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
    setProcessingMessage(null);
    setDraftAssets([]);
    setDraftLiabilities([]);
    setReviewSearch("");
  };

  const updateDraftAsset = (id: string, patch: Partial<Pick<DraftAsset, "description" | "currentValue">>) => {
    setDraftAssets((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const updateDraftLiability = (
    id: string,
    patch: Partial<Pick<DraftLiability, "description" | "currentValue">>,
  ) => {
    setDraftLiabilities((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const cancelReview = () => {
    setDraftAssets([]);
    setDraftLiabilities([]);
    setReadSuccess(false);
    setReadInfo(null);
    setReviewSearch("");
  };

  const confirmReview = () => {
    const confirmedAssets: Asset[] = draftAssets.map((asset) => ({
      id: asset.id,
      entityDomain: asset.entityDomain,
      category: asset.category,
      description: asset.description,
      currentValue: asset.currentValue,
      ticker: asset.ticker,
      yieldAPY: asset.yieldAPY,
    }));

    const confirmedLiabilities: Liability[] = draftLiabilities.map((liability) => ({
      id: liability.id,
      entityDomain: liability.entityDomain,
      category: liability.category,
      description: liability.description,
      totalAmount: liability.currentValue,
      remainingBalance: liability.currentValue,
      interestRate: liability.interestRate,
    }));

    setAssets(confirmedAssets);
    setLiabilities(confirmedLiabilities);
    setDraftAssets([]);
    setDraftLiabilities([]);
    setReadInfo(null);
    setReadSuccess(true);
    setReviewSearch("");
    toast.success("Patrimônio confirmado e salvo.");
  };

  useEffect(() => {
    if (!hasDraftReview) return;
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        confirmReview();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [hasDraftReview, draftAssets, draftLiabilities]);

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

      {/* Wealth Hero + DIRPF Import */}
      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] items-stretch">
        <div
          className="glass-card rounded-3xl p-6 md:p-7 relative overflow-hidden min-h-[280px] flex flex-col justify-between"
          style={{
            background:
              "linear-gradient(135deg, rgba(37,99,235,0.18), rgba(15,26,48,0.94) 48%, rgba(148,163,184,0.12))",
          }}
        >
          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Wealth Dashboard</p>
            <h3 className="font-display text-xl text-foreground mt-2">Patrimônio Líquido Consolidado</h3>
            <p className="font-display text-5xl md:text-6xl text-success mt-5 tabular-nums">{brl(netWorth)}</p>
            <p className="text-sm text-muted-foreground mt-3 max-w-lg">
              Visão PF baseada nos bens, direitos e dívidas extraídos da sua DIRPF e ajustáveis manualmente.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            <div className="rounded-2xl bg-card p-3 border border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Bens
              </p>
              <p className="font-semibold text-foreground mt-1 tabular-nums">{brl(totalAssets)}</p>
            </div>
            <div className="rounded-2xl bg-card p-3 border border-border">
              <p className="text-[10px] uppercase tracking-wider text-rose-100/70 inline-flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> Dívidas
              </p>
              <p className="font-semibold text-foreground mt-1 tabular-nums">{brl(totalLiabilities)}</p>
            </div>
            <div className="rounded-2xl bg-card p-3 border border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ativos</p>
              <p className="font-semibold text-foreground mt-1 tabular-nums">{assets.length}</p>
            </div>
            <div className="rounded-2xl bg-card p-3 border border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Passivos</p>
              <p className="font-semibold text-foreground mt-1 tabular-nums">{liabilities.length}</p>
            </div>
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`glass-card rounded-3xl p-6 border-2 border-dashed transition-all flex flex-col justify-center ${
            dragOver ? "border-primary bg-primary/10" : "border-border/60"
          }`}
        >
          <div className="flex flex-col items-center text-center gap-3">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center bg-primary/10 border border-primary/20"
              style={{ boxShadow: "0 18px 60px rgba(37,99,235,0.14)" }}
            >
              {analyzing ? (
                <Loader2 className="h-7 w-7 text-primary animate-spin" />
              ) : (
                <UploadCloud className="h-7 w-7 text-primary" />
              )}
            </div>
            {analyzing ? (
              <>
                <p className="font-medium">{processingMessage ?? "Analisando ativos..."}</p>
                <p className="text-xs text-muted-foreground">
                  Cruzando Bens & Direitos, Dívidas e Ônus do PDF {fileName}
                </p>
                <div className="w-full max-w-xs h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                  <div className="h-full rounded-full animate-pulse bg-primary" style={{ width: "70%" }} />
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-[0.18em] text-primary/80">Importação patrimonial</p>
                <h3 className="font-display text-xl">Importar DIRPF (PDF)</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Envie a declaração textual da Receita Federal para atualizar Bens, Direitos e Dívidas no navegador, de forma <span className="text-foreground">100% local</span>.
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
                    className="px-5 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-[0_16px_50px_rgba(37,99,235,0.18)]"
                  >
                    <UploadCloud className="h-4 w-4" /> Importar DIRPF (PDF)
                  </button>
                  {readSuccess && (
                    <CheckCircle2 className="h-5 w-5 text-success" aria-label="Arquivo lido com sucesso" />
                  )}
                </div>

                <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-1">
                  <ShieldCheck className="h-3 w-3" /> Processamento local e privado
                </span>
                <button
                  type="button"
                  onClick={() => setShowTechnicalDetails((value) => !value)}
                  className="mt-1 text-[10px] text-muted-foreground/70 underline underline-offset-4 hover:text-muted-foreground"
                >
                  {showTechnicalDetails ? "Ocultar detalhes técnicos" : "Mostrar detalhes técnicos"}
                </button>
                {showTechnicalDetails && (
                  <div className="mt-1 rounded-lg border border-border/60 bg-surface-elevated/60 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
                    <p>Versão do leitor: {DIRPF_PARSER_VERSION}</p>
                    <p>Build: {CACHE_BUSTER_DOCFIN}</p>
                  </div>
                )}

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
      </section>

      {hasDraftReview && (
        <section className="glass-card rounded-3xl p-5 md:p-6 space-y-5 border border-primary/20">
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-400/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-amber-200" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-amber-100/80">Revisão obrigatória</p>
              <p className="text-sm text-amber-50/90 mt-1">
                Leitura concluída. Como este é um documento digitalizado, nossa IA pode ter perdido alguns centavos. Por favor, revise os valores antes de salvar.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Auditoria da importação</p>
              <h3 className="font-display text-xl mt-1">Revise os bens e dívidas encontrados</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {draftAssets.length} ativo(s) • {draftLiabilities.length} passivo(s)
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <label className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-3 focus-within:ring-2 focus-within:ring-primary/30">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={reviewSearch}
                onChange={(event) => setReviewSearch(event.target.value)}
                placeholder="Buscar por descrição, código ou categoria"
                className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Atalho: <span className="font-mono text-foreground">Cmd/Ctrl + Enter</span> para confirmar.
            </p>
          </div>

          {normalizedReviewSearch && filteredDraftAssets.length === 0 && filteredDraftLiabilities.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface-elevated/40 p-5 text-center text-sm text-muted-foreground">
              Nenhum item encontrado para “{reviewSearch}”.
            </div>
          )}

          {filteredDraftAssets.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary/80">Bens & Direitos</p>
              <div className="space-y-3 md:hidden">
                {filteredDraftAssets.map((asset) => (
                  <ReviewItemCard
                    key={asset.id}
                    tone="asset"
                    code={asset.code}
                    category={asset.category}
                    description={asset.description}
                    value={asset.currentValue}
                    onDescriptionChange={(description) => updateDraftAsset(asset.id, { description })}
                    onValueChange={(currentValue) => updateDraftAsset(asset.id, { currentValue })}
                  />
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[760px] space-y-2">
                  <div className="grid grid-cols-[1fr_170px] gap-3 px-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    <span>Código / Descrição</span>
                    <span className="text-right">Valor Atual</span>
                  </div>
                  {filteredDraftAssets.map((asset) => (
                    <div key={asset.id} className="grid grid-cols-[1fr_170px] gap-3 rounded-2xl bg-surface-elevated border border-border p-3 items-center">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
                          {asset.code ?? "Sem código"} • {asset.category}
                        </p>
                        <input
                          value={asset.description}
                          onChange={(event) => updateDraftAsset(asset.id, { description: event.target.value })}
                          className="w-full bg-transparent text-sm font-medium outline-none border-b border-transparent focus:border-primary/50 transition"
                          aria-label="Descrição do bem"
                        />
                      </div>
                      <label className="flex items-center gap-1 rounded-xl bg-primary/10 border border-primary/20 px-2 py-1.5">
                        <span className="text-[11px] text-primary/70">R$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={toMoneyInput(asset.currentValue)}
                          onChange={(event) => updateDraftAsset(asset.id, { currentValue: parseMoneyInput(event.target.value) })}
                          className="w-full bg-transparent text-right text-sm tabular-nums text-primary outline-none"
                          aria-label="Valor atual do bem"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {filteredDraftLiabilities.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-rose-200/80">Dívidas & Ônus</p>
              <div className="space-y-3 md:hidden">
                {filteredDraftLiabilities.map((liability) => (
                  <ReviewItemCard
                    key={liability.id}
                    tone="liability"
                    code={liability.code}
                    category={liability.category}
                    description={liability.description}
                    value={liability.currentValue}
                    onDescriptionChange={(description) => updateDraftLiability(liability.id, { description })}
                    onValueChange={(currentValue) => updateDraftLiability(liability.id, { currentValue })}
                  />
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[760px] space-y-2">
                  <div className="grid grid-cols-[1fr_170px] gap-3 px-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    <span>Código / Descrição</span>
                    <span className="text-right">Valor Atual</span>
                  </div>
                  {filteredDraftLiabilities.map((liability) => (
                    <div key={liability.id} className="grid grid-cols-[1fr_170px] gap-3 rounded-2xl bg-surface-elevated border border-border p-3 items-center">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
                          {liability.code ?? "Sem código"} • {liability.category}
                        </p>
                        <input
                          value={liability.description}
                          onChange={(event) => updateDraftLiability(liability.id, { description: event.target.value })}
                          className="w-full bg-transparent text-sm font-medium outline-none border-b border-transparent focus:border-rose-300/50 transition"
                          aria-label="Descrição da dívida"
                        />
                      </div>
                      <label className="flex items-center gap-1 rounded-xl bg-rose-400/10 border border-rose-300/20 px-2 py-1.5">
                        <span className="text-[11px] text-rose-100/70">R$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={toMoneyInput(liability.currentValue)}
                          onChange={(event) => updateDraftLiability(liability.id, { currentValue: parseMoneyInput(event.target.value) })}
                          className="w-full bg-transparent text-right text-sm tabular-nums text-rose-100 outline-none"
                          aria-label="Valor atual da dívida"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pt-4 border-t border-border">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Patrimônio Líquido Projetado</p>
              <p className="font-display text-3xl text-success tabular-nums mt-1">{brl(projectedNetWorth)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={cancelReview}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border/60 hover:bg-muted/40 transition"
              >
                Cancelar revisão
              </button>
              <button
                type="button"
                onClick={confirmReview}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition"
              >
                Confirmar e Salvar Patrimônio
              </button>
            </div>
          </div>
        </section>
      )}

      {assets.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Bens & Direitos ({assets.length})
              </p>
              <h3 className="font-display text-lg mt-0.5">Carteira patrimonial declarada</h3>
            </div>
            <p className="text-sm font-semibold text-success tabular-nums">{brl(totalAssets)}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {assets.map((a) => {
              const Icon = CATEGORY_ICON[a.category];
              return (
                <div key={a.id} className="glass-card rounded-2xl p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          {a.category}
                        </span>
                        <button
                          onClick={() => removeAsset(a.id)}
                          className="text-muted-foreground hover:text-destructive p-1 -mr-1 -mt-1"
                          aria-label="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-sm font-medium mt-2 line-clamp-2">{a.description}</p>
                      <p className="font-display text-xl text-success mt-4 tabular-nums">{brl(a.currentValue)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {liabilities.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Dívidas & Ônus ({liabilities.length})
              </p>
              <h3 className="font-display text-lg mt-0.5">Passivos declarados</h3>
            </div>
            <p className="text-sm font-semibold text-rose-300 tabular-nums">{brl(totalLiabilities)}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {liabilities.map((l) => (
              <div key={l.id} className="glass-card rounded-2xl p-4 border border-border/50 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{l.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {l.category} • {l.interestRate.toFixed(1)}% a.a.
                  </p>
                </div>
                <div className="text-right shrink-0">
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

      {allocation.length > 0 && (
        <section className="glass-card rounded-2xl p-5">
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
                    background: "rgba(15,26,48,0.96)",
                    border: "1px solid rgba(30,42,69,0.95)",
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
        </section>
      )}

      {/* Tesouraria Internacional & Hedge */}
      <TreasuryPanel />

      {/* Tesouraria — Visão Institucional */}
      <section className="space-y-4 pt-2">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tesouraria</p>
            <h3 className="font-display text-lg text-foreground mt-0.5">Posições & Hedge</h3>
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

    </div>
  );
}

function matchesReviewSearch(description: string, category: string, code: string | undefined, query: string) {
  if (!query) return true;
  const haystack = `${description} ${category} ${code ?? ""}`.toLowerCase();
  return haystack.includes(query);
}

function ReviewItemCard({
  tone,
  code,
  category,
  description,
  value,
  onDescriptionChange,
  onValueChange,
}: {
  tone: "asset" | "liability";
  code?: string;
  category: string;
  description: string;
  value: number;
  onDescriptionChange: (description: string) => void;
  onValueChange: (value: number) => void;
}) {
  const accentClass = tone === "asset" ? "text-primary" : "text-rose-100";
  const valueBoxClass = tone === "asset"
    ? "bg-primary/10 border-primary/20 text-primary"
    : "bg-rose-400/10 border-rose-300/20 text-rose-100";

  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {code ?? "Sem código"} • {category}
      </p>
      <label className="mt-3 block space-y-1.5">
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Descrição</span>
        <textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          rows={3}
          className="min-h-[88px] w-full rounded-xl border border-border bg-card px-3 py-3 text-base leading-relaxed outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          aria-label="Descrição do item"
        />
      </label>
      <label className={`mt-3 flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 ${valueBoxClass}`}>
        <span className="text-sm opacity-75">R$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={toMoneyInput(value)}
          onChange={(event) => onValueChange(parseMoneyInput(event.target.value))}
          className={`w-full bg-transparent text-right text-base font-semibold tabular-nums outline-none ${accentClass}`}
          aria-label="Valor atual do item"
        />
      </label>
    </div>
  );
}
