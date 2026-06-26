import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search, Loader2, History, X, RefreshCw, Car } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { BatteryCard } from "@/components/BatteryCard";
import { getAllApplications } from "@/lib/sheet.functions";
import { getHistory, pushHistory, type HistoryEntry } from "@/lib/favorites";
import { logEvent } from "@/lib/audit.functions";
import { isPlaca, lookupPlaca, type PlacaInfo } from "@/lib/placa.functions";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Consultar bateria — Moura" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { isMaster, nome } = Route.useRouteContext();
  const [q, setQ] = useState("");
  const [placaInfo, setPlacaInfo] = useState<PlacaInfo | null>(null);
  const [placaLoading, setPlacaLoading] = useState(false);
  const [placaError, setPlacaError] = useState<string | null>(null);
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
    logEvent({ data: { event: "sheet_refresh" } }).catch(() => {});
  }

  // Detecta placa e dispara lookup
  useEffect(() => {
    const t = q.trim();
    if (!t) {
      setPlacaInfo(null);
      setPlacaError(null);
      return;
    }
    if (!isPlaca(t)) {
      setPlacaInfo(null);
      setPlacaError(null);
      return;
    }
    let canceled = false;
    setPlacaLoading(true);
    setPlacaError(null);
    lookupPlaca({ data: { placa: t } })
      .then((r) => {
        if (canceled) return;
        if ("error" in r) {
          setPlacaError(r.error);
          setPlacaInfo(null);
        } else {
          setPlacaInfo(r);
          logEvent({
            data: { event: "placa_lookup", payload: { placa: r.placa, modelo: r.modelo } },
          }).catch(() => {});
        }
      })
      .finally(() => !canceled && setPlacaLoading(false));
    return () => {
      canceled = true;
    };
  }, [q]);

  const rows = data?.rows ?? [];

  const effectiveQuery = useMemo(() => {
    if (placaInfo) {
      return [placaInfo.marca, placaInfo.modelo, placaInfo.ano]
        .filter(Boolean)
        .join(" ");
    }
    return q;
  }, [q, placaInfo]);

  const results = useMemo(() => {
    const needle = effectiveQuery.trim().toLowerCase();
    if (!needle) return [];
    const tokens = needle.split(/\s+/).filter(Boolean);
    const currentYear = new Date().getFullYear();
    return rows
      .filter((r) => {
        const hay = [r.marca, r.modelo, r.ano, r.motorizacao, r.codigoMoura, r.codigoAlternativo]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const anoStr = (r.ano ?? "").toString();
        const yearNums = (anoStr.match(/\d{4}/g) ?? []).map(Number);
        const ranges: Array<[number, number]> = [];
        if (yearNums.length >= 2) {
          for (let i = 0; i + 1 < yearNums.length; i += 2)
            ranges.push([yearNums[i], yearNums[i + 1]]);
          if (yearNums.length % 2 === 1) {
            const last = yearNums[yearNums.length - 1];
            ranges.push([last, last]);
          }
        } else if (yearNums.length === 1) {
          const onlyYear = yearNums[0];
          const openEnded = /\d{4}\s*[-/a]\s*$/i.test(anoStr.trim());
          ranges.push([onlyYear, openEnded ? currentYear : onlyYear]);
        }

        return tokens.every((t) => {
          if (/^\d{4}$/.test(t)) {
            const y = Number(t);
            if (ranges.some(([a, b]) => y >= a && y <= b)) return true;
          }
          return hay.includes(t);
        });
      })
      .slice(0, 200);
  }, [effectiveQuery, rows]);

  // Log busca com debounce
  useEffect(() => {
    if (!q.trim() || placaLoading) return;
    const t = setTimeout(() => {
      pushHistory({ q: q.trim(), category: "all" });
      setHistory(getHistory());
      logEvent({
        data: {
          event: results.length === 0 ? "search_empty" : "search",
          payload: {
            termo: effectiveQuery.trim() || q.trim(),
            resultados: results.length,
            placa: placaInfo?.placa,
          },
        },
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [q, results.length, effectiveQuery, placaInfo, placaLoading]);

  return (
    <AppShell isMaster={isMaster} nome={nome}>
      <section className="rounded-2xl brand-gradient p-5 text-white">
        <h1 className="font-display text-2xl font-bold leading-tight">
          Encontre sua bateria Moura
        </h1>
        <p className="mt-1 text-sm text-white/75">
          Catálogo oficial — pesquise por marca, modelo, ano, código ou placa.
        </p>
      </section>

      <div className="mt-5 relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Marca, modelo, ano, código ou placa ABC1D23…"
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

      {placaLoading && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando placa…
        </div>
      )}
      {placaInfo && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
          <Car className="h-4 w-4 text-primary" />
          <span>
            Placa <strong>{placaInfo.placa}</strong> →{" "}
            <strong>
              {[placaInfo.marca, placaInfo.modelo].filter(Boolean).join(" ")}
            </strong>
            {placaInfo.ano ? ` (${placaInfo.ano})` : ""}
          </span>
        </div>
      )}
      {placaError && (
        <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          {placaError}
        </div>
      )}

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
              {(error as Error)?.message ?? "Verifique sua conexão e tente novamente."}
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
              {isMaster && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isFetching}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium hover:border-primary/40 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
                  Atualizar planilha
                </button>
              )}
            </div>

            {!q ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                Digite marca, modelo, ano, código ou <strong>placa</strong> para consultar.
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Nenhuma aplicação encontrada para "{effectiveQuery || q}".
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
