import { createServerFn } from "@tanstack/react-start";

export interface PlacaInfo {
  placa: string;
  marca?: string;
  modelo?: string;
  ano?: string;
  combustivel?: string;
}

const PLACA_REGEX = /^[A-Z]{3}[-\s]?\d[A-Z\d]\d{2}$/i;

export function isPlaca(text: string): boolean {
  return PLACA_REGEX.test(text.trim().replace(/\s|-/g, ""));
}

export const lookupPlaca = createServerFn({ method: "GET" })
  .inputValidator((d: { placa: string }) => d)
  .handler(async ({ data }): Promise<PlacaInfo | { error: string }> => {
    const placa = data.placa.replace(/\s|-/g, "").toUpperCase();
    if (!PLACA_REGEX.test(placa)) return { error: "Placa inválida" };

    // BrasilAPI / FIPE não retorna por placa; tentamos endpoint público gratuito.
    // Sem chave: consulta apibrasil/wdapi (gratuito limitado).
    try {
      const res = await fetch(`https://wdapi2.com.br/consulta/${placa}/free`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const j = (await res.json()) as Record<string, unknown>;
        return {
          placa,
          marca: (j.MARCA as string) || (j.marca as string),
          modelo: (j.MODELO as string) || (j.modelo as string),
          ano: (j.ano as string) || (j.anoModelo as string) || (j.AnoModelo as string),
          combustivel: (j.combustivel as string) || (j.COMBUSTIVEL as string),
        };
      }
    } catch {
      /* ignore */
    }
    return { error: "Não foi possível consultar a placa agora." };
  });
