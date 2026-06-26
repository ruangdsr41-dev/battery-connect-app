import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AuditEvent =
  | "login"
  | "login_failed"
  | "search"
  | "search_empty"
  | "sheet_refresh"
  | "pdf_export"
  | "whatsapp_share"
  | "placa_lookup"
  | "user_created"
  | "user_disabled"
  | "user_enabled"
  | "user_deleted"
  | "role_changed"
  | "password_reset_sent";

export const logEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { event: AuditEvent; payload?: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    await supabase.from("audit_log").insert({
      user_id: userId,
      user_email: (claims as { email?: string }).email ?? null,
      event: data.event,
      payload: (data.payload ?? {}) as never,
    });
    return { ok: true };
  });

export interface DashboardMetrics {
  totalHoje: number;
  total7d: number;
  total30d: number;
  buscasSemResultado: number;
  atualizacoesPlanilha: number;
  usuariosAtivos: number;
  topTermos: Array<{ termo: string; total: number }>;
  topBaterias: Array<{ codigo: string; total: number }>;
  topUsuarios: Array<{ email: string; total: number }>;
  buscasPorHora: Array<{ hora: number; total: number }>;
  semResultado: Array<{ termo: string; quando: string }>;
}

export const getDashboardMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardMetrics> => {
    const { supabase, userId } = context;
    const { data: isMasterData } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "master",
    });
    if (!isMasterData) throw new Error("Forbidden");

    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: events } = await supabase
      .from("audit_log")
      .select("event, payload, user_email, created_at")
      .gte("created_at", since30)
      .limit(10000);

    const all = events ?? [];
    const now = Date.now();
    const inWindow = (h: number) => (e: { created_at: string }) =>
      now - new Date(e.created_at).getTime() < h * 3600000;

    const searches = all.filter((e) => e.event === "search");
    const empty = all.filter((e) => e.event === "search_empty");

    const countTermos = new Map<string, number>();
    const countBaterias = new Map<string, number>();
    const countUsuarios = new Map<string, number>();
    const horaBuckets = new Array(24).fill(0);

    for (const e of searches) {
      const p = (e.payload ?? {}) as { termo?: string; codigo?: string };
      if (p.termo) countTermos.set(p.termo, (countTermos.get(p.termo) ?? 0) + 1);
      if (p.codigo) countBaterias.set(p.codigo, (countBaterias.get(p.codigo) ?? 0) + 1);
      if (e.user_email) countUsuarios.set(e.user_email, (countUsuarios.get(e.user_email) ?? 0) + 1);
      const h = new Date(e.created_at).getHours();
      horaBuckets[h]++;
    }

    const topN = (m: Map<string, number>, n: number) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

    return {
      totalHoje: searches.filter(inWindow(24)).length,
      total7d: searches.filter(inWindow(24 * 7)).length,
      total30d: searches.length,
      buscasSemResultado: empty.length,
      atualizacoesPlanilha: all.filter((e) => e.event === "sheet_refresh").length,
      usuariosAtivos: new Set(all.map((e) => e.user_email).filter(Boolean)).size,
      topTermos: topN(countTermos, 10).map(([termo, total]) => ({ termo, total })),
      topBaterias: topN(countBaterias, 10).map(([codigo, total]) => ({ codigo, total })),
      topUsuarios: topN(countUsuarios, 10).map(([email, total]) => ({ email, total })),
      buscasPorHora: horaBuckets.map((total, hora) => ({ hora, total })),
      semResultado: empty
        .slice(-30)
        .reverse()
        .map((e) => ({
          termo: ((e.payload ?? {}) as { termo?: string }).termo ?? "",
          quando: e.created_at,
        })),
    };
  });

export const getRecentEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isMasterData } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "master",
    });
    if (!isMasterData) throw new Error("Forbidden");
    const { data } = await supabase
      .from("audit_log")
      .select("id, event, payload, user_email, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    return { rows: data ?? [] };
  });
