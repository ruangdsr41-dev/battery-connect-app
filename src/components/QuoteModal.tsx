import { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import { X, FileDown, Image as ImageIcon, Trash2, Loader2, Copy, Eye, EyeOff, Check } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

import {
  listQuote,
  removeFromQuote,
  setQty,
  setPriceOverride,
  clearQuote,
  QUOTE_EVENT,
  type QuoteItem,
} from "@/lib/quote-store";
import { STORE_LIST, STORES, type StoreId } from "@/lib/stores";
import batproLogo from "@/assets/batpro-logo.png.asset.json";
import { parseBRL, formatBRL } from "@/lib/price";
import { getBatteryImage } from "@/lib/battery-image";
import type { BatteryApplication } from "@/lib/sheet.functions";

function effectivePrice(it: QuoteItem): number {
  if (typeof it.precoOverride === "number" && isFinite(it.precoOverride)) return it.precoOverride;
  return parseBRL(it.precoVenda);
}

function normCat(c?: string): BatteryApplication["category"] {
  const s = (c || "").toLowerCase();
  if (s.includes("moto")) return "motos";
  if (s.includes("caminh") || s.includes("truck") || s.includes("pesad")) return "caminhoes";
  return "carros";
}

function fallbackImageFor(it: QuoteItem): string {
  return getBatteryImage({
    category: normCat(it.categoria),
    tecnologia: it.tecnologia,
  } as BatteryApplication).url;
}

function sanitizeUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  const s = String(u).trim();
  if (!s || /^data:/i.test(s) || !/^https?:\/\//i.test(s)) return undefined;
  const drive = s.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (drive) return `https://drive.google.com/uc?export=view&id=${drive[1]}`;
  return s;
}

function resolvedImage(it: QuoteItem): string {
  return sanitizeUrl(it.imagemUrl) ?? fallbackImageFor(it);
}

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            setTimeout(done, 4000);
          }),
    ),
  );
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}
function slugStore(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function QuoteModal({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<QuoteItem[]>(() => listQuote());
  const [storeId, setStoreId] = useState<StoreId>("disk");
  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [obs, setObs] = useState("");
  const [showTotal, setShowTotal] = useState(true);
  const [busy, setBusy] = useState<"pdf" | "png" | "copy" | null>(null);
  const [copied, setCopied] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setItems(listQuote());
    window.addEventListener(QUOTE_EVENT, sync);
    return () => window.removeEventListener(QUOTE_EVENT, sync);
  }, []);

  const store = STORES[storeId];
  const total = useMemo(
    () =>
      items.reduce((acc, it) => {
        const p = effectivePrice(it);
        return acc + (isFinite(p) ? p * it.qty : 0);
      }, 0),
    [items],
  );

  async function withPrintMode<T>(fn: () => Promise<T>): Promise<T> {
    setPrintMode(true);
    // esperar o React commitar o novo modo
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    try {
      return await fn();
    } finally {
      setPrintMode(false);
    }
  }

  async function exportPNG() {
    setBusy("png");
    try {
      await withPrintMode(async () => {
        const node = printRef.current;
        if (!node) return;
        await waitForImages(node);
        const w = node.scrollWidth;
        const h = node.scrollHeight;
        const dataUrl = await toPng(node, {
          pixelRatio: 2.5,
          backgroundColor: "#ffffff",
          cacheBust: true,
          width: w,
          height: h,
          canvasWidth: w,
          canvasHeight: h,
          style: { transform: "none" },
        });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `Orcamento_${slugStore(store.nome)}_${today()}.png`;
        a.click();
      });
    } catch (err) {
      console.error("[BATPRO] PNG export falhou:", err);
      alert("Não foi possível gerar o PNG.");
    } finally {
      setBusy(null);
    }
  }

  async function exportPDF() {
    setBusy("pdf");
    try {
      await withPrintMode(async () => {
        const node = printRef.current;
        if (!node) return;
        await waitForImages(node);
        const w = node.scrollWidth;
        const h = node.scrollHeight;
        const dataUrl = await toPng(node, {
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          cacheBust: true,
          width: w,
          height: h,
          canvasWidth: w,
          canvasHeight: h,
          style: { transform: "none" },
        });
        const canvas = await dataUrlToCanvas(dataUrl);

        const pdf = new jsPDF({ unit: "pt", format: "a4" });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin = 20;
        const contentW = pageW - margin * 2;
        const contentH = pageH - margin * 2;
        const scale = contentW / canvas.width;
        const totalHeightPt = canvas.height * scale;

        if (totalHeightPt <= contentH) {
          const jpeg = canvas.toDataURL("image/jpeg", 0.94);
          pdf.addImage(jpeg, "JPEG", margin, margin, contentW, totalHeightPt);
        } else {
          const pxPerPage = contentH / scale;
          let sy = 0;
          let pageIdx = 0;
          while (sy < canvas.height) {
            const sliceH = Math.min(pxPerPage, canvas.height - sy);
            const tmp = document.createElement("canvas");
            tmp.width = canvas.width;
            tmp.height = sliceH;
            const ctx = tmp.getContext("2d");
            if (!ctx) break;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, tmp.width, tmp.height);
            ctx.drawImage(canvas, 0, sy, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
            const jpeg = tmp.toDataURL("image/jpeg", 0.94);
            if (pageIdx > 0) pdf.addPage();
            pdf.addImage(jpeg, "JPEG", margin, margin, contentW, sliceH * scale);
            sy += sliceH;
            pageIdx += 1;
          }
        }
        pdf.save(`Orcamento_${slugStore(store.nome)}_${today()}.pdf`);
      });
    } catch (err) {
      console.error("[BATPRO] PDF export falhou:", err);
      alert("Não foi possível gerar o PDF.");
    } finally {
      setBusy(null);
    }
  }

  async function copyWhatsApp() {
    setBusy("copy");
    try {
      const txt = buildWhatsAppText({
        items,
        storeName: store.nome,
        cliente,
        total,
        showTotal,
      });
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[BATPRO] Copy falhou:", err);
      alert("Não foi possível copiar. Tente novamente.");
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
              {showTotal && (
                <>
                  {" · Total "}
                  <strong className="text-foreground">{formatBRL(total)}</strong>
                </>
              )}
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

        <div className="grid gap-3 border-b border-border bg-muted/30 px-4 py-3 md:grid-cols-4">
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
              Cliente
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
              Telefone
            </span>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(71) 9 0000-0000"
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
              telefone={telefone}
              obs={obs}
              storeId={storeId}
              total={total}
              showTotal={showTotal}
              printMode={printMode}
              onQty={(sku, q) => {
                setQty(sku, q);
                setItems(listQuote());
              }}
              onPrice={(sku, p) => {
                setPriceOverride(sku, p);
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
          <div className="flex items-center gap-2">
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
            <button
              type="button"
              onClick={() => setShowTotal((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:border-primary/40"
              title="Mostrar/ocultar total no orçamento e nas exportações"
            >
              {showTotal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showTotal ? "Ocultar total" : "Mostrar total"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyWhatsApp}
              disabled={!items.length || !!busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold hover:border-primary/40 disabled:opacity-50"
            >
              {busy === "copy" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copiado" : "Copiar WhatsApp"}
            </button>
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

// ---------- utils ----------

function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("no-ctx"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      resolve(c);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function buildWhatsAppText({
  items,
  storeName,
  cliente,
  total,
  showTotal,
}: {
  items: QuoteItem[];
  storeName: string;
  cliente: string;
  total: number;
  showTotal: boolean;
}): string {
  const saud = cliente
    ? `Olá, ${cliente}! Segue seu orçamento da *${storeName}*:`
    : `Olá! Segue seu orçamento da *${storeName}*:`;

  // agrupa por garantia
  const groups = new Map<string, QuoteItem[]>();
  for (const it of items) {
    const g = (it.garantia || "Sem garantia informada").toString();
    const arr = groups.get(g) ?? [];
    arr.push(it);
    groups.set(g, arr);
  }
  // ordem: garantias maiores primeiro
  const ordered = Array.from(groups.entries()).sort((a, b) => {
    const na = parseInt(a[0]) || 0;
    const nb = parseInt(b[0]) || 0;
    return nb - na;
  });

  const linhas: string[] = [saud, ""];
  for (const [g, list] of ordered) {
    const gLabel = /^\d+$/.test(g) ? `${g} Meses` : g;
    linhas.push(`🛡️ *Garantia: ${gLabel}*`);
    for (const it of list) {
      const p = effectivePrice(it);
      const preco = isFinite(p) ? formatBRL(p) : "sob consulta";
      const marca = it.marca ?? "";
      const modelo = it.modelo ?? it.sku;
      const qty = it.qty > 1 ? ` (x${it.qty})` : "";
      linhas.push(`• ${marca} — ${modelo}${qty} — ${preco}`);
    }
    linhas.push("");
  }

  if (showTotal) {
    linhas.push(`💰 *Total estimado: ${formatBRL(total)}*`);
    linhas.push("");
  }

  linhas.push("📌 *Condições:*");
  linhas.push("• Valores condicionados à devolução da bateria usada (base de troca).");
  linhas.push("• Pagamento no local em até 10x sem juros no cartão.");
  linhas.push("• Taxa de visita técnica de R$ 45,00 caso o problema não seja a bateria.");

  return linhas.join("\n");
}

// -------- Preview renderizado (fonte para PNG/PDF) --------

const QuotePreview = forwardRef<
  HTMLDivElement,
  {
    items: QuoteItem[];
    cliente: string;
    telefone: string;
    obs: string;
    storeId: StoreId;
    total: number;
    showTotal: boolean;
    printMode: boolean;
    onQty: (sku: string, qty: number) => void;
    onPrice: (sku: string, price: number | undefined) => void;
    onRemove: (sku: string) => void;
  }
>(function QuotePreview(
  { items, cliente, telefone, obs, storeId, total, showTotal, printMode, onQty, onPrice, onRemove },
  ref,
) {
  const store = STORES[storeId];
  const now = new Date();
  const dataStr = now.toLocaleDateString("pt-BR");
  const validade = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR");
  const headerBg = store.colors.headerBg;
  const headerText = "#ffffff";
  // Logo em chip branco quando o fundo é escuro para garantir legibilidade
  const logoChipBg = "#ffffff";

  return (
    <div
      ref={ref}
      className="mx-auto w-full max-w-3xl bg-white text-neutral-900 shadow-lg"
      style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", color: "#111111" }}
    >
      {/* Cabeçalho */}
      <div
        style={{ background: headerBg, color: headerText }}
        className="flex items-center justify-between gap-4 px-6 py-4"
      >
        <div className="flex items-center gap-4">
          <div
            style={{
              background: logoChipBg,
              borderRadius: 8,
              padding: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={store.logoUrl}
              alt={store.nome}
              crossOrigin="anonymous"
              style={{ height: 60, width: "auto", objectFit: "contain", display: "block" }}
            />
          </div>
          <div style={{ color: headerText }}>
            <div className="text-[11px] uppercase tracking-widest" style={{ opacity: 0.85 }}>
              Orçamento profissional
            </div>
            <div className="text-lg font-black leading-tight" style={{ color: headerText }}>
              {store.nome}
            </div>
            <div className="text-[11px]" style={{ opacity: 0.9, color: headerText }}>
              {store.vibe}
            </div>
          </div>
        </div>
        <div className="text-right text-[11px] leading-relaxed" style={{ color: headerText }}>
          <div className="font-bold">Tel / WhatsApp</div>
          <div>{store.telefone}</div>
          <div className="mt-1" style={{ opacity: 0.85 }}>Emitido em {dataStr}</div>
          <div style={{ opacity: 0.85 }}>Válido até {validade}</div>
        </div>
      </div>

      {/* Faixa secundária */}
      <div
        style={{ background: store.colors.primary, color: "#ffffff" }}
        className="flex flex-wrap items-center justify-between gap-2 px-6 py-2 text-[11px] font-bold uppercase tracking-widest"
      >
        <span>
          {items.length} {items.length === 1 ? "item" : "itens"}
          {cliente ? ` · Cliente: ${cliente}` : ""}
          {telefone ? ` · ${telefone}` : ""}
        </span>
        {showTotal && <span>Total: {formatBRL(total)}</span>}
      </div>

      {/* Tabela */}
      <div className="px-6 py-5">
        <table className="w-full border-collapse text-[12px]" style={{ color: "#111111" }}>
          <thead>
            <tr
              style={{ background: store.colors.primary, color: "#ffffff" }}
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
              {!printMode && <th className="px-2 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <QuoteRow
                key={it.sku}
                it={it}
                store={store}
                printMode={printMode}
                onQty={onQty}
                onPrice={onPrice}
                onRemove={onRemove}
              />
            ))}
          </tbody>
          {showTotal && (
            <tfoot>
              <tr>
                <td colSpan={printMode ? 7 : 7} className="px-2 py-3 text-right text-[13px] font-semibold">
                  Total estimado
                </td>
                <td
                  className="px-2 py-3 text-right text-[15px] font-black"
                  style={{ color: store.colors.primary }}
                >
                  {formatBRL(total)}
                </td>
                {!printMode && <td />}
              </tr>
            </tfoot>
          )}
        </table>

        {obs && (
          <div
            className="mt-4 rounded px-3 py-2 text-[11px]"
            style={{
              borderLeft: `4px solid ${store.colors.primary}`,
              background: "#f7f7f7",
              color: "#333",
            }}
          >
            <strong>Observações:</strong> {obs}
          </div>
        )}

        <div
          className="mt-5 rounded-md px-4 py-3 text-[11px] leading-relaxed"
          style={{
            background: "#fafafa",
            border: `1px solid ${store.colors.primary}22`,
            color: "#333",
          }}
        >
          <div
            className="mb-2 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: store.colors.primary }}
          >
            Condições comerciais — {store.nome}
          </div>
          <ol className="ml-4 list-decimal space-y-1">
            <li>
              Valores promocionais condicionados à <strong>devolução da bateria usada</strong> (base
              de troca).
            </li>
            <li>
              Pagamento no local em até <strong>10x sem juros no cartão</strong>.
            </li>
            <li>
              Taxa de <strong>visita técnica de R$ 45,00</strong> caso o problema constatado não seja
              a bateria.
            </li>
          </ol>
        </div>

        <div
          className="mt-4 flex items-center justify-between border-t pt-3 text-[10px]"
          style={{ color: "#888", borderColor: "#e5e5e5" }}
        >
          <span>Orçamento gerado por BATPRO — valores sujeitos a alteração sem aviso prévio.</span>
          <span>{store.nome} · {store.telefone}</span>
        </div>
      </div>
    </div>
  );
});

// -------- Linha do orçamento (edição fluida) --------

function QuoteRow({
  it,
  store,
  printMode,
  onQty,
  onPrice,
  onRemove,
}: {
  it: QuoteItem;
  store: (typeof STORES)[StoreId];
  printMode: boolean;
  onQty: (sku: string, qty: number) => void;
  onPrice: (sku: string, price: number | undefined) => void;
  onRemove: (sku: string) => void;
}) {
  const unit = effectivePrice(it);
  const linha = isFinite(unit) ? unit * it.qty : NaN;
  const canonicalPrice =
    typeof it.precoOverride === "number"
      ? it.precoOverride.toFixed(2).replace(".", ",")
      : it.precoVenda ?? "";

  // estado local para não interromper o typing
  const [priceDraft, setPriceDraft] = useState<string>(canonicalPrice);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setPriceDraft(canonicalPrice);
  }, [canonicalPrice, focused]);

  return (
    <tr style={{ borderBottom: "1px solid #e5e5e5" }} className="align-top">
      <td className="px-2 py-2">
        <img
          src={resolvedImage(it)}
          alt={it.sku}
          crossOrigin="anonymous"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            const fb = fallbackImageFor(it);
            if (img.src !== fb) img.src = fb;
            else if (img.src !== batproLogo.url) img.src = batproLogo.url;
          }}
          style={{ width: 46, height: 46, objectFit: "contain" }}
        />
      </td>
      <td className="px-2 py-2">
        <div className="font-bold">{it.sku}</div>
        <div style={{ color: "#555" }}>
          {[it.marca, it.modelo].filter(Boolean).join(" · ")}
        </div>
        {it.descricao && (
          <div className="text-[11px]" style={{ color: "#777" }}>{it.descricao}</div>
        )}
      </td>
      <td className="px-2 py-2 text-center">{it.amperagem || "—"}</td>
      <td className="px-2 py-2 text-center">{it.cca || "—"}</td>
      <td className="px-2 py-2 text-center">{it.garantia || "—"}</td>
      <td className="px-2 py-2 text-center">
        {printMode ? (
          <span>{it.qty}</span>
        ) : (
          <input
            type="number"
            min={1}
            max={999}
            value={it.qty}
            onChange={(e) => onQty(it.sku, Number(e.target.value))}
            className="w-14 rounded border border-neutral-300 px-1 py-0.5 text-center text-[12px]"
          />
        )}
      </td>
      <td className="px-2 py-2 text-right">
        {printMode ? (
          <span>{isFinite(unit) ? formatBRL(unit) : "—"}</span>
        ) : (
          <input
            type="text"
            inputMode="decimal"
            value={priceDraft}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              const t = priceDraft.trim();
              if (!t) return onPrice(it.sku, undefined);
              const n = parseBRL(t);
              onPrice(it.sku, isFinite(n) ? n : undefined);
            }}
            onChange={(e) => {
              const v = e.target.value;
              setPriceDraft(v);
              if (!v.trim()) return onPrice(it.sku, undefined);
              const n = parseBRL(v);
              if (isFinite(n)) onPrice(it.sku, n);
            }}
            className="w-24 rounded border border-neutral-300 px-1 py-0.5 text-right text-[12px]"
            title="Editar preço apenas neste orçamento"
          />
        )}
      </td>
      <td
        className="px-2 py-2 text-right font-semibold"
        style={{ color: store.colors.primary }}
      >
        {isFinite(linha) ? formatBRL(linha) : "—"}
      </td>
      {!printMode && (
        <td className="px-2 py-2">
          <button
            type="button"
            onClick={() => onRemove(it.sku)}
            className="text-neutral-400 hover:text-red-600"
            aria-label="Remover"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </td>
      )}
    </tr>
  );
}
