import { Link, useRouterState } from "@tanstack/react-router";
import { Search, Star, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { location } = useRouterState();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const upd = () => setOnline(navigator.onLine);
    upd();
    window.addEventListener("online", upd);
    window.addEventListener("offline", upd);
    return () => {
      window.removeEventListener("online", upd);
      window.removeEventListener("offline", upd);
    };
  }, []);

  const tab = location.pathname;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="brand-gradient sticky top-0 z-30 border-b border-secondary/40">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display text-xl font-black">
              M
            </div>
            <div className="leading-tight">
              <div className="font-display text-base font-bold tracking-wide text-white">
                MOURA
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/70">
                Aplicações
              </div>
            </div>
          </Link>
          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              online
                ? "bg-success/20 text-success"
                : "bg-warning/20 text-warning"
            }`}
            aria-live="polite"
          >
            {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {online ? "Online" : "Offline"}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-4">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-3xl">
          <TabLink to="/" active={tab === "/"} icon={<Search />} label="Consultar" />
          <TabLink
            to="/favoritos"
            active={tab.startsWith("/favoritos")}
            icon={<Star />}
            label="Favoritos"
          />
        </div>
      </nav>
    </div>
  );
}

function TabLink({
  to,
  active,
  icon,
  label,
}: {
  to: string;
  active: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-1 flex-col items-center gap-1 px-3 py-3 text-[11px] font-medium transition-colors ${
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      {label}
    </Link>
  );
}
