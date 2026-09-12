import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import dayjs from "@/features/kms/lib/dates";
import { defaultExportDetails, type ExportDetails } from "@/features/kms/lib/export-details";
import { exportMonthlyPdfSchema } from "@/features/kms/schemas/validators";
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
  const profile = exportMonthlyPdfSchema.parse({ company, ...details });
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
  doc.setFont("helvetica", "bold").setFontSize(10);
  const companyLines = doc.splitTextToSize(profile.company, contentWidth - 65) as string[];
  const companyHeight = Math.max(16, 9 + companyLines.length * 4.5);
  const employeeLines = doc.splitTextToSize(
    `Funcionário / gerente: ${profile.employee}`,
    contentWidth / 2 - 10,
  ) as string[];
  const vehicleLines = doc.splitTextToSize(
    `Veículo: ${profile.car}    Matrícula: ${profile.licensePlate}`,
    contentWidth / 2 - 10,
  ) as string[];
  const employeeHeight = Math.max(
    12,
    5 + Math.max(employeeLines.length, vehicleLines.length) * 4.5,
  );
  const tableY = 34 + companyHeight + employeeHeight + 4;

  function drawHeader() {
    doc.setTextColor(blue).setFont("helvetica", "bold").setFontSize(21);
    doc.text("MAPA DE AJUDAS DE CUSTO", width / 2, 25, { align: "center" });
    doc.setFillColor("#F3F6F8").rect(margin, 34, contentWidth, companyHeight, "F");
    doc.setFontSize(7).setTextColor(muted);
    doc.text("EMPRESA", margin + 4, 39);
    doc.text("DATA", right - 35, 39);
    doc.setFontSize(10).setTextColor(ink);
    doc.text(companyLines, margin + 4, 44, { lineHeightFactor: 1.28 });
    doc.text(reportDate, right - 35, 44);
    const y = 34 + companyHeight;
    doc.setFillColor("#E2EFD9").rect(margin, y, contentWidth, employeeHeight, "F");
    doc.text(employeeLines, margin + 4, y + 6, { lineHeightFactor: 1.28 });
    doc.text(vehicleLines, margin + contentWidth / 2 + 4, y + 6, { lineHeightFactor: 1.28 });
  }

  let summaryY = tableY;
  autoTable(doc, {
    startY: tableY,
    margin: { top: tableY, bottom: 17, left: margin, right: margin },
    theme: "plain",
    showHead: "everyPage",
    showFoot: "lastPage",
    rowPageBreak: "avoid",
    head: [["DATA", "DESTINO", "TIPO", "FINALIDADE", "% DA DIÁRIA", "VALOR (€)"]],
    body: days.map((day) => [
      dayjs.utc(day.date).format("DD/MM/YYYY"),
      day.destination,
      PDF_TYPE_LABELS[day.type],
      day.reason,
      `${day.percentage}%`,
      `${money.format(allowanceCents(day) / 100)} €`,
    ]),
    // Reserve room for the total, rate note, and signature with the last row.
    foot: [[{ content: "", colSpan: 6 }]],
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
      2: { cellWidth: 50 },
      3: { cellWidth: contentWidth - 169 },
      4: { cellWidth: 24, halign: "center" },
      5: { cellWidth: 27, halign: "right", fontStyle: "bold", textColor: blue },
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
