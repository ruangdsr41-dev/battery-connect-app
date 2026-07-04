import { useEffect, useState } from "react";
import batproLogo from "@/assets/batpro-logo.png.asset.json";

/**
 * BatteryImage — componente resiliente.
 *
 * Regras (BATPRO v2):
 * 1. Aceita APENAS URLs http(s) — ignora base64 e strings inválidas.
 * 2. Exibe skeleton loader enquanto a imagem carrega.
 * 3. Em erro/ausência: cai para `fallback` (ícone da categoria) e, por último, logo BatPro.
 * 4. NUNCA impede o item de aparecer — a imagem é decoração, não filtro.
 */
export function BatteryImage({
  src,
  fallback,
  alt,
  className,
}: {
  src?: string | null;
  fallback?: string;
  alt: string;
  className?: string;
}) {
  const primary = sanitize(src);
  const secondary = fallback ?? batproLogo.url;
  const [current, setCurrent] = useState<string>(primary ?? secondary);
  const [triedFallback, setTriedFallback] = useState(!primary);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const p = sanitize(src);
    setCurrent(p ?? secondary);
    setTriedFallback(!p);
    setLoaded(false);
  }, [src, secondary]);

  return (
    <span className={`relative inline-block overflow-hidden ${className ?? ""}`}>
      {!loaded && (
        <span className="absolute inset-0 animate-pulse bg-muted/60" aria-hidden="true" />
      )}
      <img
        src={current}
        alt={alt}
        loading="lazy"
        className={`h-full w-full object-contain transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!triedFallback && current !== secondary) {
            setCurrent(secondary);
            setTriedFallback(true);
          } else if (current !== batproLogo.url) {
            setCurrent(batproLogo.url);
          } else {
            setLoaded(true);
          }
        }}
      />
    </span>
  );
}

function sanitize(u?: string | null): string | undefined {
  if (!u) return undefined;
  const s = String(u).trim();
  if (!s) return undefined;
  // Rejeita base64 explicitamente (BATPRO v2)
  if (/^data:/i.test(s)) return undefined;
  // Aceita apenas http/https absolutos
  if (!/^https?:\/\//i.test(s)) return undefined;
  // Converte link de compartilhamento do Google Drive para link direto de imagem
  const drive = s.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (drive) return `https://drive.google.com/uc?export=view&id=${drive[1]}`;
  return s;
}
