import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2, FileText, Settings, WalletCards } from "lucide-react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/gestao")({
  head: () => ({
    meta: [
      { title: "Configurações — Docfin" },
      { name: "description", content: "Hub de configurações reorganizado por Empresa, Documentos e Vida Financeira." },
    ],
  }),
  component: ConfiguracoesHub,
});

const hubCards = [
  {
    to: "/empresa",
    title: "Empresa & Hospitais",
    subtitle: "Hospitais, vínculos fixos, regras de pagamento, INSS e pró-labore.",
    icon: Building2,
  },
  {
    to: "/documentos",
    title: "Documentos",
    subtitle: "Cofre de compliance, validades, CRM e certificado digital.",
    icon: FileText,
  },
  {
    to: "/vida-financeira",
    title: "Vida Financeira",
    subtitle: "Veículo, custos fixos, dívidas e metas pessoais.",
    icon: WalletCards,
  },
] as const;

function ConfiguracoesHub() {
  const { resetOnboarding } = useStore();

  return (
    <div className="px-5 py-5 space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-1.5">
            <Settings className="h-3 w-3" /> Configurações
          </p>
          <h1 className="font-display text-2xl mt-1">Cadastros reorganizados</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            A antiga Gestão foi dividida em áreas claras para separar Backoffice PJ de Vida PF sem remover nenhuma funcionalidade.
          </p>
        </div>
        <button
          onClick={resetOnboarding}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 self-start md:self-auto"
        >
          Rever introdução inicial
        </button>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {hubCards.map(({ to, title, subtitle, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-2xl border border-white/[0.06] bg-white/[0.035] p-5 hover:bg-white/[0.06] transition"
          >
            <div className="h-10 w-10 rounded-xl bg-black/30 border border-white/[0.06] flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-display text-lg mt-4 group-hover:text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
