import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BatteryCard } from "@/components/BatteryCard";
import { getFavorites } from "@/lib/favorites";
import type { BatteryApplication } from "@/lib/sheet.functions";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos — Moura" },
      {
        name: "description",
        content: "Suas baterias Moura salvas, disponíveis também offline.",
      },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const [favs, setFavs] = useState<BatteryApplication[]>([]);

  useEffect(() => {
    const load = () => setFavs(getFavorites());
    load();
    window.addEventListener("moura:storage", load);
    return () => window.removeEventListener("moura:storage", load);
  }, []);

  return (
    <AppShell>
      <header className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Star className="h-5 w-5 fill-current" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold leading-tight">
            Favoritos
          </h1>
          <p className="text-xs text-muted-foreground">
            Disponíveis offline no aplicativo.
          </p>
        </div>
      </header>

      {favs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Star className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">
            Você ainda não salvou aplicações.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Toque na estrela em qualquer resultado para salvar aqui.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {favs.map((f, i) => (
            <li key={`${f.codigoMoura}-${f.marca}-${f.modelo}-${i}`}>
              <BatteryCard app={f} />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
