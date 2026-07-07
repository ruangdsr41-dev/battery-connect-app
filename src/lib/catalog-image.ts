import convencional from "@/assets/baterias/moura_pack.png.asset.json";
import efb from "@/assets/baterias/efb.png.asset.json";
import agm from "@/assets/baterias/agm.png.asset.json";
import litio from "@/assets/baterias/litio-auto-leve.webp.asset.json";
import motoAgm from "@/assets/baterias/moto_agm.png.asset.json";
import motoVentilada from "@/assets/baterias/moto-ventilada.webp.asset.json";
import pesada from "@/assets/baterias/bus-truck-frontal.webp.asset.json";

const norm = (s?: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

/**
 * Retorna a arte-padrão por categoria/tecnologia para itens que não têm
 * `imagemUrl` na planilha. Aceita strings livres (CatalogProduct/QuoteItem).
 */
export function getCatalogFallbackImage(input: {
  categoria?: string;
  tecnologia?: string;
}): string {
  const cat = norm(input.categoria);
  const tec = norm(input.tecnologia);

  if (cat.includes("MOTO")) {
    if (tec.includes("VENTILADA")) return motoVentilada.url;
    return motoAgm.url;
  }
  if (cat.includes("CAMIN") || cat.includes("PESAD") || cat.includes("TRUCK") || cat.includes("BUS")) {
    return pesada.url;
  }
  if (tec.includes("LITIO") || tec.includes("LI-ION") || tec.includes("LI ION")) return litio.url;
  if (tec.includes("AGM")) return agm.url;
  if (tec.includes("EFB")) return efb.url;
  return convencional.url;
}
