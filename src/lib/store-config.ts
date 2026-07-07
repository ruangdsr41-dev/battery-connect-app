// Cache global das configurações de loja (compartilhadas entre todos os usuários).
// Fonte da verdade: tabela public.store_config. Aqui mantemos um snapshot em
// memória para leituras síncronas de UI (getStore/getAllStores) e disparamos
// STORE_CONFIG_EVENT quando o snapshot é atualizado.
import { STORES, STORE_LIST, type StoreId, type StoreIdentity } from "@/lib/stores";
import {
  fetchStoreConfigs,
  saveStoreConfig as saveStoreConfigFn,
  resetStoreConfig as resetStoreConfigFn,
} from "@/lib/store-config.functions";

export const STORE_CONFIG_EVENT = "batpro:store-config-change";

export type StoreOverride = Partial<
  Pick<
    StoreIdentity,
    | "nome"
    | "telefone"
    | "whatsapp"
    | "vibe"
    | "logoUrl"
    | "wordmark"
    | "whatsappIntro"
    | "whatsappOutro"
    | "footerConditions"
    | "endereco"
    | "cnpj"
  >
>;

type Snapshot = Partial<Record<StoreId, StoreOverride>>;

let snapshot: Snapshot = {};
let loaded = false;
let inFlight: Promise<void> | null = null;

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORE_CONFIG_EVENT));
  }
}

export async function loadStoreConfigs(force = false): Promise<void> {
  if (loaded && !force) return;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const map = await fetchStoreConfigs();
      snapshot = (map ?? {}) as Snapshot;
      loaded = true;
      notify();
    } catch (err) {
      console.warn("[BATPRO] Falha ao carregar store_config:", err);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function getStore(id: StoreId): StoreIdentity {
  const base = STORES[id];
  const patch = snapshot[id] ?? {};
  return { ...base, ...patch } as StoreIdentity;
}

export function getAllStores(): StoreIdentity[] {
  return STORE_LIST.map((s) => getStore(s.id));
}

export async function saveStore(id: StoreId, patch: StoreOverride): Promise<void> {
  const merged: StoreOverride = { ...(snapshot[id] ?? {}), ...patch };
  await saveStoreConfigFn({ data: { storeId: id, data: merged } });
  snapshot = { ...snapshot, [id]: merged };
  notify();
}

export async function resetStore(id: StoreId): Promise<void> {
  await resetStoreConfigFn({ data: { storeId: id } });
  const next = { ...snapshot };
  delete next[id];
  snapshot = next;
  notify();
}
