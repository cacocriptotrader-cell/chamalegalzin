import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useStore, type FeedbackContext, type FeedbackType } from "@/lib/store";

type MicroFeedbackPromptProps = {
  actionId: string;
  context: FeedbackContext;
  type: FeedbackType;
  question: string;
  toastId?: string | number;
};

const FEEDBACK_OPTIONS = [
  { score: 1, label: "Difícil", icon: <ThumbsDown className="h-4 w-4" /> },
  { score: 3, label: "Ok", icon: <CheckCircle2 className="h-4 w-4" /> },
  { score: 5, label: "Muito rápido", icon: <ThumbsUp className="h-4 w-4" /> },
] as const;

export function MicroFeedbackPrompt({ actionId, context, type, question, toastId }: MicroFeedbackPromptProps) {
  const store = useStore();
  const [submitted, setSubmitted] = useState(false);

  async function submit(score: number) {
    if (submitted) return;
    setSubmitted(true);
    void store.saveFeedback({ actionId, context, type, score });
    window.setTimeout(() => {
      if (toastId !== undefined) toast.dismiss(toastId);
    }, 2000);
  }

  if (submitted) {
    return (
      <div className="w-[min(92vw,390px)] rounded-2xl border border-emerald-400/25 bg-[#0A0D14]/95 p-4 text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-50">Obrigado!</p>
            <p className="mt-0.5 text-xs text-zinc-400">Seu feedback ajuda a deixar o DocFin mais leve.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[min(92vw,420px)] rounded-2xl border border-white/10 bg-[#0A0D14]/95 p-4 text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
        Feedback rápido
      </p>
      <p className="mt-1.5 text-sm font-semibold leading-5 text-zinc-50">{question}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {FEEDBACK_OPTIONS.map((option) => (
          <button
            key={option.score}
            type="button"
            onClick={() => void submit(option.score)}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-2 text-xs font-semibold text-zinc-300 transition hover:border-emerald-400/35 hover:bg-emerald-400/10 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/30"
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function showMicroFeedbackToast(props: Omit<MicroFeedbackPromptProps, "toastId">) {
  toast.custom((toastId) => <MicroFeedbackPrompt {...props} toastId={toastId} />, {
    duration: 9000,
    position: "bottom-right",
  });
}
