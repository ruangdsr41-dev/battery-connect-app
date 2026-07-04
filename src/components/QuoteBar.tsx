import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { listQuote, QUOTE_EVENT } from "@/lib/quote-store";
import { QuoteModal } from "@/components/QuoteModal";

export function QuoteBar() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setCount(listQuote().length);
    sync();
    window.addEventListener(QUOTE_EVENT, sync);
    return () => window.removeEventListener(QUOTE_EVENT, sync);
  }, []);

  if (count === 0 && !open) return null;

  return (
    <>
      {count > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-elevated hover:brightness-110"
        >
          <FileText className="h-4 w-4" />
          {count} {count === 1 ? "item" : "itens"} · Orçamento
        </button>
      )}
      {open && <QuoteModal onClose={() => setOpen(false)} />}
    </>
  );
}
