import { useState } from "react";
import { useStore, computeShift, brl2, fmtDate, type Shift } from "@/lib/store";
import { X, Send, Copy, UserPlus, Repeat, CheckCircle2, AlertTriangle } from "lucide-react";

type Step = "details" | "confirm" | "share" | "found";

export function ShiftHandoffModal({ shiftId, onClose }: { shiftId: string; onClose: () => void }) {
  const store = useStore();
  const shift = store.shifts.find((s) => s.id === shiftId);
  const wp = shift ? store.workplaces.find((w) => w.id === shift.workplaceId) : null;
  const status = shift?.status ?? "CONFIRMADO";

  const initialStep: Step =
    status === "BUSCANDO_SUBSTITUTO" ? "share" : status === "REPASSADO" ? "found" : "details";
  const [step, setStep] = useState<Step>(initialStep);
  const [coverName, setCoverName] = useState(shift?.coveredBy ?? "");
  const [copied, setCopied] = useState(false);

  if (!shift || !wp) return null;

  const math = computeShift(store, shift);
  const dateLabel = fmtDate(new Date(shift.date + "T12:00:00"));
  const message =
    `Plantão Disponível\n` +
    `Local: ${wp.name}\n` +
    `Data/Hora: ${dateLabel} - ${shift.hours}h\n` +
    `Valor: ${brl2(shift.gross)}\n\n` +
    `Interessados, me chamem no privado.\n` +
    `_Gerado via Docfin App_`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(message)}`;

  function startSearching() {
    store.updateShift(shiftId, { status: "BUSCANDO_SUBSTITUTO" });
    setStep("share");
  }
  async function copyText() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {/* ignore */}
  }
  function confirmCover() {
    if (!coverName.trim()) return;
    store.updateShift(shiftId, { status: "REPASSADO", coveredBy: coverName.trim() });
    setStep("found");
  }
  function revert() {
    store.updateShift(shiftId, { status: "CONFIRMADO", coveredBy: undefined });
    setStep("details");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-900 border border-border rounded-t-2xl sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Plantão</p>
            <h2 className="text-base font-semibold tracking-tight truncate">{wp.name}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {dateLabel} · {shift.hours}h · bruto {brl2(shift.gross)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 -m-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body by step */}
        <div className="p-5 space-y-4">
          {step === "details" && (
            <>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Stat label="Líquido projetado" value={brl2(math.net)} accent="success" />
                <Stat label="Carga horária" value={`${shift.hours}h`} />
                <Stat label="Logística" value={brl2(math.logistics)} />
                <Stat label="Imposto" value={brl2(math.tax)} />
              </div>
              <button
                onClick={() => setStep("confirm")}
                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-secondary border border-border text-sm font-medium hover:bg-secondary/80 transition"
              >
                <Repeat className="h-3.5 w-3.5" />
                Passar este Plantão
              </button>
            </>
          )}

          {step === "confirm" && (
            <>
              <div className="rounded-md border border-warning/40 bg-warning/[0.06] p-4 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  Ao repassar, <span className="font-mono text-warning">{brl2(math.net)}</span> serão removidos
                  da sua projeção deste mês. Você poderá reverter se ninguém pegar.
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStep("details")}
                  className="h-10 rounded-md border border-border text-sm font-medium hover:bg-secondary/50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={startSearching}
                  className="h-10 rounded-md bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition"
                >
                  Confirmar repasse
                </button>
              </div>
            </>
          )}

          {step === "share" && (
            <>
              <div className="rounded-md border border-border bg-zinc-950 p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Mensagem para grupos
                </p>
                <pre className="whitespace-pre-wrap text-xs font-sans text-foreground/90 leading-relaxed">
{message}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={copyText}
                  className="inline-flex items-center justify-center gap-2 h-10 rounded-md border border-border bg-secondary/50 text-sm font-medium hover:bg-secondary transition"
                >
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={copyText}
                  className="inline-flex items-center justify-center gap-2 h-10 rounded-md text-sm font-semibold transition"
                  style={{ background: "#10B981", color: "#052e1f" }}
                >
                  <Send className="h-3.5 w-3.5" />
                  Copiar e Abrir WhatsApp
                </a>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                  <UserPlus className="h-3 w-3" /> Já encontrou alguém? Dê baixa no plantão:
                </p>
                <div className="flex gap-2">
                  <input
                    value={coverName}
                    onChange={(e) => setCoverName(e.target.value)}
                    placeholder="Nome do colega"
                    className="flex-1 h-9 px-3 rounded-md bg-secondary/60 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
                  />
                  <button
                    onClick={confirmCover}
                    disabled={!coverName.trim()}
                    className="h-9 px-3 rounded-md text-xs font-semibold transition disabled:opacity-40"
                    style={{ background: "#10B981", color: "#052e1f" }}
                  >
                    Substituto Encontrado
                  </button>
                </div>
                <button
                  onClick={revert}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  Reverter — eu farei o plantão
                </button>
              </div>
            </>
          )}

          {step === "found" && (
            <>
              <div className="rounded-md border border-success/40 bg-success/[0.06] p-4 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  Plantão repassado para <span className="font-medium text-foreground">{shift.coveredBy}</span>.
                  O valor de <span className="font-mono">{brl2(math.net)}</span> foi removido da sua projeção.
                </div>
              </div>
              <button
                onClick={revert}
                className="w-full h-10 rounded-md border border-border text-sm font-medium hover:bg-secondary/50 transition"
              >
                Reverter — eu farei o plantão
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "success" }) {
  return (
    <div className="rounded-md border border-border bg-zinc-950/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono text-sm mt-1 ${accent === "success" ? "text-success" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
