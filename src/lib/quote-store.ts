import type { CatalogProduct } from "@/lib/sheet.functions";

const KEY = "batpro:quote-selection:v2";
const EVT = "batpro:quote-change";

/**
 * QuoteItem armazena um SNAPSHOT do produto no momento da adição.
 * Edições feitas no orçamento (qty, precoOverride) NUNCA afetam o catálogo
 * porque este objeto é uma cópia isolada em localStorage.
 */
export interface QuoteItem {
  sku: string;
  marca?: string;
  modelo?: string;
  descricao?: string;
  categoria?: string;
  tecnologia?: string;
  amperagem?: string;
  cca?: string;
  tensao?: string;
  garantia?: string;
  precoVenda?: string;      // preço original (imutável — snapshot do catálogo)
  precoOverride?: number;   // preço editado APENAS no orçamento
  imagemUrl?: string;
  qty: number;
}

function read(): Record<string, QuoteItem> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, QuoteItem>) : {};
  } catch {
    return {};
  }
}

function write(map: Record<string, QuoteItem>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    // ignore
  }
}

export function listQuote(): QuoteItem[] {
  return Object.values(read());
}

export function isInQuote(sku?: string): boolean {
  if (!sku) return false;
  return !!read()[sku];
}

function snapshot(p: CatalogProduct): QuoteItem {
  return {
    sku: p.sku,
    marca: p.marca,
    modelo: p.modelo,
    descricao: p.descricao,
    categoria: p.categoria,
    tecnologia: p.tecnologia,
    amperagem: p.amperagem,
    cca: p.cca,
    tensao: p.tensao,
    garantia: p.garantia,
    precoVenda: p.precoVenda,
    imagemUrl: p.imagemUrl,
    qty: 1,
  };
}

export function addToQuote(p: CatalogProduct): boolean {
  if (!p.sku) return false;
  const map = read();
  if (map[p.sku]) return false;
  map[p.sku] = snapshot(p);
  write(map);
  return true;
}

export function addManyToQuote(list: CatalogProduct[]): number {
  const map = read();
  let added = 0;
  for (const p of list) {
    if (!p.sku || map[p.sku]) continue;
    map[p.sku] = snapshot(p);
    added += 1;
  }
  if (added) write(map);
  return added;
}

export function removeManyFromQuote(skus: string[]): number {
  const map = read();
  let removed = 0;
  for (const s of skus) {
    if (map[s]) {
      delete map[s];
      removed += 1;
    }
  }
  if (removed) write(map);
  return removed;
}

export function toggleQuote(p: CatalogProduct): boolean {
  if (!p.sku) return false;
  const map = read();
  if (map[p.sku]) {
    delete map[p.sku];
    write(map);
    return false;
  }
  map[p.sku] = {
    sku: p.sku,
    marca: p.marca,
    modelo: p.modelo,
    descricao: p.descricao,
    categoria: p.categoria,
    tecnologia: p.tecnologia,
    amperagem: p.amperagem,
    cca: p.cca,
    tensao: p.tensao,
    garantia: p.garantia,
    precoVenda: p.precoVenda,
    imagemUrl: p.imagemUrl,
    qty: 1,
  };
  write(map);
  return true;
}

export function setQty(sku: string, qty: number) {
  const map = read();
  if (map[sku]) {
    map[sku].qty = Math.max(1, Math.min(999, qty | 0));
    write(map);
  }
}

export function setPriceOverride(sku: string, price: number | undefined) {
  const map = read();
  if (map[sku]) {
    if (price === undefined || !isFinite(price)) {
      delete map[sku].precoOverride;
    } else {
      map[sku].precoOverride = Math.max(0, price);
    }
    write(map);
  }
}

export function removeFromQuote(sku: string) {
  const map = read();
  delete map[sku];
  write(map);
}

export function clearQuote() {
  write({});
}

export const QUOTE_EVENT = EVT;
