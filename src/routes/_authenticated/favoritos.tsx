import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { BatteryCard } from "@/components/BatteryCard";
import { getFavorites } from "@/lib/favorites";
import type { BatteryApplication } from "@/lib/sheet.functions";

export const Route = createFileRoute("/_authenticated/favoritos")({
  head: () => ({ meta: [{ title: "Favoritos — Moura" }] }),
  component: FavoritosPage,
});

function FavoritosPage() {
  const { isMaster, nome } = Route.useRouteContext();
  const [items, setItems] = useState<BatteryApplication[]>([]);

  useEffect(() => {
    const load = () => setItems(getFavorites());
    load();
    window.addEventListener("moura:storage", load);
    return () => window.removeEventListener("moura:storage", load);
  }, []);

  return (
    <AppShell isMaster={isMaster} nome={nome}>
      <h1 className="font-display text-2xl font-bold">Favoritos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Aplicações salvas neste dispositivo.
      </p>

      {items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <Star className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
          Nenhum favorito ainda. Toque na estrela em qualquer resultado para salvar.
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((r, i) => (
            <li key={`${r.codigoMoura}-${r.marca}-${r.modelo}-${i}`}>
              <BatteryCard app={r} />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
