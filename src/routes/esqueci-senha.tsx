import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/esqueci-senha")({
  head: () => ({ meta: [{ title: "Recuperar senha — Moura" }] }),
  component: Page,
});

function Page() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-2xl font-bold">Recuperar senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enviaremos um link de redefinição para seu e-mail.
        </p>

        {sent ? (
          <div className="mt-6 rounded-lg border border-success/40 bg-success/10 p-4 text-sm">
            Link enviado para <strong>{email}</strong>. Verifique sua caixa de entrada.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-12 w-full rounded-lg border border-border bg-card px-3 outline-none focus:border-primary"
            />
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar link
            </button>
          </form>
        )}

        <Link to="/auth" className="mt-6 inline-block text-sm text-primary hover:underline">
          ← Voltar para o login
        </Link>
      </div>
    </div>
  );
}
