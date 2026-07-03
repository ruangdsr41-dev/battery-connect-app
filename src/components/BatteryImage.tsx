import { useEffect, useState } from "react";
import batproLogo from "@/assets/batpro-logo.png.asset.json";

/**
 * BatteryImage — componente reutilizável.
 *
 * Regras:
 * 1. Se `src` (coluna "Imagem" da planilha) for uma URL http(s) válida → usa.
 * 2. Se `fallback` for informado (imagem de categoria) → usa como 2º nível.
 * 3. Só em caso de erro real de carregamento cai para o logo BatPro.
 * Nunca substitui a imagem antes de tentar carregar.
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

  useEffect(() => {
    const p = sanitize(src);
    setCurrent(p ?? secondary);
    setTriedFallback(!p);
  }, [src, secondary]);

  return (
    <img
      src={current}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => {
        if (!triedFallback && current !== secondary) {
          setCurrent(secondary);
          setTriedFallback(true);
        } else if (current !== batproLogo.url) {
          setCurrent(batproLogo.url);
        }
      }}
    />
  );
}

function sanitize(u?: string | null): string | undefined {
  if (!u) return undefined;
  const s = String(u).trim();
  if (!s) return undefined;
  // Aceita apenas http/https absolutos
  if (!/^https?:\/\//i.test(s)) return undefined;
  // Converte link de compartilhamento do Google Drive para link direto de imagem
  const drive = s.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (drive) return `https://drive.google.com/uc?export=view&id=${drive[1]}`;
  return s;
}
