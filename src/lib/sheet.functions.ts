import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Papa from "papaparse";

const SHEET_ID = "1GxHw9m4xv_RgsW_nuDakt0OaQ_uai4Mif2Mt_YiuQY8";

export type VehicleCategory = "carros" | "motos" | "caminhoes";

const SHEET_GIDS: Record<VehicleCategory, string> = {
  carros: "1",
  motos: "2",
  caminhoes: "3",
};

export interface BatteryApplication {
  category: VehicleCategory;
  marca: string;
  modelo: string;
  ano: string;
  motorizacao?: string;
  cambio?: string;
  startStop?: string;
  codigoMoura: string;
  codigoAlternativo?: string;
  amperagem?: string;
  voltagem?: string;
  cca?: string;
  comprimento?: string;
  largura?: string;
  altura?: string;
  peso?: string;
  tecnologia?: string;
  garantia?: string;
  validado?: string;
  obs?: string;
  imagemUrl?: string;
}



// Simple in-memory cache (server worker; resets on cold start)
type CacheEntry = { ts: number; data: BatteryApplication[] };
const cache = new Map<VehicleCategory, CacheEntry>();
const TTL_MS = 1000 * 60 * 5; // 5 min

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

async function fetchCategory(
  category: VehicleCategory,
  refresh = false,
): Promise<BatteryApplication[]> {
  const cached = cache.get(category);
  if (!refresh && cached && Date.now() - cached.ts < TTL_MS) return cached.data;

  const gid = SHEET_GIDS[category];
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
  if (!res.ok) throw new Error(`Falha ao ler planilha (${res.status})`);
  const csv = await res.text();

  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data
    .map<BatteryApplication>((row) => ({
      category,
      marca: pick(row, "Marca"),
      modelo: pick(row, "Modelo"),
      ano: pick(row, "Ano Fabricação", "Ano"),
      motorizacao: pick(row, "Motorização"),
      cambio: pick(row, "Tipo Câmbio"),
      startStop: pick(row, "Start-Stop"),
      codigoMoura: pick(row, "Código Bateria Moura"),
      codigoAlternativo: pick(
        row,
        "Código Bateria Alternativo",
        "Código Alternativo",
      ),
      amperagem: pick(row, "Amperagem (Ah)"),
      voltagem: pick(row, "Voltagem (V)"),
      cca: pick(row, "CCA"),
      comprimento: pick(row, "Comprimento (mm)"),
      largura: pick(row, "Largura (mm)"),
      altura: pick(row, "Altura (mm)"),
      peso: pick(row, "Peso (kg)"),
      tecnologia: pick(row, "Tecnologia"),
      garantia: pick(row, "Garantia", "Garantia (meses)"),
      validado: pick(row, "VALIDADO", "Validado"),
      obs: pick(row, "OBS", "Observação", "Observacao"),
      imagemUrl: pick(
        row,
        "Imagem",
        "IMAGEM",
        "Link Imagem",
        "URL Imagem",
        "Imagem URL",
        "Foto",
        "FOTO",
      ),
    }))
    .filter((r) => r.marca && r.modelo);

  cache.set(category, { ts: Date.now(), data: rows });
  return rows;
}

export const getApplications = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        category: z.enum(["carros", "motos", "caminhoes"]),
        refresh: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const rows = await fetchCategory(data.category, data.refresh);
    return { rows, fetchedAt: new Date().toISOString() };
  });

export const getAllApplications = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ refresh: z.boolean().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const cats: VehicleCategory[] = ["carros", "motos", "caminhoes"];
    const results = await Promise.all(
      cats.map((c) => fetchCategory(c, data.refresh)),
    );
    const rows = results.flat();
    return { rows, fetchedAt: new Date().toISOString() };
  });
