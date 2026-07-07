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
    primary: string;
    secondary: string;
    text: string;
    accent: string;
    headerBg: string;
  };
  wordmark: string;
  logoUrl: string;
  /** true = logo já traz texto branco; NÃO envolver em chip branco. */
  logoOnDark: boolean;
  /** Cor do chip que envolve a logo no cabeçalho. */
  logoChipBg: string;
  /** Introdução da mensagem de WhatsApp (usa {cliente} e {loja}). */
  whatsappIntro: string;
  /** Assinatura no rodapé da mensagem de WhatsApp. */
  whatsappOutro: string;
  /** Condições comerciais impressas no rodapé do orçamento e no WhatsApp. */
  footerConditions: string[];
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
    logoOnDark: true,
    logoChipBg: "#0B3D91",
    whatsappIntro:
      "Olá{cliente}! Aqui é da *Disk Baterias 24 Horas* 🔋\nAtendimento 24h, entrega expressa e instalação no local. Segue seu orçamento:",
    whatsappOutro:
      "Qualquer dúvida estamos à disposição 24h — Disk Baterias (71) 3431-2191.",
    footerConditions: [
      "Valores promocionais condicionados à devolução da bateria usada (base de troca).",
      "Pagamento no local em até 10x sem juros no cartão.",
      "Atendimento 24 horas em Salvador e região metropolitana.",
      "Taxa de visita técnica de R$ 45,00 caso o problema constatado não seja a bateria.",
    ],
  },
  casa: {
    id: "casa",
    nome: "Casa das Baterias Salvador",
    telefone: "(71) 2180-0189",
    whatsapp: "5571218001891",
    vibe: "Tradição, confiança e garantia em baterias automotivas.",
    colors: {
      primary: "#0F3B8C",
      secondary: "#F5A623",
      text: "#FFFFFF",
      accent: "#0F3B8C",
      headerBg: "#0F3B8C",
    },
    wordmark: "CASA DAS BATERIAS SALVADOR",
    logoUrl: logoCasa.url,
    // A logo original tem texto branco — exibir direto sobre o azul do cabeçalho.
    logoOnDark: true,
    logoChipBg: "#0F3B8C",
    whatsappIntro:
      "Olá{cliente}! Aqui é da *Casa das Baterias Salvador* 🔋\nTradição e garantia em baterias automotivas. Segue seu orçamento:",
    whatsappOutro:
      "Estamos à disposição na Casa das Baterias — (71) 2180-0189.",
    footerConditions: [
      "Valores promocionais condicionados à devolução da bateria usada (base de troca).",
      "Pagamento no local em até 10x sem juros no cartão.",
      "Garantia integral do fabricante em todos os produtos.",
      "Taxa de visita técnica de R$ 45,00 caso o problema constatado não seja a bateria.",
    ],
  },
  start: {
    id: "start",
    nome: "Start Baterias",
    telefone: "(71) 3510-2770",
    whatsapp: "5571351027701",
    vibe: "Energia, performance e agilidade para o seu dia a dia.",
    colors: {
      primary: "#C8102E",
      secondary: "#111111",
      text: "#FFFFFF",
      accent: "#C8102E",
      headerBg: "#111111",
    },
    wordmark: "START BATERIAS",
    logoUrl: logoStart.url,
    logoOnDark: false,
    logoChipBg: "#FFFFFF",
    whatsappIntro:
      "Olá{cliente}! Aqui é da *Start Baterias* ⚡\nEnergia e performance para o seu veículo. Segue seu orçamento:",
    whatsappOutro:
      "Conte com a Start Baterias — (71) 3510-2770.",
    footerConditions: [
      "Valores promocionais condicionados à devolução da bateria usada (base de troca).",
      "Pagamento no local em até 10x sem juros no cartão.",
      "Instalação gratuita no local para clientes da região.",
      "Taxa de visita técnica de R$ 45,00 caso o problema constatado não seja a bateria.",
    ],
  },
};

export const STORE_LIST: StoreIdentity[] = [STORES.disk, STORES.casa, STORES.start];
