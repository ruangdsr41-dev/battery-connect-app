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

    const token = process.env.WDAPI_TOKEN;
    if (!token) return { error: "Token de consulta não configurado." };
    try {
      const res = await fetch(`https://wdapi2.com.br/consulta/${placa}/${token}`, {
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
      return { error: `Falha na consulta (${res.status}).` };
    } catch {
      /* ignore */
    }
    return { error: "Não foi possível consultar a placa agora." };
  });
