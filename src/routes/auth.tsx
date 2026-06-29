import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/audit.functions";
import batproLogo from "@/assets/batpro-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    disabled: typeof s.disabled === "string" ? s.disabled : undefined,
    signup: typeof s.signup === "string" ? s.signup : undefined,
  }),
  head: () => ({ meta: [{ title: "Entrar — BatPro" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { disabled, signup } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">(signup ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    disabled ? "Sua conta está desativada. Fale com o administrador." : null,
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: e1 } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nome },
            emailRedirectTo: window.location.origin,
          },
        });
        if (e1) throw e1;
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        if (e2) throw e2;
        await logEvent({ data: { event: "user_created", payload: { email } } }).catch(() => {});
        navigate({ to: "/" });
      } else {
        const { error: e1 } = await supabase.auth.signInWithPassword({ email, password });
        if (e1) {
          await logEvent({ data: { event: "login_failed", payload: { email } } }).catch(() => {});
          throw e1;
        }
        await logEvent({ data: { event: "login", payload: { email } } }).catch(() => {});
        await supabase
          .from("profiles")
          .update({ ultimo_acesso: new Date().toISOString() })
          .eq("email", email);
        navigate({ to: "/" });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="brand-gradient p-6 text-white">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3">
          <img
            src={batproLogo.url}
            alt="BatPro"
            className="h-28 w-28 rounded-2xl object-contain drop-shadow-xl"
          />
          <div className="text-center">
            <div className="font-display text-2xl font-bold tracking-wide">BATPRO</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/70">
              Consulta de Aplicações
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <h1 className="font-display text-2xl font-bold">
          {mode === "login" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login"
            ? "Acesse com suas credenciais."
            : "O primeiro cadastro será o usuário master do sistema."}
        </p>

        {info && (
          <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            {info}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <Field
              label="Nome"
              value={nome}
              onChange={setNome}
              type="text"
              autoComplete="name"
              required
            />
          )}
          <Field
            label="E-mail"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="email"
            required
          />
          <Field
            label="Senha"
            value={password}
            onChange={setPassword}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
          />

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-primary hover:underline"
          >
            {mode === "login" ? "Criar conta" : "Já tenho conta"}
          </button>
          <Link to="/esqueci-senha" className="text-muted-foreground hover:text-foreground">
            Esqueci a senha
          </Link>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  const { value, onChange, ...rest } = props;
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-12 w-full rounded-lg border border-border bg-card px-3 outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}
