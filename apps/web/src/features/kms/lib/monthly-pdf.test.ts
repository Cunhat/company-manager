import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMonthlyPdf } from "./monthly-pdf";
import type { KmsJourney } from "../schemas/types";

function journey(overrides: Partial<KmsJourney> = {}): KmsJourney {
  return {
    id: crypto.randomUUID(),
    userId: "alice",
    date: new Date("2026-09-07T00:00:00Z"),
    origin: "Sede",
    destination: "Coimbra",
    reason: "Reunião com equipa técnica",
    isReturn: false,
    description: "Apresentação da proposta",
    distance: 190,
    createdAt: new Date("2026-09-09T12:00:00Z"),
    updatedAt: new Date("2026-09-09T12:00:00Z"),
    ...overrides,
  };
}

describe("monthly PDF export", () => {
  it("produces a European Portuguese PDF with default car and employee details, notes and exact totals", () => {
    const doc = createMonthlyPdf(
      [
        journey(),
        journey({ origin: "Coimbra", destination: "Sede", description: null }),
        journey({ date: new Date("2026-10-01T00:00:00Z"), destination: "Excluded journey" }),
      ],
      "2026-09",
      "  Empresa de exemplo  ",
    );
    const output = doc.output();
    assert.ok(output.startsWith("%PDF-"));
    assert.ok(output.includes("/Lang (pt)"));
    assert.ok(output.includes("Mapa de quilómetros"));
    assert.ok(output.includes("Setembro de 2026"));
    for (const label of [
      "EMPRESA",
      "VIATURA",
      "MATRÍCULA",
      "NOME DO COLABORADOR",
      "DATA DO MAPA",
    ]) {
      assert.ok(output.includes(label), label);
    }
    assert.ok(output.includes("Volvo V40"));
    assert.ok(output.includes("04-VX-77"));
    assert.ok(output.includes("Tiago Cunha"));
    assert.ok(output.includes("Empresa de exemplo"));
    assert.ok(output.includes("30/09/2026"));
    assert.ok(output.includes("Apresentação da proposta"));
    assert.ok(output.includes("380"));
    assert.ok(output.includes("0,40"));
    assert.ok(output.includes("152,00"));
    assert.ok(output.includes("Assinatura"));
    assert.ok(!output.includes("Excluded journey"));
    assert.equal(doc.getNumberOfPages(), 1);
  });

  it("dates reports at month end, including leap years and December", () => {
    for (const [month, date] of [
      ["2026-02", "28/02/2026"],
      ["2028-02", "29/02/2028"],
      ["2026-12", "31/12/2026"],
    ]) {
      const doc = createMonthlyPdf(
        [journey({ date: new Date(`${month}-01T00:00:00Z`) })],
        month,
        "Empresa",
      );
      assert.ok(doc.output().includes(date));
    }
  });

  it("paginates all journeys and prints one final total and signature", () => {
    const rows = Array.from({ length: 80 }, (_, index) =>
      journey({
        destination: `Destino ${String(index).padStart(3, "0")}`,
      }),
    );
    const doc = createMonthlyPdf(rows, "2026-09", "Empresa");
    const output = doc.output();
    assert.ok(doc.getNumberOfPages() > 1);
    for (const row of rows) assert.ok(output.includes(row.destination), row.destination);
    assert.equal(output.match(/Assinatura/g)?.length, 1);
    assert.equal(output.match(/TOTAL A RECEBER/g)?.length, 1);
    assert.equal(output.match(/FINALIDADE/g)?.length, doc.getNumberOfPages());
    for (const value of ["Volvo V40", "04-VX-77", "Tiago Cunha"]) {
      assert.equal(output.split(value).length - 1, doc.getNumberOfPages());
    }
    assert.ok(output.includes(`Página ${doc.getNumberOfPages()} de ${doc.getNumberOfPages()}`));
  });

  it("wraps long descriptions without dropping their end or the signature", () => {
    const doc = createMonthlyPdf(
      [
        journey({
          description: `${"Notas sobre a deslocação e documentos. ".repeat(50)}FIMDASNOTAS`,
        }),
      ],
      "2026-09",
      "Empresa",
    );
    const output = doc.output();
    assert.ok(output.includes("FIMDASNOTAS"));
    assert.ok(output.includes("Assinatura"));
  });

  it("uses edited details between company and report date", () => {
    const output = createMonthlyPdf([journey()], "2026-09", "Example company", {
      car: "  Volvo XC40  ",
      licensePlate: "  AB-12-CD  ",
      employee: "  Alex Smith  ",
    }).output();
    const values = [
      "(Example company)",
      "(Volvo XC40)",
      "(AB-12-CD)",
      "(Alex Smith)",
      "(30/09/2026)",
    ];
    for (const [index, value] of values.entries()) {
      assert.ok(output.includes(value), value);
      if (index > 0) assert.ok(output.indexOf(values[index - 1]!) < output.indexOf(value));
    }
    assert.ok(!output.includes("Tiago Cunha"));
  });

  it("rejects empty and overlong car, plate and employee details", () => {
    const details = { car: "Volvo V40", licensePlate: "04-VX-77", employee: "Tiago Cunha" };
    for (const [field, maxLength] of [
      ["car", 100],
      ["licensePlate", 20],
      ["employee", 100],
    ] as const) {
      for (const value of ["  ", "A".repeat(maxLength + 1)]) {
        assert.throws(() =>
          createMonthlyPdf([journey()], "2026-09", "Company", {
            ...details,
            [field]: value,
          }),
        );
      }
    }
  });

  it("rejects missing company, invalid month and months without journeys", () => {
    assert.throws(() => createMonthlyPdf([journey()], "2026-09", "  "));
    assert.throws(() => createMonthlyPdf([journey()], "2026-09", "A".repeat(251)));
    assert.throws(() => createMonthlyPdf([journey()], "2026-13", "Empresa"));
    assert.throws(() => createMonthlyPdf([journey()], "2026-10", "Empresa"));
    assert.throws(() => createMonthlyPdf([], "2026-09", "Empresa"));
  });
});
