import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import dayjs from "@/features/kms/lib/dates";
import { defaultExportDetails, type ExportDetails } from "@/features/kms/lib/export-details";
import { exportPerDiemPdfSchema } from "../schemas/validators";
import { allowanceCents, PDF_TYPE_LABELS, perDiemsForMonth } from "./allowances";
import type { PerDiem } from "../schemas/types";

const money = new Intl.NumberFormat("pt-PT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const periodFormatter = new Intl.DateTimeFormat("pt-PT", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const blue = "#214F77";
const ink = "#20364B";
const muted = "#647789";
const rule = "#CAD6DF";

export function createPerDiemPdf(
  entries: PerDiem[],
  month: string,
  company: string,
  details: ExportDetails = defaultExportDetails,
) {
  const profile = exportPerDiemPdfSchema.parse({ company, ...details });
  const days = perDiemsForMonth(entries, month);
  if (!days.length) throw new Error("There are no per diems to export for this month.");
  if (new Set(days.map((day) => day.date)).size !== days.length)
    throw new Error("Duplicate allowance dates must be resolved before exporting.");
  const totalCents = days.reduce((sum, day) => sum + allowanceCents(day), 0);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = width - 2 * margin;
  const right = width - margin;
  const period = periodFormatter.format(dayjs.utc(month).toDate());
  const reportDate = dayjs.utc(month).endOf("month").format("DD/MM/YYYY");
  doc.setLanguage("pt");
  doc.setProperties({
    title: `Mapa de ajudas de custo - ${period}`,
    subject: `Ajudas de custo de ${profile.company} - ${reportDate}`,
    author: profile.company,
    creator: "Company Manager",
  });
  const headerFields = [
    { label: "Empresa", value: profile.company, share: 0.4 },
    { label: "Funcionário / gerente", value: profile.employee, share: 0.22 },
    { label: "Veículo", value: profile.car, share: 0.16 },
    { label: "Matrícula", value: profile.licensePlate, share: 0.11 },
    { label: "Data", value: reportDate, share: 0.11 },
  ];
  doc.setFont("helvetica", "bold").setFontSize(9);
  const headerColumns = headerFields.map((field) => ({
    ...field,
    width: contentWidth * field.share,
    lines: doc.splitTextToSize(field.value, contentWidth * field.share - 8) as string[],
  }));
  const headerHeight = Math.max(
    16,
    10 + Math.max(...headerColumns.map((field) => field.lines.length)) * 4,
  );
  const tableY = 34 + headerHeight + 4;

  function drawHeader() {
    doc.setTextColor(blue).setFont("helvetica", "bold").setFontSize(21);
    doc.text("MAPA DE AJUDAS DE CUSTO", width / 2, 25, { align: "center" });
    doc.setFillColor("#F3F6F8").rect(margin, 34, contentWidth, headerHeight, "F");
    let x = margin;
    for (const [index, field] of headerColumns.entries()) {
      if (index > 0) {
        doc.setDrawColor(rule).setLineWidth(0.25);
        doc.line(x, 37, x, 34 + headerHeight - 3);
      }
      doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(muted);
      doc.text(field.label, x + 4, 39);
      doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(ink);
      doc.text(field.lines, x + 4, 44, { lineHeightFactor: 1.28 });
      x += field.width;
    }
  }

  let summaryY = tableY;
  autoTable(doc, {
    startY: tableY,
    margin: { top: tableY, bottom: 17, left: margin, right: margin },
    theme: "plain",
    showHead: "everyPage",
    showFoot: "lastPage",
    rowPageBreak: "avoid",
    head: [["DATA", "PERCURSO", "TIPO", "FINALIDADE", "DESCRIÇÃO", "% DA DIÁRIA", "VALOR (€)"]],
    body: days.map((day) => [
      dayjs.utc(day.date).format("DD/MM/YYYY"),
      `${day.sourceOrigin} > ${day.destination}`,
      PDF_TYPE_LABELS[day.type],
      day.reason,
      day.description,
      `${day.percentage}%`,
      `${money.format(allowanceCents(day) / 100)} €`,
    ]),
    // Reserve room for the total, rate note, and signature with the last row.
    foot: [[{ content: "", colSpan: 7 }]],
    footStyles: { minCellHeight: 44, fillColor: "#FFFFFF", lineWidth: 0 },
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: { top: 1.4, bottom: 1.4, left: 2.5, right: 2.5 },
      lineColor: "#FFFFFF",
      lineWidth: { bottom: 0.35 },
      textColor: ink,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: { fillColor: blue, textColor: "#FFFFFF", fontStyle: "bold", fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25, textColor: muted },
      1: { cellWidth: 43, fontStyle: "bold" },
      2: { cellWidth: 38 },
      3: { cellWidth: contentWidth - 187 },
      4: { cellWidth: 30 },
      5: { cellWidth: 24, halign: "center" },
      6: { cellWidth: 27, halign: "right", fontStyle: "bold", textColor: blue },
    },
    didParseCell: ({ section, row, cell }) => {
      if (section === "body")
        cell.styles.fillColor = days[row.index].type === "daily" ? "#E2EFD9" : "#DEEBF7";
    },
    willDrawPage: drawHeader,
    didDrawCell: ({ section, cell }) => {
      if (section === "foot") summaryY = cell.y;
    },
  });
  doc.setFillColor("#D6DEE7").rect(margin, summaryY, contentWidth, 11, "F");
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(ink);
  doc.text("TOTAL AJUDAS DE CUSTO A PROCESSAR", right - 34, summaryY + 7, { align: "right" });
  doc.setTextColor(blue).setFontSize(12);
  const totalText = `${money.format(totalCents / 100)} €`;
  if (doc.getTextWidth(totalText) > 29) doc.setFontSize((12 * 29) / doc.getTextWidth(totalText));
  doc.text(totalText, right - 3, summaryY + 7, { align: "right" });
  const rateNote = [
    ...new Set(
      days.map(
        (day) =>
          `${day.territory === "portugal" ? "Portugal" : "Estrangeiro"}: ${money.format(day.dailyRateCents / 100)} €/dia`,
      ),
    ),
  ].join(" | ");
  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(muted);
  // The common rate note is useful for mixed domestic/foreign reports. Keep unusually varied rates in the saved entries.
  const rateText = `Diárias utilizadas - ${rateNote}`;
  if (doc.getTextWidth(rateText) <= contentWidth) doc.text(rateText, margin, summaryY + 17);
  doc.setFontSize(9).setTextColor(ink);
  doc.text("ASSINATURA:", margin + contentWidth / 2, summaryY + 32);
  doc.setDrawColor(rule).setLineWidth(0.3);
  doc.line(margin + contentWidth / 2 + 25, summaryY + 32, right, summaryY + 32);
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc
      .setDrawColor(rule)
      .setLineWidth(0.2)
      .line(margin, height - 12, right, height - 12);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(muted);
    doc.text(`Mapa de ajudas de custo | ${period}`, margin, height - 7.5);
    doc.text(`Página ${page} de ${pages}`, right, height - 7.5, { align: "right" });
  }
  return doc;
}

export async function downloadPerDiemPdf(
  entries: PerDiem[],
  month: string,
  company: string,
  details: ExportDetails = defaultExportDetails,
) {
  await createPerDiemPdf(entries, month, company, details).save(
    `mapa-ajudas-de-custo-${month}.pdf`,
    { returnPromise: true },
  );
}
