import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { BatteryApplication } from "./sheet.functions";

export function generateBatteryPDF(app: BatteryApplication) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(0, 52, 120); // azul Moura
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("MOURA", 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Ficha de Aplicação de Bateria", 14, 21);

  doc.setFillColor(255, 209, 0); // amarelo
  doc.rect(0, 28, W, 2, "F");

  // Vehicle
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`${app.marca} ${app.modelo}`, 14, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(
    [app.ano, app.motorizacao].filter(Boolean).join(" · ") || "—",
    14,
    49,
  );

  // Bateria destaque
  doc.setFillColor(255, 209, 0);
  doc.roundedRect(14, 56, W - 28, 16, 2, 2, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(app.codigoMoura || "—", 18, 67);
  if (app.codigoAlternativo) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`alt: ${app.codigoAlternativo}`, W - 18, 67, { align: "right" });
  }

  autoTable(doc, {
    startY: 80,
    head: [["Especificação", "Valor"]],
    body: [
      ["Categoria", app.category],
      ["Tecnologia", app.tecnologia || "—"],
      ["Amperagem", app.amperagem || "—"],
      ["Voltagem", app.voltagem || "—"],
      ["CCA", app.cca || "—"],
      ["Start-Stop", app.startStop || "—"],
      ["Garantia (meses)", app.garantia || "—"],
      ["Validado", app.validado || "—"],
      ["Comprimento (mm)", app.comprimento || "—"],
      ["Largura (mm)", app.largura || "—"],
      ["Altura (mm)", app.altura || "—"],
      ["Peso (kg)", app.peso || "—"],
    ],
    theme: "striped",
    headStyles: { fillColor: [0, 52, 120], textColor: 255 },
    styles: { fontSize: 10 },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  if (app.obs) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Observações", 14, finalY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(app.obs, W - 28), 14, finalY + 6);
  }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Gerado em ${new Date().toLocaleString("pt-BR")} · Moura Aplicações`,
    14,
    doc.internal.pageSize.getHeight() - 8,
  );

  doc.save(`moura-${app.codigoMoura || "bateria"}-${app.marca}-${app.modelo}.pdf`);
}

export function buildWhatsAppLink(app: BatteryApplication) {
  const linhas = [
    `🔋 *Bateria Moura ${app.codigoMoura || ""}*`,
    `Veículo: ${app.marca} ${app.modelo} (${app.ano})`,
    app.motorizacao && `Motor: ${app.motorizacao}`,
    app.amperagem && `Amperagem: ${app.amperagem}Ah`,
    app.cca && `CCA: ${app.cca}`,
    app.tecnologia && `Tecnologia: ${app.tecnologia}`,
    app.garantia && `Garantia: ${app.garantia} meses`,
    app.obs && `Obs: ${app.obs}`,
  ].filter(Boolean);
  const texto = encodeURIComponent(linhas.join("\n"));
  return `https://wa.me/?text=${texto}`;
}
