import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Search, Star, Wifi, WifiOff, BarChart3, LogOut, Users, Moon, Sun, BookOpen, Settings } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";
import batproLogo from "@/assets/batpro-logo.png.asset.json";
import { QuoteBar } from "@/components/QuoteBar";


export function AppShell({
  children,
  isMaster = false,
  nome,
}: {
  children: ReactNode;
  isMaster?: boolean;
  nome?: string | null;
}) {
  const { location } = useRouterState();
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
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

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="brand-gradient sticky top-0 z-30 border-b border-secondary/40">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={batproLogo.url}
              alt="BatPro"
              className="h-10 w-10 rounded-lg object-contain"
            />
            <div className="leading-tight">
              <div className="font-display text-base font-bold tracking-wide text-white">
                BATPRO
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/70">
                {isMaster ? "Painel Master" : "Aplicações"}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                online
                  ? "bg-success/20 text-success"
                  : "bg-warning/20 text-warning"
              }`}
            >
              {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {online ? "Online" : "Offline"}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Modo claro" : "Modo escuro"}
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
              className="rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sair"
              title={nome ? `Sair (${nome})` : "Sair"}
              className="rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>


      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-4">
        {children}
      </main>

      <QuoteBar />

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-3xl">
          <TabLink to="/" active={tab === "/"} icon={<Search />} label="Consultar" />
          <TabLink
            to="/catalogo"
            active={tab.startsWith("/catalogo")}
            icon={<BookOpen />}
            label="Catálogo"
          />
          <TabLink
            to="/favoritos"
            active={tab.startsWith("/favoritos")}
            icon={<Star />}
            label="Favoritos"
          />
          {isMaster && (
            <>
              <TabLink
                to="/admin/dashboard"
                active={tab.startsWith("/admin/dashboard")}
                icon={<BarChart3 />}
                label="Dashboard"
              />
              <TabLink
                to="/admin/usuarios"
                active={tab.startsWith("/admin/usuarios")}
                icon={<Users />}
                label="Usuários"
              />
            </>
          )}
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
