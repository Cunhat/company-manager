import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import dayjs from "./dates";
import { generateMonthlyMap } from "./maps";
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
) {
  const companyName = company.trim();
  if (!companyName || companyName.length > 250) {
    throw new Error(
      "Indique o nome da empresa, com um máximo de 250 caracteres.",
    );
  }

  const map = generateMonthlyMap(journeys, month);
  if (map.entries.length === 0) {
    throw new Error("Não existem deslocações para exportar neste mês.");
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
  const companyLines: string[] = doc.splitTextToSize(
    companyName,
    contentWidth - 78,
  );
  const companyBoxHeight = Math.max(19, 12 + companyLines.length * 4.5);
  const tableY = 35 + companyBoxHeight + 5;

  function drawHeader() {
    doc.setTextColor(blue).setFontSize(22);
    doc.text("Mapa de quilómetros", margin, 26);
    doc.setFont("helvetica", "normal").setFontSize(11);
    doc.text(periodTitle, right, 25.5, { align: "right" });

    doc
      .setFillColor(paper)
      .roundedRect(margin, 35, contentWidth, companyBoxHeight, 1.5, 1.5, "F");
    doc.setTextColor(muted).setFont("helvetica", "bold").setFontSize(7);
    doc.text("EMPRESA", margin + 5, 41);
    doc.text("DATA DO MAPA", right - 50, 41);
    doc.setDrawColor(rule).setLineWidth(0.2);
    doc.line(right - 57, 39, right - 57, 35 + companyBoxHeight - 4);
    doc.setTextColor(ink).setFontSize(10);
    doc.text(companyLines, margin + 5, 47, { lineHeightFactor: 1.28 });
    doc.text(reportDate, right - 50, 47);
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
    footStyles: { minCellHeight: 51, fillColor: "#FFFFFF", lineWidth: 0 },
    head: [
      [
        "DATA",
        "TRAJETO PERCORRIDO",
        "FINALIDADE",
        "KM",
        "OBSERVAÇÕES",
        "VALOR (€)",
      ],
    ],
    body: map.entries.map((entry) => [
      dayjs.utc(entry.date).format("DD/MM/YYYY"),
      `${entry.origin} - ${entry.destination}`,
      entry.reason,
      numberFormatter.format(entry.distance),
      entry.description ?? "",
      moneyFormatter.format(entry.amountCents / 100),
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
      if (section === "foot") summaryY = cell.y + 5;
    },
  });

  const totalWidth = 100;
  const detailWidth = (contentWidth - totalWidth) / 2;
  const totalX = right - totalWidth;
  doc.setFillColor(paper).rect(margin, summaryY, contentWidth, 21, "F");
  doc.setFillColor(blue).rect(totalX, summaryY, totalWidth, 21, "F");
  doc.setTextColor(muted).setFont("helvetica", "bold").setFontSize(7);
  doc.text("TOTAL DE QUILÓMETROS", margin + 5, summaryY + 6);
  doc.text("VALOR UNITÁRIO", margin + detailWidth + 5, summaryY + 6);
  doc.setDrawColor(rule).setLineWidth(0.2);
  doc.line(
    margin + detailWidth,
    summaryY + 4,
    margin + detailWidth,
    summaryY + 17,
  );
  doc.setTextColor(blue).setFontSize(16);
  doc.text(
    `${numberFormatter.format(map.totalKilometres)} km`,
    margin + 5,
    summaryY + 15,
  );
  doc.setFontSize(13);
  doc.text(
    `${moneyFormatter.format(map.ratePerKm)} €/km`,
    margin + detailWidth + 5,
    summaryY + 15,
  );
  doc.setTextColor("#FFFFFF").setFontSize(7);
  doc.text("TOTAL A RECEBER", totalX + 6, summaryY + 6);
  const totalText = `${moneyFormatter.format(map.totalAmountCents / 100)} €`;
  doc.setFontSize(20);
  // Preserve the full amount even for unusually large totals.
  const amountWidth = doc.getTextWidth(totalText);
  if (amountWidth > totalWidth - 12)
    doc.setFontSize((20 * (totalWidth - 12)) / amountWidth);
  doc.text(totalText, right - 6, summaryY + 16, { align: "right" });

  doc.setDrawColor(rule).setLineWidth(0.3);
  doc.line(right - 95, summaryY + 40, right, summaryY + 40);
  doc.setTextColor(muted).setFont("helvetica", "normal").setFontSize(8);
  doc.text("Assinatura", right - 95, summaryY + 45);

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
) {
  const doc = createMonthlyPdf(journeys, month, company);
  await doc.save(`mapa-quilometros-${month}.pdf`, { returnPromise: true });
}
