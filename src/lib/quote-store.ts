import type { CatalogProduct } from "@/lib/sheet.functions";

const KEY = "batpro:quote-selection:v1";
const EVT = "batpro:quote-change";

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
  precoVenda?: string;
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

export function isInQuote(sku: string): boolean {
  if (!sku) return false;
  return !!read()[sku];
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

export function removeFromQuote(sku: string) {
  const map = read();
  delete map[sku];
  write(map);
}

export function clearQuote() {
  write({});
}

export const QUOTE_EVENT = EVT;
