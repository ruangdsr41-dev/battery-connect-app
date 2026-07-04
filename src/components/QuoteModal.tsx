import { useEffect, useRef, useState } from "react";
import { X, FileDown, Image as ImageIcon, Trash2, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import batproLogo from "@/assets/batpro-logo.png.asset.json";

import {
  listQuote,
  removeFromQuote,
  setQty,
  clearQuote,
  QUOTE_EVENT,
  type QuoteItem,
} from "@/lib/quote-store";
import { STORE_LIST, STORES, type StoreId } from "@/lib/stores";

function parseNumber(v?: string): number {
  if (!v) return NaN;
  const n = Number(String(v).replace(/[^\d,.\-]/g, "").replace(",", "."));
  return isFinite(n) ? n : NaN;
}
function formatBRL(v?: string | number): string {
  const n = typeof v === "number" ? v : parseNumber(v);
  if (!isFinite(n)) return typeof v === "string" ? v : "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function QuoteModal({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<QuoteItem[]>(() => listQuote());
  const [storeId, setStoreId] = useState<StoreId>("disk");
  const [cliente, setCliente] = useState("");
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState<"pdf" | "png" | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setItems(listQuote());
    window.addEventListener(QUOTE_EVENT, sync);
    return () => window.removeEventListener(QUOTE_EVENT, sync);
  }, []);

  const total = items.reduce((acc, it) => {
    const p = parseNumber(it.precoVenda);
    return acc + (isFinite(p) ? p * it.qty : 0);
  }, 0);

  async function renderCanvas(): Promise<HTMLCanvasElement | null> {
    if (!printRef.current) return null;
    return html2canvas(printRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
    });
  }

  async function exportPNG() {
    setBusy("png");
    try {
      const canvas = await renderCanvas();
      if (!canvas) return;
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `orcamento-${store.id}-${Date.now()}.png`;
      a.click();
    } finally {
      setBusy(null);
    }
  }

  async function exportPDF() {
    setBusy("pdf");
    try {
      const canvas = await renderCanvas();
      if (!canvas) return;
      const img = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 40;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = 20;
      let remaining = imgH;
      // Se couber em uma página, adiciona direto; senão pagina.
      if (imgH <= pageH - 40) {
        pdf.addImage(img, "JPEG", 20, y, imgW, imgH);
      } else {
        // Estratégia simples: cortar a imagem em canvas temporários por página.
        const pxPerPage = ((pageH - 40) * canvas.width) / imgW;
        let sy = 0;
        while (remaining > 0) {
          const sliceH = Math.min(pxPerPage, canvas.height - sy);
          const tmp = document.createElement("canvas");
          tmp.width = canvas.width;
          tmp.height = sliceH;
          const ctx = tmp.getContext("2d")!;
          ctx.drawImage(canvas, 0, sy, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const slice = tmp.toDataURL("image/jpeg", 0.92);
          const sH = (sliceH * imgW) / canvas.width;
          pdf.addImage(slice, "JPEG", 20, 20, imgW, sH);
          sy += sliceH;
          remaining -= sH;
          if (remaining > 0) pdf.addPage();
        }
      }
      pdf.save(`orcamento-${store.id}-${Date.now()}.pdf`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-elevated sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
          <div>
            <h2 className="font-display text-lg font-bold">Orçamento Profissional</h2>
            <p className="text-xs text-muted-foreground">
              {items.length} {items.length === 1 ? "item selecionado" : "itens selecionados"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-4 border-b border-border bg-muted/30 px-4 py-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-muted-foreground">
              Loja emissora
            </span>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value as StoreId)}
              className="rounded-md border border-border bg-card px-2 py-2 text-sm"
            >
              {STORE_LIST.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-muted-foreground">
              Cliente (opcional)
            </span>
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nome do cliente"
              className="rounded-md border border-border bg-card px-2 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-muted-foreground">
              Observações
            </span>
            <input
              type="text"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Ex.: pagamento à vista, entrega hoje…"
              className="rounded-md border border-border bg-card px-2 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto bg-neutral-100 p-4 dark:bg-neutral-900">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Nenhum item selecionado. Marque produtos no Catálogo para começar.
            </div>
          ) : (
            <QuotePreview
              ref={printRef}
              items={items}
              cliente={cliente}
              obs={obs}
              storeId={storeId}
              total={total}
              onQty={(sku, q) => {
                setQty(sku, q);
                setItems(listQuote());
              }}
              onRemove={(sku) => {
                removeFromQuote(sku);
                setItems(listQuote());
              }}
            />
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-3">
          <button
            type="button"
            onClick={() => {
              if (confirm("Limpar todos os itens do orçamento?")) {
                clearQuote();
                setItems([]);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive"
            disabled={!items.length}
          >
            <Trash2 className="h-3.5 w-3.5" /> Limpar
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportPNG}
              disabled={!items.length || !!busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold hover:border-primary/40 disabled:opacity-50"
            >
              {busy === "png" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
              PNG
            </button>
            <button
              type="button"
              onClick={exportPDF}
              disabled={!items.length || !!busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy === "pdf" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              PDF
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// -------- Preview renderizado (fonte do html2canvas) --------

import { forwardRef } from "react";

const QuotePreview = forwardRef<
  HTMLDivElement,
  {
    items: QuoteItem[];
    cliente: string;
    obs: string;
    storeId: StoreId;
    total: number;
    onQty: (sku: string, qty: number) => void;
    onRemove: (sku: string) => void;
  }
>(function QuotePreview({ items, cliente, obs, storeId, total, onQty, onRemove }, ref) {
  const store = STORES[storeId];
  const now = new Date();
  const dataStr = now.toLocaleDateString("pt-BR");
  const validade = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR");

  return (
    <div
      ref={ref}
      className="mx-auto w-full max-w-3xl bg-white text-neutral-900 shadow-lg"
      style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}
    >
      {/* Cabeçalho da loja */}
      <div
        style={{
          background: `linear-gradient(135deg, ${store.colors.primary} 0%, ${store.colors.primary} 65%, ${store.colors.secondary} 100%)`,
          color: store.colors.text,
        }}
        className="flex items-center justify-between px-6 py-5"
      >
        <div>
          <div
            className="text-2xl font-black tracking-wide"
            style={{ letterSpacing: "0.04em" }}
          >
            {store.wordmark}
          </div>
          <div className="mt-1 text-xs opacity-90">{store.vibe}</div>
        </div>
        <div className="text-right text-xs leading-relaxed">
          <div className="font-semibold">Tel/WhatsApp</div>
          <div>{store.telefone}</div>
          <div className="mt-1 opacity-80">Emitido em {dataStr}</div>
          <div className="opacity-80">Válido até {validade}</div>
        </div>
      </div>

      {/* Faixa secundária */}
      <div
        style={{ background: store.colors.secondary, color: store.colors.primary }}
        className="px-6 py-2 text-xs font-bold uppercase tracking-widest"
      >
        Orçamento · {items.length} {items.length === 1 ? "item" : "itens"}
        {cliente ? ` · Cliente: ${cliente}` : ""}
      </div>

      {/* Tabela */}
      <div className="p-6">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr
              style={{ background: store.colors.primary, color: store.colors.text }}
              className="text-left"
            >
              <th className="px-2 py-2">Foto</th>
              <th className="px-2 py-2">SKU / Descrição</th>
              <th className="px-2 py-2 text-center">Ah</th>
              <th className="px-2 py-2 text-center">CCA</th>
              <th className="px-2 py-2 text-center">Gar.</th>
              <th className="px-2 py-2 text-center">Qtd</th>
              <th className="px-2 py-2 text-right">Unit.</th>
              <th className="px-2 py-2 text-right">Total</th>
              <th className="px-2 py-2 no-print"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const unit = parseNumber(it.precoVenda);
              const linha = isFinite(unit) ? unit * it.qty : NaN;
              return (
                <tr key={it.sku} className="border-b border-neutral-200 align-top">
                  <td className="px-2 py-2">
                    <img
                      src={sanitizeUrl(it.imagemUrl) ?? batproLogo.url}
                      alt={it.sku}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = batproLogo.url;
                      }}
                      style={{ width: 46, height: 46, objectFit: "contain" }}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="font-bold">{it.sku}</div>
                    <div className="text-neutral-600">
                      {[it.marca, it.modelo].filter(Boolean).join(" · ")}
                    </div>
                    {it.descricao && (
                      <div className="text-[11px] text-neutral-500">{it.descricao}</div>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center">{it.amperagem || "—"}</td>
                  <td className="px-2 py-2 text-center">{it.cca || "—"}</td>
                  <td className="px-2 py-2 text-center">{it.garantia || "—"}</td>
                  <td className="px-2 py-2 text-center">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={it.qty}
                      onChange={(e) => onQty(it.sku, Number(e.target.value))}
                      className="w-14 rounded border border-neutral-300 px-1 py-0.5 text-center text-[12px]"
                    />
                  </td>
                  <td className="px-2 py-2 text-right">{formatBRL(it.precoVenda)}</td>
                  <td className="px-2 py-2 text-right font-semibold">
                    {isFinite(linha) ? formatBRL(linha) : "—"}
                  </td>
                  <td className="px-2 py-2 no-print">
                    <button
                      type="button"
                      onClick={() => onRemove(it.sku)}
                      className="text-neutral-400 hover:text-red-600"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} className="px-2 py-3 text-right text-[13px] font-semibold">
                Total estimado
              </td>
              <td
                className="px-2 py-3 text-right text-[15px] font-black"
                style={{ color: store.colors.primary }}
              >
                {formatBRL(total)}
              </td>
              <td className="no-print" />
            </tr>
          </tfoot>
        </table>

        {obs && (
          <div
            className="mt-4 rounded border-l-4 px-3 py-2 text-[11px] text-neutral-700"
            style={{ borderColor: store.colors.primary, background: "#f7f7f7" }}
          >
            <strong>Observações:</strong> {obs}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t pt-3 text-[10px] text-neutral-500">
          <span>Orçamento gerado por BATPRO — valores sujeitos a alteração sem aviso prévio.</span>
          <span>{store.nome}</span>
        </div>
      </div>
    </div>
  );
});

function sanitizeUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  const s = String(u).trim();
  if (!s || /^data:/i.test(s) || !/^https?:\/\//i.test(s)) return undefined;
  const drive = s.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (drive) return `https://drive.google.com/uc?export=view&id=${drive[1]}`;
  return s;
}
