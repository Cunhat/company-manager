import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import dayjs from "./dates";
import { generateMonthlyMap } from "./maps";
import { defaultExportDetails, type ExportDetails } from "./export-details";
import type { KmsJourney } from "../schemas/types";

const numberFormatter = new Intl.NumberFormat("pt-PT", {
  maximumFractionDigits: 1,
});
const moneyFormatter = new Intl.NumberFormat("pt-PT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const monthFormatter = new Intl.DateTimeFormat("pt-PT", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// A restrained print palette, inspired by the company's expense reports.
const ink = "#20364B";
const blue = "#214F77";
const muted = "#647789";
const rule = "#CAD6DF";
const sage = "#EAF1E2";
const mist = "#EAF1F7";
const paper = "#F3F6F8";

export function createMonthlyPdf(
  journeys: KmsJourney[],
  month: string,
  company: string,
  details: ExportDetails = defaultExportDetails,
) {
  const companyName = company.trim();
  if (!companyName || companyName.length > 250) {
    throw new Error("Enter a company name with no more than 250 characters.");
  }

  const car = details.car.trim();
  const licensePlate = details.licensePlate.trim();
  const employee = details.employee.trim();
  for (const [label, value, maxLength] of [
    ["car", car, 100],
    ["license plate", licensePlate, 20],
    ["employee name", employee, 100],
  ] as const) {
    if (!value || value.length > maxLength) {
      throw new Error(`Enter a ${label} with no more than ${maxLength} characters.`);
    }
  }

  const map = generateMonthlyMap(journeys, month);
  if (map.entries.length === 0) {
    throw new Error("There are no journeys to export for this month.");
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = width - margin * 2;
  const right = width - margin;
  const reportDate = dayjs.utc(month).endOf("month").format("DD/MM/YYYY");
  const period = monthFormatter.format(dayjs.utc(month).toDate());
  const periodTitle = period.charAt(0).toUpperCase() + period.slice(1);
  doc.setLanguage("pt");
  doc.setProperties({
    title: `Mapa de quilómetros - ${period}`,
    subject: `Deslocações de ${companyName} - ${reportDate}`,
    author: companyName,
    creator: "Company Manager",
  });

  doc.setFont("helvetica", "bold").setFontSize(10);
  const headerFields = [
    { label: "EMPRESA", value: companyName, width: contentWidth - 171 },
    { label: "VIATURA", value: car, width: 45 },
    { label: "MATRÍCULA", value: licensePlate, width: 36 },
    { label: "NOME DO COLABORADOR", value: employee, width: 53 },
    { label: "DATA DO MAPA", value: reportDate, width: 37 },
  ].map((field) => ({
    ...field,
    lines: doc.splitTextToSize(field.value, field.width - 10) as string[],
  }));
  const companyBoxHeight = Math.max(
    19,
    12 + Math.max(...headerFields.map((field) => field.lines.length)) * 4.5,
  );
  const tableY = 35 + companyBoxHeight + 5;

  function drawHeader() {
    doc.setTextColor(blue).setFont("helvetica", "bold").setFontSize(22);
    doc.text("Mapa de quilómetros", margin, 26);
    doc.setFont("helvetica", "normal").setFontSize(11);
    doc.text(periodTitle, right, 25.5, { align: "right" });

    doc.setFillColor(paper).roundedRect(margin, 35, contentWidth, companyBoxHeight, 1.5, 1.5, "F");
    let fieldX = margin;
    for (const [index, field] of headerFields.entries()) {
      if (index > 0) {
        doc.setDrawColor(rule).setLineWidth(0.2);
        doc.line(fieldX, 39, fieldX, 35 + companyBoxHeight - 4);
      }
      doc.setTextColor(muted).setFont("helvetica", "bold").setFontSize(7);
      doc.text(field.label, fieldX + 5, 41);
      doc.setTextColor(ink).setFontSize(10);
      doc.text(field.lines, fieldX + 5, 47, { lineHeightFactor: 1.28 });
      fieldX += field.width;
    }
  }

  // Adjacent journeys on the same date share a tint, keeping return legs easy to scan.
  let dateGroup = -1;
  let previousDate = "";
  const rowColours = map.entries.map((entry) => {
    if (entry.date !== previousDate) dateGroup++;
    previousDate = entry.date;
    return dateGroup % 2 === 0 ? sage : mist;
  });

  let summaryY = tableY;
  autoTable(doc, {
    startY: tableY,
    margin: { top: tableY, bottom: 17, left: margin, right: margin },
    theme: "plain",
    showHead: "everyPage",
    showFoot: "lastPage",
    rowPageBreak: "avoid",
    // Reserve the totals and signature with the final journey, avoiding an orphaned summary.
    foot: [[{ content: "", colSpan: 6 }]],
    footStyles: { minCellHeight: 48, fillColor: "#FFFFFF", lineWidth: 0 },
    head: [["DATA", "TRAJETO PERCORRIDO", "FINALIDADE", "KM", "OBSERVAÇÕES", "VALOR"]],
    body: map.entries.map((entry) => [
      dayjs.utc(entry.date).format("DD/MM/YYYY"),
      `${entry.origin} - ${entry.destination}`,
      entry.reason,
      numberFormatter.format(entry.distance),
      entry.description ?? "",
      `${moneyFormatter.format(entry.amountCents / 100)} €`,
    ]),
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
    headStyles: {
      fillColor: blue,
      textColor: "#FFFFFF",
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: { top: 2.7, bottom: 2.7, left: 2.5, right: 2.5 },
    },
    columnStyles: {
      0: { cellWidth: 25, textColor: muted },
      1: { cellWidth: 63, fontStyle: "bold" },
      2: { cellWidth: 60 },
      3: { cellWidth: 23, halign: "right", fontStyle: "bold" },
      4: { cellWidth: contentWidth - 198, textColor: muted },
      5: { cellWidth: 27, halign: "right", fontStyle: "bold", textColor: blue },
    },
    didParseCell: ({ section, row, cell }) => {
      if (section === "body") cell.styles.fillColor = rowColours[row.index];
    },
    willDrawPage: drawHeader,
    didDrawCell: ({ section, cell }) => {
      if (section === "foot") summaryY = cell.y + 3;
    },
  });

  const summaryLeft = right - 95;
  const summaryRows = [
    {
      label: "Total de quilómetros",
      value: `${numberFormatter.format(map.totalKilometres)} km`,
      y: 4,
    },
    {
      label: "Valor por quilómetro",
      value: `${moneyFormatter.format(map.ratePerKm)} €`,
      y: 10,
    },
    {
      label: "TOTAL A RECEBER",
      value: `${moneyFormatter.format(map.totalAmountCents / 100)} €`,
      y: 18,
    },
  ];

  for (const [index, row] of summaryRows.entries()) {
    const isTotal = index === 2;
    doc.setFont("helvetica", isTotal ? "bold" : "normal");
    doc.setTextColor(isTotal ? blue : muted).setFontSize(9);
    doc.text(row.label, summaryLeft, summaryY + row.y);
    const fontSize = isTotal ? 11 : 9;
    doc.setTextColor(isTotal ? blue : ink).setFontSize(fontSize);
    // Keep all values in the same column, including unusually large totals.
    const valueWidth = doc.getTextWidth(row.value);
    if (valueWidth > 50) doc.setFontSize((fontSize * 50) / valueWidth);
    doc.text(row.value, right, summaryY + row.y, { align: "right" });
  }

  doc.setDrawColor(rule).setLineWidth(0.2);
  doc.line(summaryLeft, summaryY + 13, right, summaryY + 13);
  doc.setLineWidth(0.3);
  doc.line(summaryLeft, summaryY + 37, right, summaryY + 37);
  doc.setTextColor(muted).setFont("helvetica", "normal").setFontSize(8);
  doc.text("Assinatura", summaryLeft, summaryY + 42);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(rule).setLineWidth(0.2);
    doc.line(margin, height - 12, right, height - 12);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(muted);
    doc.text(`Mapa de quilómetros | ${periodTitle}`, margin, height - 7.5);
    doc.text(`Página ${page} de ${pages}`, right, height - 7.5, {
      align: "right",
    });
  }
  return doc;
}

export async function downloadMonthlyPdf(
  journeys: KmsJourney[],
  month: string,
  company: string,
  details: ExportDetails = defaultExportDetails,
) {
  const doc = createMonthlyPdf(journeys, month, company, details);
  await doc.save(`mapa-quilometros-${month}.pdf`, { returnPromise: true });
}
