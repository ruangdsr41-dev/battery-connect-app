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

    const token = process.env.INVERTEXTO_TOKEN;
    if (!token) return { error: "Token de consulta não configurado." };

    try {
      const res = await fetch(
        `https://api.invertexto.com/v1/placa/${placa}?token=${token}`,
        { headers: { Accept: "application/json" } },
      );
      if (res.ok) {
        const j = (await res.json()) as Record<string, unknown>;
        // Invertexto retorna: marca, modelo, ano, anoModelo, cor, combustivel, etc.
        const marca = (j.marca as string) ?? undefined;
        const modelo = (j.modelo as string) ?? undefined;
        const ano =
          (j.ano as string | number)?.toString() ??
          (j.anoModelo as string | number)?.toString() ??
          undefined;
        const combustivel = (j.combustivel as string) ?? undefined;
        if (!marca && !modelo) {
          return { error: "Placa não encontrada na base." };
        }
        return { placa, marca, modelo, ano, combustivel };
      }
      if (res.status === 401 || res.status === 403) {
        return { error: "Token de consulta inválido ou sem créditos." };
      }
      if (res.status === 404) {
        return { error: "Placa não encontrada." };
      }
      return { error: `Falha na consulta (${res.status}).` };
    } catch {
      return { error: "Não foi possível consultar a placa agora." };
    }
  });
