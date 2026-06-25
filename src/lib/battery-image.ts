import convencional from "@/assets/baterias/moura_pack.png.asset.json";
import efb from "@/assets/baterias/efb.png.asset.json";
import agm from "@/assets/baterias/agm.png.asset.json";
import litio from "@/assets/baterias/litio-auto-leve.webp.asset.json";
import motoAgm from "@/assets/baterias/moto_agm.png.asset.json";
import motoVentilada from "@/assets/baterias/moto-ventilada.webp.asset.json";
import pesada from "@/assets/baterias/bus-truck-frontal.webp.asset.json";
import type { BatteryApplication } from "@/lib/sheet.functions";

const norm = (s?: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

export function getBatteryImage(app: BatteryApplication): {
  url: string;
  label: string;
} {
  // Prefer image URL from the spreadsheet column (per-code override)
  if (app.imagemUrl && /^https?:\/\//i.test(app.imagemUrl)) {
    return { url: app.imagemUrl, label: app.tecnologia || "Bateria" };
  }
  const t = norm(app.tecnologia);
  const cat = app.category;

  if (cat === "motos") {
    if (t.includes("VENTILADA")) return { url: motoVentilada.url, label: "Moto Ventilada" };
    return { url: motoAgm.url, label: "Moto VRLA/AGM" };
  }

  if (cat === "caminhoes") {
    return { url: pesada.url, label: "Automotiva Pesada" };
  }

  // carros
  if (t.includes("LITIO") || t.includes("LI-ION")) return { url: litio.url, label: "Automotiva Lítio" };
  if (t.includes("AGM")) return { url: agm.url, label: "Automotiva AGM" };
  if (t.includes("EFB")) return { url: efb.url, label: "Automotiva EFB" };
  return { url: convencional.url, label: "Automotiva Convencional" };
}
