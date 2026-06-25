import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search, Loader2, History, X, RefreshCw } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { BatteryCard } from "@/components/BatteryCard";
import { getAllApplications } from "@/lib/sheet.functions";
import { getHistory, pushHistory, type HistoryEntry } from "@/lib/favorites";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Consultar bateria — Moura" },
      {
        name: "description",
        content:
          "Pesquise a bateria Moura ideal para qualquer carro, moto ou caminhão pela marca, modelo, ano ou código.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const queryClient = useQueryClient();

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["sheet", "all"],
    queryFn: () => getAllApplications({ data: {} }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  });

  async function handleRefresh() {
    await getAllApplications({ data: { refresh: true } });
    await queryClient.invalidateQueries({ queryKey: ["sheet", "all"] });
    await refetch();
  }

  const rows = data?.rows ?? [];

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const tokens = needle.split(/\s+/).filter(Boolean);
    return rows
      .filter((r) => {
        const hay = [
          r.marca,
          r.modelo,
          r.ano,
          r.motorizacao,
          r.codigoMoura,
          r.codigoAlternativo,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return tokens.every((t) => hay.includes(t));
      })
      .slice(0, 200);
  }, [q, rows]);

  useEffect(() => {
    if (!q.trim()) return;
    const t = setTimeout(() => {
      pushHistory({ q: q.trim(), category: "all" });
      setHistory(getHistory());
    }, 1200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <AppShell>
      <section className="rounded-2xl brand-gradient p-5 text-white">
        <h1 className="font-display text-2xl font-bold leading-tight">
          Encontre sua bateria Moura
        </h1>
        <p className="mt-1 text-sm text-white/75">
          Catálogo oficial com mais de 3.150 aplicações.
        </p>
      </section>

      <div className="mt-5 relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Marca, modelo, ano ou código…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-14 w-full rounded-xl border border-border bg-card pl-11 pr-11 text-base outline-none ring-primary/40 transition-all focus:border-primary focus:ring-2"
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

      {!q && history.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <History className="h-3.5 w-3.5" /> Buscas recentes
          </div>
          <div className="flex flex-wrap gap-2">
            {history.slice(0, 8).map((h) => (
              <button
                key={`${h.q}-${h.ts}`}
                onClick={() => setQ(h.q)}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground hover:border-primary/40"
              >
                {h.q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando catálogo…
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="font-medium text-destructive">
              Não foi possível carregar o catálogo.
            </p>
            <p className="mt-1 text-muted-foreground">
              {(error as Error)?.message ??
                "Verifique sua conexão e tente novamente."}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {q
                  ? `${results.length} resultado${results.length === 1 ? "" : "s"}`
                  : "Pronto para pesquisar"}
              </span>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isFetching}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium hover:border-primary/40 disabled:opacity-50"
                aria-label="Atualizar planilha"
              >
                <RefreshCw
                  className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`}
                />
                Atualizar planilha
              </button>
            </div>

            {!q ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                Digite marca, modelo, ano ou código acima para consultar as
                aplicações Moura.
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Nenhuma aplicação encontrada para "{q}".
              </div>
            ) : (
              <ul className="space-y-3">
                {results.map((r, i) => (
                  <li key={`${r.codigoMoura}-${r.marca}-${r.modelo}-${i}`}>
                    <BatteryCard app={r} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
