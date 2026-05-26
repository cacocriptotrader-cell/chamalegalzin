import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { DocFinLogo } from "@/components/DocFinLogo";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const PRODUCTION_APP_ORIGIN = "https://blank-canvas-page-94b35c36.vercel.app";
type ProfileRole = "doctor" | "accountant";

function getOAuthRedirectUrl() {
  const configuredOrigin = import.meta.env.VITE_APP_URL?.replace(/\/$/, "");
  if (configuredOrigin) return `${configuredOrigin}/dashboard`;

  if (window.location.hostname.endsWith("lovable.app")) {
    return `${PRODUCTION_APP_ORIGIN}/dashboard`;
  }

  return `${window.location.origin}/dashboard`;
}

async function getAuthenticatedHome(userId: string): Promise<"/contador" | "/dashboard"> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar perfil para redirecionamento:", error);
    return "/dashboard";
  }

  const role: ProfileRole = profile?.role === "accountant" ? "accountant" : "doctor";
  return role === "accountant" ? "/contador" : "/dashboard";
}

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const navigate = useNavigate();

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getOAuthRedirectUrl(),
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === "login") {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        const userId = data.user?.id;
        if (!userId) throw new Error("Sessão autenticada sem usuário retornado.");
        navigate({ to: await getAuthenticatedHome(userId), replace: true });
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;
        if (!data.session) {
          setInfo("Verifique seu e-mail para confirmar o cadastro.");
          return;
        }
        const userId = data.user?.id;
        if (!userId) throw new Error("Cadastro autenticado sem usuário retornado.");
        navigate({ to: await getAuthenticatedHome(userId), replace: true });
      }
    } catch (err: any) {
      setError(err.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-background text-foreground">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-12">
          <DocFinLogo className="h-8 w-[116px]" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-l border-border pl-2 ml-1">
            Wealth
          </span>
        </div>

        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            {mode === "login" ? "Bem-vindo de volta" : "Criar sua conta"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" 
              ? "Acesse seu terminal de wealth management." 
              : "Comece sua jornada de liberdade financeira."}
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 h-12 px-6 rounded-xl border border-border bg-transparent text-foreground text-sm font-medium hover:bg-secondary/60 disabled:opacity-50 transition-all duration-200"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
              />
            </svg>
            Continuar com o Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
              <Mail className="h-3 w-3" /> E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-card border border-border rounded-xl h-12 px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
              <Lock className="h-3 w-3" /> Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-card border border-border rounded-xl h-12 px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
              {error}
            </p>
          )}

          {info && (
            <p className="text-xs text-success bg-success/10 border border-success/20 rounded-lg p-3">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all duration-200"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {mode === "login" ? "Entrar" : "Cadastrar"}
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "login" 
              ? "Não tem uma conta? Cadastre-se" 
              : "Já tem uma conta? Faça login"}
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground mt-12 font-mono text-center">
          v1.0 · infraestrutura segura via Supabase
        </p>
      </div>
    </div>
  );
}
