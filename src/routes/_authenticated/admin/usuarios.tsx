import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Mail, Trash2, ShieldCheck, ShieldOff, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  listUsers,
  createUser,
  setUserRole,
  setUserActive,
  deleteUser,
  sendPasswordReset,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Moura" }] }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { isMaster, nome, user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsers(),
  });

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function withBusy(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
      await refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell isMaster={isMaster} nome={nome}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie quem acessa o sistema e os papéis.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Novo
        </button>
      </div>

      {isLoading || !data ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando…
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Usuário</th>
                <th className="px-3 py-2 text-left">Papel</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Último acesso</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => {
                const isSelf = u.id === user.id;
                return (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{u.nome ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          u.role === "master"
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs ${u.ativo ? "text-success" : "text-warning"}`}
                      >
                        {u.ativo ? "Ativo" : "Desativado"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {u.ultimo_acesso
                        ? new Date(u.ultimo_acesso).toLocaleString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <IconBtn
                          title={u.role === "master" ? "Tornar padrão" : "Tornar master"}
                          disabled={isSelf || busy === u.id}
                          onClick={() =>
                            withBusy(u.id, () =>
                              setUserRole({
                                data: {
                                  userId: u.id,
                                  role: u.role === "master" ? "padrao" : "master",
                                },
                              }),
                            )
                          }
                        >
                          {u.role === "master" ? (
                            <ShieldOff className="h-4 w-4" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                        </IconBtn>
                        <IconBtn
                          title={u.ativo ? "Desativar" : "Ativar"}
                          disabled={isSelf || busy === u.id}
                          onClick={() =>
                            withBusy(u.id, () =>
                              setUserActive({ data: { userId: u.id, ativo: !u.ativo } }),
                            )
                          }
                        >
                          {u.ativo ? "🚫" : "✅"}
                        </IconBtn>
                        <IconBtn
                          title="Enviar reset de senha"
                          disabled={busy === u.id}
                          onClick={() =>
                            withBusy(u.id, async () => {
                              await sendPasswordReset({ data: { email: u.email } });
                              alert(`Link de reset enviado para ${u.email}`);
                            })
                          }
                        >
                          <Mail className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn
                          title="Excluir"
                          disabled={isSelf || busy === u.id}
                          tone="danger"
                          onClick={() => {
                            if (!confirm(`Excluir ${u.email}?`)) return;
                            withBusy(u.id, () => deleteUser({ data: { userId: u.id } }));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && <CreateModal onClose={() => setOpen(false)} onCreated={refresh} />}
    </AppShell>
  );
}

function IconBtn({
  children,
  tone = "default",
  ...rest
}: {
  children: React.ReactNode;
  tone?: "default" | "danger";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`rounded-md border border-border px-2 py-1 text-xs disabled:opacity-40 ${
        tone === "danger"
          ? "hover:border-destructive/40 hover:text-destructive"
          : "hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"master" | "padrao">("padrao");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createUser({ data: { email, password, nome, role } });
      await onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Novo usuário</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Input label="Nome" value={nome} onChange={setNome} required />
          <Input label="E-mail" value={email} onChange={setEmail} type="email" required />
          <Input
            label="Senha temporária"
            value={password}
            onChange={setPassword}
            type="text"
            required
            minLength={6}
          />
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Papel</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "master" | "padrao")}
              className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3"
            >
              <option value="padrao">Padrão (apenas consulta)</option>
              <option value="master">Master (acesso total)</option>
            </select>
          </label>
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar
          </button>
        </form>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3"
      />
    </label>
  );
}
