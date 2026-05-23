import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2, CreditCard, FileText, MailPlus, Settings, ShieldCheck, UserRound, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  {
    to: "/planos",
    title: "Planos",
    subtitle: "Teste o nível de automação fiscal e contábil que cabe na sua rotina.",
    icon: CreditCard,
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
          <h1 className="font-display text-2xl mt-1 text-foreground">Cadastros reorganizados</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            A antiga Gestão foi dividida em áreas claras para separar Backoffice PJ de Vida PF sem remover nenhuma funcionalidade.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <a
            href="#minha-contabilidade"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <MailPlus className="h-3.5 w-3.5" />
            Convidar Contador
          </a>
          <button
            onClick={resetOnboarding}
            className="inline-flex min-h-11 items-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Rever introdução inicial
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {hubCards.map(({ to, title, subtitle, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group premium-card rounded-2xl p-5 transition hover:border-primary/40"
          >
            <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-display text-lg mt-4 text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
          </Link>
        ))}
      </div>

      <ProfileBasicsCard />
      <AccountingAccessCard />
    </div>
  );
}

const specialtySuggestions = [
  "Anestesiologia",
  "Clínica Médica",
  "Cirurgia Geral",
  "Medicina Intensiva",
  "Emergência",
  "Residente",
  "Ainda sem especialidade",
];

function ProfileBasicsCard() {
  const { userProfile, updateUserProfile } = useStore();
  const [specialty, setSpecialty] = useState(userProfile.specialtyName ?? "");
  const [saving, setSaving] = useState(false);
  const currentSpecialty = userProfile.specialtyName ?? "";
  const hasChanges = specialty.trim() !== currentSpecialty;

  useEffect(() => {
    setSpecialty(userProfile.specialtyName ?? "");
  }, [userProfile.specialtyName]);

  async function handleSaveSpecialty(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !hasChanges) return;

    setSaving(true);
    try {
      updateUserProfile({ specialtyName: specialty.trim() });
      toast.success("Especialidade atualizada.", { duration: 4000 });
    } catch {
      toast.error("Não foi possível salvar a especialidade agora.", { duration: 5000 });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="premium-card rounded-2xl p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-1.5">
            <UserRound className="h-3 w-3" /> Perfil médico
          </p>
          <h2 className="font-display text-lg mt-2 text-foreground">Dados profissionais</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Ajuste sua especialidade quando sua rotina mudar. Esse dado ajuda a personalizar a experiência sem travar o uso do app.
          </p>
        </div>

        <form onSubmit={handleSaveSpecialty} className="w-full max-w-md space-y-3">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Especialidade médica
            </span>
            <input
              list="especialidades-medicas"
              value={specialty}
              onChange={(event) => setSpecialty(event.target.value)}
              placeholder="Ex.: Anestesiologia"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
            />
            <datalist id="especialidades-medicas">
              {specialtySuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>

          <div className="flex flex-wrap gap-2">
            {specialtySuggestions.slice(0, 4).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSpecialty(item)}
                className="inline-flex min-h-11 items-center rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/45 hover:text-foreground"
              >
                {item}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!hasChanges || saving}
            className="min-h-11 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            {saving ? "Salvando..." : "Salvar especialidade"}
          </button>
        </form>
      </div>
    </section>
  );
}

function AccountingAccessCard() {
  const { userProfile, inviteAccountant, revokeAccountantAccess } = useStore();
  const [email, setEmail] = useState(userProfile.linkedAccountantEmail ?? "");
  const [submitting, setSubmitting] = useState(false);
  const isPending = userProfile.accountantAccessStatus === "PENDING";
  const isGranted = userProfile.accountantAccessStatus === "GRANTED";
  const hasActiveAccess = isGranted || isPending;

  async function handleInviteAccountant() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || submitting) return;
    setSubmitting(true);
    const status = await inviteAccountant(normalizedEmail);
    if (status === "synced") {
      toast.success("Convite enviado ao contador.", { duration: 4000 });
    } else {
      toast.error("Não foi possível enviar o convite. Tente novamente em instantes.", { duration: 5000 });
    }
    setSubmitting(false);
  }

  async function handleRevokeAccess() {
    if (submitting) return;
    setSubmitting(true);
    const status = await revokeAccountantAccess();
    if (status === "synced") {
      toast.success("Acesso contábil revogado.", { duration: 4000 });
      setEmail("");
    } else {
      toast.error("Não foi possível revogar o acesso. Tente novamente em instantes.", { duration: 5000 });
    }
    setSubmitting(false);
  }

  return (
    <section id="minha-contabilidade" className="premium-card rounded-2xl p-5 scroll-mt-24">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" /> Minha Contabilidade
          </p>
          <h2 className="font-display text-lg mt-2 text-foreground">Vincular Contador</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Libere ou revogue a visualização dos seus dados financeiros para o escritório contábil que acompanha sua PJ médica.
          </p>
        </div>

        {hasActiveAccess ? (
          <div className="w-full max-w-md rounded-2xl border border-primary/25 bg-primary/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <span className="inline-flex rounded-full border border-success/35 bg-success/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-success">
                  {isPending ? "Aguardando aprovação" : "Acesso Liberado"}
                </span>
                <p className="mt-3 text-sm font-medium text-foreground break-words">
                  {isPending ? "Aguardando aprovação do contador" : "Contador vinculado"}: {userProfile.linkedAccountantEmail}
                </p>
                {isPending && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    O contador verá sua solicitação no Painel Contábil e precisará aceitar antes de acessar seus dados.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleRevokeAccess}
                disabled={submitting}
                className="min-h-11 rounded-xl border border-destructive/35 px-4 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
              >
                Revogar Acesso
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">E-mail do contador</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="contador@escritorio.com.br"
                className="min-h-12 w-full rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
              />
            </label>
            <button
              type="button"
              onClick={handleInviteAccountant}
              disabled={!email.trim() || submitting}
              className="mt-3 min-h-11 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            >
              {submitting ? "Enviando..." : "Convidar Contador"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
