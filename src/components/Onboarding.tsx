import { useState, type ReactNode } from "react";
import { ArrowRight, BriefcaseBusiness, Calculator, CheckCircle2, Loader2, Sparkles, Stethoscope, Target, Timer, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DocFinLogo } from "@/components/DocFinLogo";
import { useStore, type OnboardingGoal, type UserRole } from "@/lib/store";
import { logger } from "@/lib/logger";

const goals: Array<{ value: OnboardingGoal; label: string; description: string; icon: typeof Target }> = [
  {
    value: "ORGANIZAR_PLANTOES",
    label: "Organizar plantões",
    description: "Registrar rápido e revisar depois, sem planilha no fim do mês.",
    icon: Stethoscope,
  },
  {
    value: "OTIMIZAR_IMPOSTOS",
    label: "Otimizar impostos",
    description: "Acompanhar sinais fiscais sem preencher uma declaração agora.",
    icon: Target,
  },
  {
    value: "ECONOMIZAR_TEMPO",
    label: "Economizar tempo",
    description: "Reduzir WhatsApp, retrabalho e cobrança do contador.",
    icon: Timer,
  },
];

export function Onboarding() {
  const { completeOnboarding, updateUserProfile, userProfile } = useStore();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(userProfile.role === "accountant" ? "accountant" : null);
  const [fullName, setFullName] = useState("");
  const [specialtyName, setSpecialtyName] = useState("");
  const [accountingFirm, setAccountingFirm] = useState("");
  const [onboardingGoal, setOnboardingGoal] = useState<OnboardingGoal>("ORGANIZAR_PLANTOES");
  const [saving, setSaving] = useState(false);

  const isDoctor = selectedRole === "doctor";
  const isAccountant = selectedRole === "accountant";
  const isValid = fullName.trim().length > 1 && (
    isDoctor ? specialtyName.trim().length > 1 : isAccountant ? accountingFirm.trim().length > 1 : false
  );

  function getErrorMessage(error: unknown) {
    if (error && typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
    if (error instanceof Error && error.message.trim()) return error.message;
    return "Erro desconhecido ao salvar o perfil.";
  }

  async function finishOnboarding() {
    if (!isValid || saving) return;

    setSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Usuário não autenticado.");

      const normalizedName = fullName.trim();
      const normalizedSpecialty = specialtyName.trim();
      const normalizedAccountingFirm = accountingFirm.trim();
      const roleToSave = selectedRole ?? "doctor";
      const profileSpecialty = roleToSave === "accountant" ? normalizedAccountingFirm : normalizedSpecialty;
      const profileTraining = roleToSave === "accountant" ? "Contabilidade" : "Médico Generalista";

      const payload = {
        id: user.id,
        email: user.email ?? null,
        full_name: normalizedName,
        training_level: profileTraining,
        specialty_name: profileSpecialty,
        onboarding_goal: onboardingGoal,
        base_address: "",
        role: roleToSave,
        accountant_access_status: userProfile.accountantAccessStatus ?? "REVOKED",
        linked_accountant_email: userProfile.linkedAccountantEmail ?? null,
        active_client_shift_id: userProfile.activeClientShiftId ?? null,
        linked_clients: userProfile.linkedClients ?? [],
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      const { data: savedProfile, error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" })
        .select("id, role, onboarding_completed")
        .maybeSingle();

      if (error) throw error;
      if (!savedProfile?.id) {
        throw new Error("O Supabase não retornou o perfil salvo. Verifique RLS, trigger e colunas da tabela profiles.");
      }

      updateUserProfile({
        fullName: normalizedName,
        trainingLevel: "Médico Generalista",
        specialtyName: profileSpecialty,
        onboardingGoal,
        baseAddress: "",
        role: savedProfile.role === "accountant" ? "accountant" : roleToSave,
      });
      completeOnboarding();
      window.location.href = savedProfile.role === "accountant" ? "/contador" : "/dashboard";
    } catch (error: unknown) {
      console.error("Erro completo do Supabase no onboarding:", error);
      logger.error("Erro ao concluir onboarding simplificado.", error);
      alert(`Não conseguimos concluir seu acesso agora.\n\nDetalhe técnico: ${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-foreground">
      <section className="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <DocFinLogo className="h-8 w-[116px]" />
            <span className="ml-1 border-l border-border pl-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Entrada rápida
            </span>
          </div>

          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Sem formulário fiscal agora
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Entre no DocFin em menos de um minuto.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
              Primeiro definimos sua visão: médico plantonista ou contador parceiro. Depois o DocFin abre somente o painel certo para sua rotina.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {["Perfil", "Dados essenciais", "Painel correto"].map((item) => (
              <div key={item} className="rounded-2xl border border-border bg-surface/70 p-4">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <p className="mt-3 text-sm font-semibold text-foreground">{item}</p>
                <p className="mt-1 text-xs text-muted-foreground">Só o essencial.</p>
              </div>
            ))}
          </div>
        </div>

        <div className="premium-card rounded-3xl p-5 md:p-7">
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Primeiro acesso</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {selectedRole ? "Sua configuração leve" : "Escolha sua área de trabalho"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {selectedRole
                ? "Nada de renda, regime fiscal ou fonte pagadora nesta etapa."
                : "Essa escolha separa o painel médico do painel contábil desde o primeiro login."}
            </p>
          </div>

          {!selectedRole && (
            <div className="grid gap-3">
              <RoleCard
                title="Sou Médico(a)"
                description="Quero lançar plantões, acompanhar recebíveis e preparar meu fechamento mensal."
                icon={<Stethoscope className="h-5 w-5" />}
                onClick={() => setSelectedRole("doctor")}
              />
              <RoleCard
                title="Sou Contador(a)"
                description="Quero acessar solicitações de clientes e operar uma visão administrativa de leitura."
                icon={<Calculator className="h-5 w-5" />}
                onClick={() => setSelectedRole("accountant")}
              />
            </div>
          )}

          {selectedRole && (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => setSelectedRole(null)}
              className="text-xs font-semibold text-muted-foreground underline underline-offset-4 transition hover:text-primary"
            >
              Trocar tipo de conta
            </button>

            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                {isAccountant ? "Nome do responsável" : "Nome"}
              </span>
              <input
                autoFocus
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder={isAccountant ? "Ex: Vinicius Toledo" : "Ex: Dra. Thais Ruiz"}
                className={inputCls}
              />
            </label>

            {isDoctor && (
            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Stethoscope className="h-3.5 w-3.5" />
                Especialidade médica
              </span>
              <input
                value={specialtyName}
                onChange={(event) => setSpecialtyName(event.target.value)}
                placeholder="Ex: Anestesiologia"
                className={inputCls}
              />
            </label>
            )}

            {isAccountant && (
              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <BriefcaseBusiness className="h-3.5 w-3.5" />
                  Escritório / Empresa contábil
                </span>
                <input
                  value={accountingFirm}
                  onChange={(event) => setAccountingFirm(event.target.value)}
                  placeholder="Ex: Toledo Contabilidade Médica"
                  className={inputCls}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Você irá direto para o Painel Contábil para aceitar solicitações de médicos vinculados.
                </p>
              </label>
            )}

            {isDoctor && (
            <fieldset className="space-y-3">
              <legend className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                O que você quer resolver primeiro?
              </legend>
              <div className="grid gap-2">
                {goals.map(({ value, label, description, icon: Icon }) => {
                  const active = onboardingGoal === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setOnboardingGoal(value)}
                      className={`flex min-h-16 items-start gap-3 rounded-2xl border p-3 text-left transition-all duration-200 ${
                        active
                          ? "border-primary/55 bg-primary/10 text-foreground shadow-[0_0_28px_rgba(15,118,110,0.14)]"
                          : "border-border bg-surface text-muted-foreground hover:border-primary/35 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`mt-0.5 h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <span>
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            )}
          </div>
          )}

          {selectedRole && (
          <button
            type="button"
            onClick={finishOnboarding}
            disabled={!isValid || saving}
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_0_28px_rgba(15,118,110,0.18)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{isAccountant ? "Entrar no Painel Contábil" : "Entrar no Painel"} <ArrowRight className="h-4 w-4" /></>}
          </button>
          )}
        </div>
      </section>
    </main>
  );
}

function RoleCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-28 items-start gap-4 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-primary/45 hover:bg-primary/10"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary transition group-hover:border-primary/50">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold text-foreground">{title}</span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

const inputCls = "w-full min-h-12 rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25";
