import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, Calculator, CheckCircle2, Loader2, Sparkles, Stethoscope, Target, Timer, User } from "lucide-react";
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
  const pendingRole =
    typeof window !== "undefined" && window.sessionStorage.getItem("docfin.pendingRole") === "accountant"
      ? "accountant"
      : userProfile.role;
  const [fullName, setFullName] = useState("");
  const [specialtyName, setSpecialtyName] = useState("");
  const [onboardingGoal, setOnboardingGoal] = useState<OnboardingGoal>("ORGANIZAR_PLANTOES");
  const [selectedRole, setSelectedRole] = useState<UserRole>(pendingRole ?? "doctor");
  const [saving, setSaving] = useState(false);

  const isValid = fullName.trim().length > 1;
  const isAccountant = selectedRole === "accountant";

  async function finishOnboarding() {
    if (!isValid || saving) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const normalizedName = fullName.trim();
      const normalizedSpecialty = specialtyName.trim() || (isAccountant ? "Contabilidade médica" : "Ainda sem especialidade");
      const updatedAt = new Date().toISOString();

      const profilePayload = {
        id: user.id,
        email: user.email ?? null,
        full_name: normalizedName,
        training_level: isAccountant ? "Médico Generalista" : "Médico Generalista",
        specialty_name: normalizedSpecialty,
        onboarding_goal: onboardingGoal,
        base_address: "",
        role: selectedRole,
        accountant_access_status: selectedRole === "accountant" ? "REVOKED" : (userProfile.accountantAccessStatus ?? "REVOKED"),
        linked_accountant_email: selectedRole === "accountant" ? null : (userProfile.linkedAccountantEmail ?? null),
        active_client_shift_id: selectedRole === "accountant" ? (userProfile.activeClientShiftId ?? null) : null,
        linked_clients: selectedRole === "accountant" ? (userProfile.linkedClients ?? []) : [],
        onboarding_completed: true,
        updated_at: updatedAt,
      };

      const roleProfilePayload = {
        id: user.id,
        email: user.email ?? null,
        full_name: normalizedName,
        specialty_name: normalizedSpecialty,
        role: selectedRole,
        onboarding_completed: true,
        updated_at: updatedAt,
      };

      const minimalProfilePayload = {
        id: user.id,
        full_name: normalizedName,
        specialty_name: normalizedSpecialty,
        onboarding_completed: true,
        updated_at: updatedAt,
      };

      let { error } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });

      if (error && (error.code === "PGRST204" || error.code === "42703" || /column|schema cache/i.test(error.message))) {
        logger.warn("Schema de perfil reduzido detectado. Tentando salvar onboarding com payload de papel essencial.", error);
        const fallbackResult = await supabase.from("profiles").upsert(roleProfilePayload, { onConflict: "id" });
        error = fallbackResult.error;
      }

      if (error && (error.code === "PGRST204" || error.code === "42703" || /column|schema cache/i.test(error.message))) {
        logger.warn("Schema sem coluna de papel detectado. Tentando payload mínimo para não bloquear o acesso.", error);
        const fallbackResult = await supabase.from("profiles").upsert(minimalProfilePayload, { onConflict: "id" });
        error = fallbackResult.error;
      }

      if (error) throw error;

      updateUserProfile({
        fullName: normalizedName,
        trainingLevel: "Médico Generalista",
        specialtyName: normalizedSpecialty,
        onboardingGoal,
        baseAddress: "",
        role: selectedRole,
      });
      completeOnboarding();
      window.sessionStorage.removeItem("docfin.pendingRole");
      window.location.href = selectedRole === "accountant" ? "/contador" : "/dashboard";
    } catch (error: any) {
      logger.error("Erro ao concluir onboarding simplificado.", error);
      alert("Não conseguimos concluir seu acesso agora. Tente novamente em alguns instantes.");
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
              Primeiro você escolhe seu papel. Médicos entram na captura de plantões; contadores entram no painel de solicitações e clientes vinculados.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {["Perfil", "Nome", isAccountant ? "Área" : "Objetivo"].map((item) => (
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
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Sua configuração leve</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Nada de renda, regime fiscal ou fonte pagadora nesta etapa.
            </p>
          </div>

          <div className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Perfil de acesso
              </legend>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1.5">
                <RoleChoice
                  active={selectedRole === "doctor"}
                  icon={<Stethoscope className="h-4 w-4" />}
                  label="Sou Médico"
                  description="Quero lançar plantões"
                  onClick={() => setSelectedRole("doctor")}
                />
                <RoleChoice
                  active={selectedRole === "accountant"}
                  icon={<Calculator className="h-4 w-4" />}
                  label="Sou Contador"
                  description="Quero aceitar clientes"
                  onClick={() => setSelectedRole("accountant")}
                />
              </div>
            </fieldset>

            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                {isAccountant ? "Nome do contador" : "Nome"}
              </span>
              <input
                autoFocus
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder={isAccountant ? "Ex: Vinicius Contábil" : "Ex: Dra. Thais Ruiz"}
                className={inputCls}
              />
            </label>

            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {isAccountant ? <Calculator className="h-3.5 w-3.5" /> : <Stethoscope className="h-3.5 w-3.5" />}
                {isAccountant ? "Área de atuação" : "Especialidade médica"}
              </span>
              <input
                value={specialtyName}
                onChange={(event) => setSpecialtyName(event.target.value)}
                placeholder={isAccountant ? "Ex: Contabilidade médica" : "Ex: Anestesiologia"}
                className={inputCls}
              />
            </label>

            {!isAccountant && (
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

          <button
            type="button"
            onClick={finishOnboarding}
            disabled={!isValid || saving}
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_0_28px_rgba(15,118,110,0.18)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{isAccountant ? "Entrar no Painel Contábil" : "Entrar no Dashboard"} <ArrowRight className="h-4 w-4" /></>}
          </button>
        </div>
      </section>
    </main>
  );
}

const inputCls = "w-full min-h-12 rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25";

function RoleChoice({
  active,
  icon,
  label,
  description,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 items-center gap-2 rounded-xl px-3 py-2 text-left transition-all duration-200 ${
        active
          ? "border border-primary/55 bg-primary/15 text-foreground shadow-[0_0_24px_rgba(15,118,110,0.16)]"
          : "border border-transparent text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
      }`}
    >
      <span className={active ? "text-primary" : "text-muted-foreground"}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
