import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureMaster(supabase: ReturnType<typeof Object> & { rpc: Function }, userId: string) {
  // typed loosely to keep this small
  const { data } = await (supabase as any).rpc("has_role", {
    _user_id: userId,
    _role: "master",
  });
  if (!data) throw new Error("Forbidden");
}

export interface AdminUser {
  id: string;
  email: string;
  nome: string | null;
  ativo: boolean;
  ultimo_acesso: string | null;
  created_at: string;
  role: "master" | "padrao";
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ users: AdminUser[] }> => {
    const { supabase, userId } = context;
    await ensureMaster(supabase as any, userId);

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      (supabase as any)
        .from("profiles")
        .select("id, email, nome, ativo, ultimo_acesso, created_at")
        .order("created_at", { ascending: false }),
      (supabase as any).from("user_roles").select("user_id, role"),
    ]);

    const roleMap = new Map<string, "master" | "padrao">();
    for (const r of roles ?? []) roleMap.set(r.user_id, r.role);

    return {
      users: (profiles ?? []).map((p: any) => ({
        ...p,
        role: roleMap.get(p.id) ?? "padrao",
      })),
    };
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; nome: string; role: "master" | "padrao" }) => d)
  .handler(async ({ data, context }) => {
    await ensureMaster(context.supabase as any, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar");

    if (data.role === "master") {
      await (supabaseAdmin as any)
        .from("user_roles")
        .upsert({ user_id: created.user.id, role: "master" }, { onConflict: "user_id,role" });
      await (supabaseAdmin as any)
        .from("user_roles")
        .delete()
        .eq("user_id", created.user.id)
        .eq("role", "padrao");
    }

    await (context.supabase as any).from("audit_log").insert({
      user_id: context.userId,
      user_email: (context.claims as any).email,
      event: "user_created",
      payload: { email: data.email, role: data.role },
    });
    return { ok: true, id: created.user.id };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "master" | "padrao" }) => d)
  .handler(async ({ data, context }) => {
    await ensureMaster(context.supabase as any, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const other = data.role === "master" ? "padrao" : "master";
    await (supabaseAdmin as any)
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", other);
    await (supabaseAdmin as any)
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    await (context.supabase as any).from("audit_log").insert({
      user_id: context.userId,
      user_email: (context.claims as any).email,
      event: "role_changed",
      payload: { target: data.userId, role: data.role },
    });
    return { ok: true };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; ativo: boolean }) => d)
  .handler(async ({ data, context }) => {
    await ensureMaster(context.supabase as any, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any)
      .from("profiles")
      .update({ ativo: data.ativo })
      .eq("id", data.userId);
    await (context.supabase as any).from("audit_log").insert({
      user_id: context.userId,
      user_email: (context.claims as any).email,
      event: data.ativo ? "user_enabled" : "user_disabled",
      payload: { target: data.userId },
    });
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureMaster(context.supabase as any, context.userId);
    if (data.userId === context.userId) throw new Error("Não é possível excluir você mesmo");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await (context.supabase as any).from("audit_log").insert({
      user_id: context.userId,
      user_email: (context.claims as any).email,
      event: "user_deleted",
      payload: { target: data.userId },
    });
    return { ok: true };
  });

export const sendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureMaster(context.supabase as any, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).auth.admin.generateLink({
      type: "recovery",
      email: data.email,
    });
    if (error) throw new Error(error.message);
    await (context.supabase as any).from("audit_log").insert({
      user_id: context.userId,
      user_email: (context.claims as any).email,
      event: "password_reset_sent",
      payload: { email: data.email },
    });
    return { ok: true };
  });
