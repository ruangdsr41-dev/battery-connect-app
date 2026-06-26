import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, AlertTriangle, RefreshCw, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getDashboardMetrics, getRecentEvents } from "@/lib/audit.functions";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Moura" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { isMaster, nome } = Route.useRouteContext();
  const { data: m, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: () => getDashboardMetrics(),
    refetchInterval: 60000,
  });
  const { data: events } = useQuery({
    queryKey: ["recent-events"],
    queryFn: () => getRecentEvents(),
    refetchInterval: 30000,
  });

  return (
    <AppShell isMaster={isMaster} nome={nome}>
      <h1 className="font-display text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Atividade do sistema nos últimos 30 dias.
      </p>

      {isLoading || !m ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando…
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={<Search />} label="Buscas hoje" value={m.totalHoje} />
            <Stat icon={<Search />} label="Buscas 7d" value={m.total7d} />
            <Stat icon={<Search />} label="Buscas 30d" value={m.total30d} />
            <Stat icon={<Users />} label="Usuários ativos" value={m.usuariosAtivos} />
            <Stat
              icon={<AlertTriangle />}
              label="Sem resultado"
              value={m.buscasSemResultado}
              tone="warning"
            />
            <Stat
              icon={<RefreshCw />}
              label="Atualizações planilha"
              value={m.atualizacoesPlanilha}
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Panel title="Top 10 termos pesquisados">
              <BarList items={m.topTermos.map((t) => ({ label: t.termo, value: t.total }))} />
            </Panel>
            <Panel title="Top 10 baterias consultadas">
              <BarList items={m.topBaterias.map((t) => ({ label: t.codigo, value: t.total }))} />
            </Panel>
            <Panel title="Usuários mais ativos">
              <BarList items={m.topUsuarios.map((t) => ({ label: t.email, value: t.total }))} />
            </Panel>
            <Panel title="Buscas por hora do dia">
              <HourChart data={m.buscasPorHora} />
            </Panel>
            <Panel title="Buscas sem resultado (corrija a planilha)" className="md:col-span-2">
              {m.semResultado.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {m.semResultado.map((s, i) => (
                    <li key={i} className="flex justify-between gap-2 border-b border-border/50 py-1">
                      <span className="truncate">{s.termo}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(s.quando).toLocaleString("pt-BR")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Eventos recentes" className="md:col-span-2">
              {!events || events.rows.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem eventos.</p>
              ) : (
                <ul className="max-h-96 space-y-1 overflow-y-auto text-xs">
                  {events.rows.map((e) => (
                    <li
                      key={e.id}
                      className="flex justify-between gap-2 border-b border-border/50 py-1"
                    >
                      <span className="font-mono">{e.event}</span>
                      <span className="truncate text-muted-foreground">
                        {e.user_email ?? "—"}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {new Date(e.created_at).toLocaleString("pt-BR")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Stat({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        tone === "warning"
          ? "border-warning/40 bg-warning/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function BarList({ items }: { items: Array<{ label: string; value: number }> }) {
  if (items.length === 0)
    return <p className="text-xs text-muted-foreground">Sem dados ainda.</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="text-xs">
          <div className="mb-0.5 flex justify-between">
            <span className="truncate">{it.label}</span>
            <span className="ml-2 font-mono text-muted-foreground">{it.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary"
              style={{ width: `${(it.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function HourChart({ data }: { data: Array<{ hora: number; total: number }> }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex h-32 items-end gap-0.5">
      {data.map((d) => (
        <div
          key={d.hora}
          className="flex flex-1 flex-col items-center gap-1"
          title={`${d.hora}h: ${d.total}`}
        >
          <div
            className="w-full rounded-t bg-primary/70"
            style={{ height: `${(d.total / max) * 100}%` }}
          />
          {d.hora % 3 === 0 && (
            <span className="text-[9px] text-muted-foreground">{d.hora}h</span>
          )}
        </div>
      ))}
    </div>
  );
}
