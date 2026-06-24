import type { BatteryApplication } from "./sheet.functions";

const FAV_KEY = "moura:favorites:v1";
const HIST_KEY = "moura:history:v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("moura:storage", { detail: { key } }));
  } catch {
    /* ignore quota */
  }
}

export function favKey(a: BatteryApplication) {
  return `${a.category}|${a.marca}|${a.modelo}|${a.ano}|${a.codigoMoura}`;
}

export function getFavorites(): BatteryApplication[] {
  return read<BatteryApplication[]>(FAV_KEY, []);
}

export function isFavorite(a: BatteryApplication) {
  const k = favKey(a);
  return getFavorites().some((f) => favKey(f) === k);
}

export function toggleFavorite(a: BatteryApplication) {
  const k = favKey(a);
  const cur = getFavorites();
  const next = cur.some((f) => favKey(f) === k)
    ? cur.filter((f) => favKey(f) !== k)
    : [a, ...cur].slice(0, 200);
  write(FAV_KEY, next);
  return next;
}

export interface HistoryEntry {
  q: string;
  category: string;
  ts: number;
}

export function getHistory(): HistoryEntry[] {
  return read<HistoryEntry[]>(HIST_KEY, []);
}

export function pushHistory(entry: Omit<HistoryEntry, "ts">) {
  if (!entry.q.trim()) return;
  const cur = getHistory().filter(
    (h) => !(h.q === entry.q && h.category === entry.category),
  );
  const next = [{ ...entry, ts: Date.now() }, ...cur].slice(0, 20);
  write(HIST_KEY, next);
}

export function useStorageVersion() {
  // Returns a number that increments when local storage changes,
  // so components can react without prop drilling.
  if (typeof window === "undefined") return 0;
  return 0;
}
