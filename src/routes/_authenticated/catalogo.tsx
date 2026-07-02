import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, Search, Filter, X } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/CatalogModal";
import { getCatalog, normalizeText, type CatalogProduct } from "@/lib/sheet.functions";

export const Route = createFileRoute("/_authenticated/catalogo")({
  head: () => ({ meta: [{ title: "Catálogo — BatPro" }] }),
  component: CatalogoPage,
});

function CatalogoPage() {
  const { isMaster, nome } = Route.useRouteContext();
  const [q, setQ] = useState("");
  const [marca, setMarca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tecnologia, setTecnologia] = useState("");
  const [ah, setAh] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => getCatalog({ data: {} }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const products: CatalogProduct[] = data?.rows ?? [];

  const marcas = useMemo(
    () => Array.from(new Set(products.map((p) => p.marca).filter(Boolean))).sort(),
    [products],
  );
  const categorias = useMemo(
    () => Array.from(new Set(products.map((p) => p.categoria).filter(Boolean))).sort(),
    [products],
  );
  const tecnologias = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.tecnologia).filter(Boolean))).sort() as string[],
    [products],
  );
  const ahs = useMemo(
    () => Array.from(new Set(products.map((p) => p.amperagem).filter(Boolean))).sort() as string[],
    [products],
  );

  const filtered = useMemo(() => {
    const nq = normalizeText(q);
    const tokens = nq.split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      if (marca && p.marca !== marca) return false;
      if (categoria && p.categoria !== categoria) return false;
      if (tecnologia && p.tecnologia !== tecnologia) return false;
      if (ah && p.amperagem !== ah) return false;
      if (!tokens.length) return true;
      const hay = normalizeText(
        [p.sku, p.marca, p.modelo, p.descricao, p.categoria, p.tecnologia, p.amperagem, p.cca]
          .filter(Boolean)
          .join(" "),
      );
      return tokens.every((t) => hay.includes(t));
    });
  }, [products, q, marca, categoria, tecnologia, ah]);

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
          placeholder="SKU, marca, modelo, categoria…"
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
        <span className="ml-auto text-muted-foreground">{filtered.length} produtos</span>
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
            {filtered.map((p, i) => (
              <li key={`${p.sku}-${i}`}>
                <ProductCard p={p} />
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
