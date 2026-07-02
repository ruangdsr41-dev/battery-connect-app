import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ArrowUpDown, Filter, PackageX, Loader2 } from "lucide-react";
import { getCatalog, normalizeText, type CatalogProduct } from "@/lib/sheet.functions";

type SortKey = "sku" | "marca" | "precoVenda" | "amperagem" | "cca" | "disponivel" | "categoria";
type SortDir = "asc" | "desc";

function parseNumber(v?: string): number {
  if (!v) return NaN;
  const n = Number(String(v).replace(/[^\d,.\-]/g, "").replace(",", "."));
  return isFinite(n) ? n : NaN;
}

function formatBRL(v?: string): string {
  const n = parseNumber(v);
  if (!isFinite(n)) return v || "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CatalogModal({
  categoria,
  onClose,
}: {
  categoria: string;
  onClose: () => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("marca");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [marca, setMarca] = useState<string>("");
  const [tecnologia, setTecnologia] = useState<string>("");
  const [disp, setDisp] = useState<"" | "SIM" | "NAO">("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => getCatalog({ data: {} }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const products: CatalogProduct[] = useMemo(() => {
    const target = normalizeText(categoria);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[BATPRO] Relacionando via Categoria: [${target}].`);
    }
    return (data?.rows ?? []).filter(
      (p) => (p.categoriaNorm ?? normalizeText(p.categoria)) === target,
    );
  }, [data, categoria]);

  const marcas = useMemo(
    () => Array.from(new Set(products.map((p) => p.marca).filter(Boolean))).sort(),
    [products],
  );
  const tecnologias = useMemo(
    () => Array.from(new Set(products.map((p) => p.tecnologia).filter(Boolean))).sort() as string[],
    [products],
  );

  const filtered = useMemo(() => {
    const list = products.filter((p) => {
      if (marca && p.marca !== marca) return false;
      if (tecnologia && p.tecnologia !== tecnologia) return false;
      if (disp) {
        const d = (p.disponivel || "").trim().toUpperCase();
        if (disp === "SIM" && d !== "SIM") return false;
        if (disp === "NAO" && d === "SIM") return false;
      }
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const an = parseNumber(av as string);
      const bn = parseNumber(bv as string);
      if (isFinite(an) && isFinite(bn)) return (an - bn) * dir;
      return String(av).localeCompare(String(bv), "pt-BR") * dir;
    });
  }, [products, marca, tecnologia, disp, sortKey, sortDir]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-elevated sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border bg-card px-4 py-3">
          <div>
            <h2 className="font-display text-lg font-bold">Produtos Compatíveis</h2>
            <p className="text-xs text-muted-foreground">
              Categoria <span className="font-semibold text-foreground">{categoria}</span>
              {data ? ` · ${filtered.length} produto${filtered.length === 1 ? "" : "s"}` : ""}
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

        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-4 py-2 text-xs">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <SelectMini value={marca} onChange={setMarca} label="Marca" options={marcas} />
          <SelectMini
            value={tecnologia}
            onChange={setTecnologia}
            label="Tecnologia"
            options={tecnologias}
          />
          <SelectMini
            value={disp}
            onChange={(v) => setDisp(v as "" | "SIM" | "NAO")}
            label="Disponibilidade"
            options={["SIM", "NAO"]}
          />
          <div className="ml-auto flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs"
            >
              <option value="sku">SKU</option>
              <option value="marca">Marca</option>
              <option value="precoVenda">Preço</option>
              <option value="amperagem">Ah</option>
              <option value="cca">CCA</option>
              <option value="disponivel">Disponibilidade</option>
              <option value="categoria">Categoria</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs"
              aria-label="Inverter ordenação"
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando catálogo…
            </div>
          )}
          {isError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Não foi possível carregar o catálogo agora.
            </div>
          )}
          {!isLoading && !isError && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <PackageX className="h-8 w-8" />
              Nenhum produto encontrado para esta categoria.
            </div>
          )}
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filtered.map((p, i) => (
              <li key={`${p.sku}-${i}`}>
                <ProductCard p={p} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SelectMini({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="inline-flex items-center gap-1">
      <span className="text-muted-foreground">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-card px-2 py-1 text-xs"
      >
        <option value="">todos</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ProductCard({ p }: { p: CatalogProduct }) {
  const indisponivel = (p.disponivel || "").trim().toUpperCase() !== "SIM" && !!p.disponivel;
  const img =
    p.imagemUrl && /^https?:\/\//i.test(p.imagemUrl)
      ? p.imagemUrl
      : "/icons/icon-192.png";

  return (
    <article
      className={`relative flex h-full flex-col rounded-xl border border-border bg-card p-3 transition ${
        indisponivel ? "opacity-60" : ""
      }`}
    >
      {indisponivel && (
        <span className="absolute right-2 top-2 rounded-full bg-destructive/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-destructive">
          Indisponível
        </span>
      )}
      <div className="flex items-start gap-3">
        <img
          src={img}
          alt={p.sku || `${p.marca} ${p.modelo ?? ""}`.trim()}
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/icons/icon-192.png";
          }}
          className="h-16 w-16 shrink-0 rounded-md bg-muted/40 object-contain p-1"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              {p.sku || "—"}
            </span>
            {p.marca && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                {p.marca}
              </span>
            )}
          </div>
          {(p.modelo || p.descricao) && (
            <h3 className="mt-0.5 truncate font-display text-base font-semibold leading-tight">
              {p.modelo || p.descricao}
            </h3>
          )}
          {p.descricao && p.modelo && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.descricao}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {p.categoria}
            </span>
            {p.tecnologia && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {p.tecnologia}
              </span>
            )}
          </div>
        </div>
      </div>


      <dl className="mt-3 grid grid-cols-4 gap-1.5 text-center text-[11px]">
        <Mini label="Ah" v={p.amperagem} />
        <Mini label="V" v={p.tensao} />
        <Mini label="CCA" v={p.cca} />
        <Mini label="Gar." v={p.garantia} />
      </dl>

      {(p.comprimento || p.largura || p.altura || p.peso) && (
        <dl className="mt-2 grid grid-cols-4 gap-1.5 text-center text-[11px]">
          <Mini label="C" v={p.comprimento} />
          <Mini label="L" v={p.largura} />
          <Mini label="A" v={p.altura} />
          <Mini label="kg" v={p.peso} />
        </dl>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <PriceBox label="Preço venda" value={formatBRL(p.precoVenda)} tone="primary" />
        <PriceBox label="Preço frotista" value={formatBRL(p.precoFrotista)} />
        {p.custo !== undefined && (
          <PriceBox label="Custo" value={formatBRL(p.custo)} tone="muted" />
        )}
        {p.markup !== undefined && <PriceBox label="Markup" value={p.markup || "—"} tone="muted" />}
      </div>

      {p.obs && (
        <p className="mt-3 rounded-md bg-muted/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
          <span className="mr-1 font-semibold uppercase tracking-wider text-muted-foreground/80">
            Obs:
          </span>
          {p.obs}
        </p>
      )}
    </article>
  );
}

function Mini({ label, v }: { label: string; v?: string }) {
  return (
    <div className="rounded-md bg-muted/60 px-1.5 py-1">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-semibold">{v || "—"}</div>
    </div>
  );
}

function PriceBox({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "muted";
}) {
  const cls =
    tone === "primary"
      ? "bg-primary/15 text-foreground border-primary/30"
      : tone === "muted"
        ? "bg-muted text-muted-foreground border-border"
        : "bg-card border-border";
  return (
    <div className={`rounded-md border px-2 py-1.5 ${cls}`}>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}
