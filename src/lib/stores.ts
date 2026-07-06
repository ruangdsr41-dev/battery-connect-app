// Identidade visual das 3 lojas emissoras de orçamento
import logoDisk from "@/assets/lojas/logo-disk.png.asset.json";
import logoCasa from "@/assets/lojas/logo-casa.webp.asset.json";
import logoStart from "@/assets/lojas/logo-start.webp.asset.json";

export type StoreId = "disk" | "casa" | "start";

export interface StoreIdentity {
  id: StoreId;
  nome: string;
  telefone: string;
  whatsapp: string; // apenas dígitos para wa.me
  vibe: string;
  colors: {
    primary: string;   // cor de destaque forte
    secondary: string; // cor complementar
    text: string;      // cor do texto sobre o cabeçalho
    accent: string;    // cor para bordas / destaques suaves
    headerBg: string;  // cor de fundo do cabeçalho onde a logo é aplicada
  };
  wordmark: string;
  logoUrl: string;
}

export const STORES: Record<StoreId, StoreIdentity> = {
  disk: {
    id: "disk",
    nome: "Disk Baterias 24 Horas",
    telefone: "(71) 3431-2191",
    whatsapp: "5571343121911",
    vibe: "Há mais de 40 anos oferecendo confiança, agilidade e atendimento especializado em baterias.",
    colors: {
      primary: "#0B3D91",
      secondary: "#FFCC00",
      text: "#FFFFFF",
      accent: "#FFCC00",
      headerBg: "#0B3D91",
    },
    wordmark: "DISK BATERIAS",
    logoUrl: logoDisk.url,
  },
  casa: {
    id: "casa",
    nome: "Casa das Baterias Salvador",
    telefone: "(71) 2180-0189",
    whatsapp: "5571218001891",
    vibe: "Tradição, confiança e garantia.",
    colors: {
      primary: "#0F3B8C",
      secondary: "#F5A623",
      text: "#FFFFFF",
      accent: "#0F3B8C",
      headerBg: "#0F3B8C",
    },
    wordmark: "CASA DAS BATERIAS SALVADOR",
    logoUrl: logoCasa.url,
  },
  start: {
    id: "start",
    nome: "Start Baterias",
    telefone: "(71) 3510-2770",
    whatsapp: "5571351027701",
    vibe: "Energia, performance e agilidade.",
    colors: {
      primary: "#C8102E",
      secondary: "#111111",
      text: "#FFFFFF",
      accent: "#C8102E",
      headerBg: "#111111",
    },
    wordmark: "START BATERIAS",
    logoUrl: logoStart.url,
  },
};

export const STORE_LIST: StoreIdentity[] = [STORES.disk, STORES.casa, STORES.start];
