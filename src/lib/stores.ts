// Identidade visual das 3 lojas emissoras de orçamento

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
  };
  wordmark: string;    // wordmark textual (fallback quando não há logo em imagem)
}

export const STORES: Record<StoreId, StoreIdentity> = {
  disk: {
    id: "disk",
    nome: "Disk Baterias",
    telefone: "(71) 3431-2191",
    whatsapp: "5571343121911",
    vibe: "Serviço ágil, 24 horas.",
    colors: {
      primary: "#0B3D91",   // azul
      secondary: "#FFCC00", // amarelo
      text: "#FFFFFF",
      accent: "#FFCC00",
    },
    wordmark: "DISK BATERIAS",
  },
  casa: {
    id: "casa",
    nome: "Casa das Baterias Salvador",
    telefone: "(71) 2180-0189",
    whatsapp: "5571218001891",
    vibe: "Institucional e confiável.",
    colors: {
      primary: "#0F3B8C",
      secondary: "#FFFFFF",
      text: "#FFFFFF",
      accent: "#0F3B8C",
    },
    wordmark: "CASA DAS BATERIAS SALVADOR",
  },
  start: {
    id: "start",
    nome: "Start Baterias",
    telefone: "(71) 3510-2770",
    whatsapp: "5571351027701",
    vibe: "Energia, performance, moderna.",
    colors: {
      primary: "#C8102E",   // vermelho
      secondary: "#FFFFFF",
      text: "#FFFFFF",
      accent: "#C8102E",
    },
    wordmark: "START BATERIAS",
  },
};

export const STORE_LIST: StoreIdentity[] = [STORES.disk, STORES.casa, STORES.start];
