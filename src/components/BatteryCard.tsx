import { Star, Zap, ChevronDown, ShieldCheck, ShieldAlert, Info } from "lucide-react";
import { useEffect, useState } from "react";
import type { BatteryApplication } from "@/lib/sheet.functions";
import { isFavorite, toggleFavorite } from "@/lib/favorites";

export function BatteryCard({ app }: { app: BatteryApplication }) {
  const [fav, setFav] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setFav(isFavorite(app));
    const onChange = () => setFav(isFavorite(app));
    window.addEventListener("moura:storage", onChange);
    return () => window.removeEventListener("moura:storage", onChange);
  }, [app]);

  const validado = (app.validado || "").trim().toUpperCase() === "SIM";
  const hasDims = app.comprimento || app.largura || app.altura || app.peso;
  const hasDetails = hasDims || app.obs;

  return (
    <article className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              {app.marca}
            </div>
            <ValidatedBadge ok={validado} />
          </div>
          <h3 className="mt-0.5 truncate font-display text-lg font-semibold leading-tight">
            {app.modelo}
          </h3>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {app.ano}
            {app.motorizacao ? ` · ${app.motorizacao}` : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            toggleFavorite(app);
            setFav((f) => !f);
          }}
          aria-pressed={fav}
          aria-label={fav ? "Remover dos favoritos" : "Salvar nos favoritos"}
          className={`shrink-0 rounded-lg p-2 transition-colors ${
            fav
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <Star className={`h-5 w-5 ${fav ? "fill-current" : ""}`} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-sm font-bold text-primary-foreground yellow-glow">
          <Zap className="h-3.5 w-3.5" />
          {app.codigoMoura || "—"}
        </span>
        {app.codigoAlternativo && (
          <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
            alt: {app.codigoAlternativo}
          </span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
        <Spec label="Ah" value={app.amperagem} />
        <Spec label="V" value={app.voltagem} />
        <Spec label="CCA" value={app.cca} />
      </dl>

      {(app.tecnologia || app.garantia || app.startStop) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {app.tecnologia && <Pill>{app.tecnologia}</Pill>}
          {app.startStop && app.startStop.toUpperCase() === "SIM" && (
            <Pill tone="navy">Start-Stop</Pill>
          )}
          {app.garantia && <Pill>Garantia: {app.garantia} meses</Pill>}
        </div>
      )}

      {hasDetails && (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {open ? "Ocultar detalhes" : "Ver detalhes"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <div className="mt-3 space-y-3">
              {hasDims && (
                <dl className="grid grid-cols-4 gap-2 text-center text-[11px]">
                  <Spec label="C (mm)" value={app.comprimento} />
                  <Spec label="L (mm)" value={app.largura} />
                  <Spec label="A (mm)" value={app.altura} />
                  <Spec label="Peso (kg)" value={app.peso} />
                </dl>
              )}
              {app.obs && (
                <div className="flex gap-2 rounded-md border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <p className="leading-relaxed">{app.obs}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}

function ValidatedBadge({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-500">
        <ShieldCheck className="h-3 w-3" /> Validado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-500">
      <ShieldAlert className="h-3 w-3" /> Não validado
    </span>
  );
}

function Spec({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md bg-muted/60 px-2 py-1.5">
      <dt className="text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-semibold">{value || "—"}</dd>
    </div>
  );
}

function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "navy";
}) {
  const cls =
    tone === "navy"
      ? "bg-secondary text-secondary-foreground"
      : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {children}
    </span>
  );
}
