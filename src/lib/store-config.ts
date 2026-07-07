// Persistência das configurações de orçamento por loja (aba Configurações).
// Cada loja mantém overrides sobre os defaults em src/lib/stores.ts.
import { STORES, STORE_LIST, type StoreId, type StoreIdentity } from "@/lib/stores";

const KEY = "batpro:store-config:v1";
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
  >
>;

type Store = Record<StoreId, StoreOverride>;

function read(): Store {
  if (typeof window === "undefined") return {} as Store;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : ({} as Store);
  } catch {
    return {} as Store;
  }
}

function write(map: Store) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent(STORE_CONFIG_EVENT));
  } catch {
    /* noop */
  }
}

export function getStore(id: StoreId): StoreIdentity {
  const base = STORES[id];
  const patch = read()[id] ?? {};
  return { ...base, ...patch } as StoreIdentity;
}

export function getAllStores(): StoreIdentity[] {
  return STORE_LIST.map((s) => getStore(s.id));
}

export function saveStore(id: StoreId, patch: StoreOverride) {
  const map = read();
  map[id] = { ...(map[id] ?? {}), ...patch };
  write(map);
}

export function resetStore(id: StoreId) {
  const map = read();
  delete map[id];
  write(map);
}
