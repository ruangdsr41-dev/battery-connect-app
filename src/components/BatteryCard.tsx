import { Star, Zap, ShieldCheck, ShieldAlert, Info, FileDown, Share2, Layers } from "lucide-react";
import { useEffect, useState } from "react";
import type { BatteryApplication } from "@/lib/sheet.functions";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { getBatteryImage } from "@/lib/battery-image";
import { BatteryImage } from "@/components/BatteryImage";
import { generateBatteryPDF, buildWhatsAppLink } from "@/lib/pdf";
import { logEvent } from "@/lib/audit.functions";
import { CatalogModal } from "@/components/CatalogModal";

export function BatteryCard({ app }: { app: BatteryApplication }) {
  const [fav, setFav] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  useEffect(() => {
    setFav(isFavorite(app));
    const onChange = () => setFav(isFavorite(app));
    window.addEventListener("moura:storage", onChange);
    return () => window.removeEventListener("moura:storage", onChange);
  }, [app]);

  const validado = (app.validado || "").trim().toUpperCase() === "SIM";
  const hasDims = app.comprimento || app.largura || app.altura || app.peso;
  const img = getBatteryImage(app);


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

      <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted/40 p-2">
        <img
          src={img.url}
          alt={img.label}
          loading="lazy"
          className="h-16 w-16 shrink-0 object-contain"
        />
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {img.label}
        </div>
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

      {hasDims && (
        <dl className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
          <Spec label="C (mm)" value={app.comprimento} />
          <Spec label="L (mm)" value={app.largura} />
          <Spec label="A (mm)" value={app.altura} />
          <Spec label="Peso (kg)" value={app.peso} />
        </dl>
      )}

      <div className="mt-3 flex gap-2 rounded-md border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <div className="flex-1 leading-relaxed">
          <span className="mr-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            Obs:
          </span>
          <span className={app.obs ? "" : "italic text-muted-foreground/60"}>
            {app.obs || "Sem observações"}
          </span>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            generateBatteryPDF(app);
            logEvent({
              data: { event: "pdf_export", payload: { codigo: app.codigoMoura } },
            }).catch(() => {});
          }}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:border-primary/40"
        >
          <FileDown className="h-3.5 w-3.5" /> PDF
        </button>
        <a
          href={buildWhatsAppLink(app)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            logEvent({
              data: { event: "whatsapp_share", payload: { codigo: app.codigoMoura } },
            }).catch(() => {})
          }
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-success/20 px-3 py-2 text-xs font-medium text-success hover:bg-success/30"
        >
          <Share2 className="h-3.5 w-3.5" /> WhatsApp
        </a>
      </div>

      {app.categoria && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setShowCatalog(true)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Layers className="h-3 w-3" />
            Ver Catálogo ({app.categoria})
          </button>
        </div>
      )}

      {showCatalog && app.categoria && (
        <CatalogModal categoria={app.categoria} onClose={() => setShowCatalog(false)} />
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
