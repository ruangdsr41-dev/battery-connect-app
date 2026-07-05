import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";
import { Loader2, Search, Filter, X, ArrowUpDown } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/CatalogModal";
import { getCatalog, normalizeText, type CatalogProduct } from "@/lib/sheet.functions";

export const Route = createFileRoute("/_authenticated/catalogo")({
  head: () => ({ meta: [{ title: "Catálogo — BatPro" }] }),
  component: CatalogoPage,
});

type SortKey = "marca" | "categoria" | "sku" | "precoVenda" | "amperagem";
type SortDir = "asc" | "desc";

function parseNumber(v?: string) {
  if (!v) return NaN;
  const n = Number(String(v).replace(/[^\d,.\-]/g, "").replace(",", "."));
  return isFinite(n) ? n : NaN;
}

function CatalogoPage() {
  const { isMaster, nome } = Route.useRouteContext();
  const [q, setQ] = useState("");
  const [marca, setMarca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tecnologia, setTecnologia] = useState("");
  const [ah, setAh] = useState("");
  const [disp, setDisp] = useState<"" | "SIM" | "NAO">("");
  const [sortKey, setSortKey] = useState<SortKey>("marca");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data, isLoading, isError } = useQuery({
    // Chave inclui isMaster para invalidar cache ao trocar de usuário
    queryKey: ["catalog", isMaster ? "master" : "padrao"],
    queryFn: () => getCatalog({ data: {} }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const products: CatalogProduct[] = data?.rows ?? [];

  const uniq = (fn: (p: CatalogProduct) => string | undefined) =>
    Array.from(new Set(products.map(fn).filter(Boolean) as string[])).sort();

  const marcas = useMemo(() => uniq((p) => p.marca), [products]);
  const categorias = useMemo(() => uniq((p) => p.categoria), [products]);
  const tecnologias = useMemo(() => uniq((p) => p.tecnologia), [products]);
  const ahs = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.amperagem).filter(Boolean) as string[])).sort(
        (a, b) => parseNumber(a) - parseNumber(b),
      ),
    [products],
  );

  const deferredQ = useDeferredValue(q);
  const filtered = useMemo(() => {
    const nq = normalizeText(deferredQ);
    const tokens = nq.split(/\s+/).filter(Boolean);
    const list = products.filter((p) => {
      if (marca && p.marca !== marca) return false;
      if (categoria && p.categoria !== categoria) return false;
      if (tecnologia && p.tecnologia !== tecnologia) return false;
      if (ah && p.amperagem !== ah) return false;
      if (disp) {
        const d = (p.disponivel || "").trim().toUpperCase();
        if (disp === "SIM" && d !== "SIM") return false;
        if (disp === "NAO" && d === "SIM") return false;
      }
      if (!tokens.length) return true;
      const hay = normalizeText(
        [
          p.sku,
          p.marca,
          p.modelo,
          p.descricao,
          p.categoria,
          p.tecnologia,
          p.amperagem,
          p.cca,
          p.obs,
        ]
          .filter(Boolean)
          .join(" "),
      );
      return tokens.every((t) => hay.includes(t));
    });

    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = (a[sortKey] as string) ?? "";
      const bv = (b[sortKey] as string) ?? "";
      const an = parseNumber(av);
      const bn = parseNumber(bv);
      if (isFinite(an) && isFinite(bn)) return (an - bn) * dir;
      return String(av).localeCompare(String(bv), "pt-BR") * dir;
    });
  }, [products, deferredQ, marca, categoria, tecnologia, ah, disp, sortKey, sortDir]);

  const clearFilters = () => {
    setMarca("");
    setCategoria("");
    setTecnologia("");
    setAh("");
    setDisp("");
  };

  return (
    <AppShell isMaster={isMaster} nome={nome}>
      <section className="rounded-2xl brand-gradient p-5 text-white">
        <h1 className="font-display text-2xl font-bold leading-tight">Catálogo BatPro</h1>
        <p className="mt-1 text-sm text-white/75">
          Pesquisa instantânea sobre todos os produtos do catálogo.
        </p>
      </section>

      <div className="relative mt-5">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="SKU, marca, modelo, categoria, descrição…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-11 outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Limpar"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <FilterSelect label="Marca" value={marca} onChange={setMarca} options={marcas} />
        <FilterSelect
          label="Categoria"
          value={categoria}
          onChange={setCategoria}
          options={categorias}
        />
        <FilterSelect
          label="Tecnologia"
          value={tecnologia}
          onChange={setTecnologia}
          options={tecnologias}
        />
        <FilterSelect label="Ah" value={ah} onChange={setAh} options={ahs} />
        <FilterSelect
          label="Disponibilidade"
          value={disp}
          onChange={(v) => setDisp(v as "" | "SIM" | "NAO")}
          options={["SIM", "NAO"]}
        />
        {(marca || categoria || tecnologia || ah || disp) && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] hover:bg-muted/70"
          >
            Limpar filtros
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs"
          >
            <option value="marca">Marca</option>
            <option value="categoria">Categoria</option>
            <option value="sku">SKU</option>
            <option value="precoVenda">Preço</option>
            <option value="amperagem">Ah</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs"
            aria-label="Inverter ordenação"
          >
            {sortDir === "asc" ? "A-Z ↑" : "Z-A ↓"}
          </button>
          <span className="text-muted-foreground">{filtered.length} produtos</span>
        </div>
      </div>

      <div className="mt-5">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando catálogo…
          </div>
        )}
        {isError && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Não foi possível carregar o catálogo.
          </div>
        )}
        {!isLoading && !isError && (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <li key={p.sku || `${p.marca}-${p.modelo}`}>
                <ProductCard p={p} isMaster={!!data?.isMaster} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function FilterSelect({
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
