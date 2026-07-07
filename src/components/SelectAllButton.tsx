import { useEffect, useState } from "react";
import { CheckSquare, Square } from "lucide-react";
import {
  addManyToQuote,
  isInQuote,
  QUOTE_EVENT,
  removeManyFromQuote,
} from "@/lib/quote-store";
import type { CatalogProduct } from "@/lib/sheet.functions";

/**
 * Botão "Marcar Todos" — seleciona ou desmarca todos os produtos atualmente
 * filtrados. Atualiza contador do orçamento imediatamente via QUOTE_EVENT.
 */
export function SelectAllButton({ items }: { items: CatalogProduct[] }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const sync = () => setTick((t) => t + 1);
    window.addEventListener(QUOTE_EVENT, sync);
    return () => window.removeEventListener(QUOTE_EVENT, sync);
  }, []);

  const usable = items.filter((p) => !!p.sku);
  const allSelected = usable.length > 0 && usable.every((p) => isInQuote(p.sku));

  const handle = () => {
    if (!usable.length) return;
    if (allSelected) {
      removeManyFromQuote(usable.map((p) => p.sku));
    } else {
      addManyToQuote(usable);
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={!usable.length}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold hover:border-primary/50 disabled:opacity-50"
      title={allSelected ? "Desmarcar todos os itens filtrados" : "Marcar todos os itens filtrados"}
    >
      {allSelected ? (
        <CheckSquare className="h-3.5 w-3.5 text-primary" />
      ) : (
        <Square className="h-3.5 w-3.5" />
      )}
      {allSelected ? "Desmarcar todos" : "Marcar todos"}
      <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
        {usable.length}
      </span>
    </button>
  );
}
