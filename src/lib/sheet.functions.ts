import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Papa from "papaparse";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SHEET_ID = "1GxHw9m4xv_RgsW_nuDakt0OaQ_uai4Mif2Mt_YiuQY8";

export type VehicleCategory = "carros" | "motos" | "caminhoes";

const SHEET_GIDS: Record<VehicleCategory, string> = {
  carros: "1",
  motos: "2",
  caminhoes: "3",
};

const CATALOG_SHEET_NAME = "Catálogo";

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
  categoria?: string; // chave de relacionamento com o Catálogo
}

export interface CatalogProduct {
  marca: string;
  modelo: string;
  descricao?: string;
  categoria: string;
  tecnologia?: string;
  amperagem?: string;
  cca?: string;
  tensao?: string;
  garantia?: string;
  peso?: string;
  comprimento?: string;
  largura?: string;
  altura?: string;
  precoVenda?: string;
  precoFrotista?: string;
  custo?: string;
  markup?: string;
  disponivel?: string;
  imagemUrl?: string;
  obs?: string;
}

// ---------- Cache em memória ----------
type CacheEntry<T> = { ts: number; data: T };
const appCache = new Map<VehicleCategory, CacheEntry<BatteryApplication[]>>();
let catalogCache: CacheEntry<CatalogProduct[]> | null = null;
const TTL_MS = 1000 * 60 * 5;

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  // caso-insensível como fallback
  const lower = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]),
  );
  for (const k of keys) {
    const v = lower[k.trim().toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

async function fetchCsv(url: string): Promise<Record<string, string>[]> {
  const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
  if (!res.ok) throw new Error(`Falha ao ler planilha (${res.status})`);
  const csv = await res.text();
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data;
}

async function fetchCategory(
  category: VehicleCategory,
  refresh = false,
): Promise<BatteryApplication[]> {
  const cached = appCache.get(category);
  if (!refresh && cached && Date.now() - cached.ts < TTL_MS) return cached.data;

  const gid = SHEET_GIDS[category];
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const data = await fetchCsv(url);

  const rows = data
    .map<BatteryApplication>((row) => ({
      category,
      marca: pick(row, "Marca"),
      modelo: pick(row, "Modelo"),
      ano: pick(row, "Ano Fabricação", "Ano"),
      motorizacao: pick(row, "Motorização"),
      cambio: pick(row, "Tipo Câmbio"),
      startStop: pick(row, "Start-Stop"),
      codigoMoura: pick(row, "Código Bateria Moura"),
      codigoAlternativo: pick(row, "Código Bateria Alternativo", "Código Alternativo"),
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
      imagemUrl: pick(row, "Imagem", "IMAGEM", "Link Imagem", "URL Imagem", "Imagem URL", "Foto", "FOTO"),
      categoria: pick(row, "Categoria", "CATEGORIA"),
    }))
    .filter((r) => r.marca && r.modelo);

  appCache.set(category, { ts: Date.now(), data: rows });
  return rows;
}

async function fetchCatalog(refresh = false): Promise<CatalogProduct[]> {
  if (!refresh && catalogCache && Date.now() - catalogCache.ts < TTL_MS)
    return catalogCache.data;

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    CATALOG_SHEET_NAME,
  )}`;
  let data: Record<string, string>[] = [];
  try {
    data = await fetchCsv(url);
  } catch {
    // Se a aba ainda não existir, devolve vazio silenciosamente
    catalogCache = { ts: Date.now(), data: [] };
    return [];
  }

  const rows = data
    .map<CatalogProduct>((row) => ({
      marca: pick(row, "Marca"),
      modelo: pick(row, "Modelo"),
      descricao: pick(row, "Descrição", "Descricao"),
      categoria: pick(row, "Categoria", "CATEGORIA"),
      tecnologia: pick(row, "Tecnologia"),
      amperagem: pick(row, "Ah", "Amperagem", "Amperagem (Ah)"),
      cca: pick(row, "CCA"),
      tensao: pick(row, "Tensão", "Tensao", "Voltagem", "Voltagem (V)", "V"),
      garantia: pick(row, "Garantia", "Garantia (meses)"),
      peso: pick(row, "Peso", "Peso (kg)"),
      comprimento: pick(row, "Comprimento", "Comprimento (mm)"),
      largura: pick(row, "Largura", "Largura (mm)"),
      altura: pick(row, "Altura", "Altura (mm)"),
      precoVenda: pick(row, "Preço Venda", "Preco Venda", "PreçoVenda"),
      precoFrotista: pick(row, "Preço Frotista", "Preco Frotista", "PreçoFrotista"),
      custo: pick(row, "Custo"),
      markup: pick(row, "Markup"),
      disponivel: pick(row, "Disponível", "Disponivel"),
      imagemUrl: pick(row, "Imagem", "IMAGEM", "Link Imagem", "URL Imagem", "Foto"),
      obs: pick(row, "Observações", "Observacoes", "OBS", "Obs"),
    }))
    .filter((r) => r.marca && r.modelo && r.categoria);

  catalogCache = { ts: Date.now(), data: rows };
  return rows;
}

function stripPrivateFields(rows: CatalogProduct[]): CatalogProduct[] {
  return rows.map(({ custo: _c, markup: _m, ...rest }) => rest);
}

// ---------- Server Functions ----------

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
    const results = await Promise.all(cats.map((c) => fetchCategory(c, data.refresh)));
    return { rows: results.flat(), fetchedAt: new Date().toISOString() };
  });

// Catálogo — autenticado; oculta custo/markup no backend para não-master.
export const getCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ refresh: z.boolean().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const rows = await fetchCatalog(data.refresh);
    const { data: isMaster } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "master",
    });
    const safe = isMaster ? rows : stripPrivateFields(rows);
    return { rows: safe, isMaster: !!isMaster, fetchedAt: new Date().toISOString() };
  });
