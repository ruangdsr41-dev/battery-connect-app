// Utilitários de preço compartilhados (BRL).

export function parseBRL(v?: string | number | null): number {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "number") return isFinite(v) ? v : NaN;
  let s = String(v).trim();
  if (!s) return NaN;
  // Mantém apenas dígitos, vírgula, ponto e menos.
  s = s.replace(/[^\d,.\-]/g, "");
  // Trata separador brasileiro "1.234,56": ponto = milhar, vírgula = decimal.
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return isFinite(n) ? n : NaN;
}

export function formatBRL(v?: string | number | null): string {
  const n = typeof v === "number" ? v : parseBRL(v);
  if (!isFinite(n)) return typeof v === "string" && v ? v : "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
