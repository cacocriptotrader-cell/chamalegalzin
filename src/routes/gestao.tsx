import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2, FileText, Settings, ShieldCheck, WalletCards } from "lucide-react";
import { useState } from "react";
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
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 inline-flex items-center gap-1.5">
            <Settings className="h-3 w-3" /> Configurações
          </p>
          <h1 className="font-display text-2xl mt-1 text-slate-900">Cadastros reorganizados</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            A antiga Gestão foi dividida em áreas claras para separar Backoffice PJ de Vida PF sem remover nenhuma funcionalidade.
          </p>
        </div>
        <button
          onClick={resetOnboarding}
          className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-4 self-start md:self-auto"
        >
          Rever introdução inicial
        </button>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {hubCards.map(({ to, title, subtitle, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md"
          >
            <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">
              <Icon className="h-5 w-5 text-sky-600" />
            </div>
            <h2 className="font-display text-lg mt-4 text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{subtitle}</p>
          </Link>
        ))}
      </div>

      <AccountingAccessCard />
    </div>
  );
}

function AccountingAccessCard() {
  const { userProfile, updateUserProfile } = useStore();
  const [email, setEmail] = useState(userProfile.linkedAccountantEmail ?? "");
  const hasActiveAccess = userProfile.accountantAccessStatus === "GRANTED" || userProfile.accountantAccessStatus === "PENDING";

  function inviteAccountant() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    updateUserProfile({
      linkedAccountantEmail: normalizedEmail,
      accountantAccessStatus: "GRANTED",
    });
  }

  function revokeAccess() {
    updateUserProfile({
      linkedAccountantEmail: undefined,
      accountantAccessStatus: "REVOKED",
    });
    setEmail("");
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" /> Minha Contabilidade
          </p>
          <h2 className="font-display text-lg mt-2 text-slate-900">Acesso do contador</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Libere ou revogue a visualização dos seus dados financeiros para o escritório contábil que acompanha sua PJ médica.
          </p>
        </div>

        {hasActiveAccess ? (
          <div className="w-full max-w-md rounded-xl border border-sky-200 bg-sky-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700">
                  Acesso Liberado
                </span>
                <p className="mt-3 text-sm font-medium text-slate-900 break-words">
                  Contador vinculado: {userProfile.linkedAccountantEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={revokeAccess}
                className="min-h-11 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                Revogar Acesso
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-slate-500">E-mail do contador</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="contador@escritorio.com.br"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </label>
            <button
              type="button"
              onClick={inviteAccountant}
              disabled={!email.trim()}
              className="mt-3 min-h-11 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              Convidar Contador
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
