// Server functions para configurações globais das lojas.
// Leitura: qualquer usuário autenticado. Escrita: apenas MASTER.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StoreOverrideDTO = Record<string, unknown>;

export const fetchStoreConfigs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("store_config")
      .select("store_id, data");
    if (error) throw new Error(error.message);
    const map: Record<string, StoreOverrideDTO> = {};
    for (const row of data ?? []) {
      map[row.store_id] = (row.data as StoreOverrideDTO) ?? {};
    }
    return map;
  });

export const saveStoreConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const d = raw as { storeId?: string; data?: StoreOverrideDTO };
    if (!d?.storeId || typeof d.storeId !== "string") throw new Error("storeId requerido");
    return { storeId: d.storeId, data: (d.data ?? {}) as StoreOverrideDTO };
  })
  .handler(async ({ context, data }) => {
    // Verifica master via has_role
    const { data: isMasterRes, error: rpcErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "master",
    });
    if (rpcErr) throw new Error(rpcErr.message);
    if (!isMasterRes) throw new Error("Apenas o perfil MASTER pode salvar configurações.");

    const { error } = await context.supabase
      .from("store_config")
      .upsert(
        {
          store_id: data.storeId,
          data: data.data,
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetStoreConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const d = raw as { storeId?: string };
    if (!d?.storeId) throw new Error("storeId requerido");
    return { storeId: d.storeId };
  })
  .handler(async ({ context, data }) => {
    const { data: isMasterRes } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "master",
    });
    if (!isMasterRes) throw new Error("Apenas o perfil MASTER pode restaurar configurações.");
    const { error } = await context.supabase
      .from("store_config")
      .delete()
      .eq("store_id", data.storeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
