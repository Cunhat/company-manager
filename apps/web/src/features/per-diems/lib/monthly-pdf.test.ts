import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PerDiem } from "../schemas/types";
import { createPerDiemPdf } from "./monthly-pdf";

function entry(overrides: Partial<PerDiem> = {}): PerDiem {
  return {
    id: crypto.randomUUID(),
    userId: "alice",
    sourceJourneyId: null,
    date: "2026-08-03",
    destination: "PMI Lisboa",
    reason: "Reunião com equipa técnica - 6 a 8 h no local",
    type: "daily",
    territory: "portugal",
    dailyRateCents: 7265,
    percentage: 25,
    sourceOrigin: "Sede",
    sourceDistance: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function exampleEntries(): PerDiem[] {
  return [
    entry(),
    entry({
      date: "2026-08-06",
      destination: "Coimbra",
      type: "departure",
      percentage: 100,
      reason: "Reunião com equipa técnica - pernoita em Coimbra",
    }),
    entry({
      date: "2026-08-07",
      destination: "Coimbra",
      type: "return",
      reason: "Reunião com equipa técnica - pernoita em Coimbra",
    }),
    entry({ date: "2026-08-10" }),
    entry({ date: "2026-08-17" }),
    entry({
      date: "2026-08-25",
      destination: "Emagine Office Porto",
      type: "departure",
      percentage: 100,
      reason: "Trabalho no escritório Porto - pernoita",
    }),
    entry({
      date: "2026-08-26",
      destination: "Emagine Office Porto",
      type: "intermediate",
      percentage: 100,
      reason: "Trabalho no escritório Porto - pernoita",
    }),
    entry({
      date: "2026-08-27",
      destination: "Emagine Office Porto",
      type: "return",
      reason: "Trabalho no escritório Porto - pernoita",
    }),
    entry({ date: "2026-08-31" }),
  ];
}

describe("per diem PDF", () => {
  it("matches the supplied example and its €326.91 total with manager, vehicle and signature", () => {
    const doc = createPerDiemPdf(exampleEntries(), "2026-08", "TIAGO MARQUES CUNHA Unipessoal Lda");
    const output = doc.output();
    for (const text of [
      "%PDF-",
      "MAPA DE AJUDAS DE CUSTO",
      "DESTINO",
      "FINALIDADE",
      "Diária",
      "31/08/2026",
      "Tiago Cunha",
      "Volvo V40",
      "04-VX-77",
      "326,91",
      "ASSINATURA",
      "TOTAL AJUDAS DE CUSTO A PROCESSAR",
    ])
      assert.ok(output.includes(text), text);
    assert.equal(doc.getNumberOfPages(), 1);
  });
  it("filters the month, sorts dates, and sums stored historical rates", () => {
    const output = createPerDiemPdf(
      [
        entry({ date: "2026-08-10", dailyRateCents: 6000, percentage: 100 }),
        entry({ date: "2026-09-01", destination: "Excluded" }),
        entry(),
      ],
      "2026-08",
      "Empresa",
    ).output();
    assert.ok(output.includes("78,16"));
    assert.ok(!output.includes("Excluded"));
    assert.ok(output.indexOf("(03/08/2026)") < output.indexOf("(10/08/2026)"));
  });
  it("uses edited export details and leap-year month end", () => {
    const output = createPerDiemPdf([entry({ date: "2028-02-29" })], "2028-02", " Outra Empresa ", {
      car: "Carro B",
      licensePlate: "AA-00-BB",
      employee: "Maria Silva",
    }).output();
    for (const text of ["Outra Empresa", "Carro B", "AA-00-BB", "Maria Silva", "29/02/2028"])
      assert.ok(output.includes(text));
    assert.ok(!output.includes("Tiago Cunha"));
  });
  it("paginates a full month and repeats headers with one total and signature", () => {
    const days = Array.from({ length: 31 }, (_, index) =>
      entry({
        date: `2026-08-${String(index + 1).padStart(2, "0")}`,
        destination: `Destino ${index + 1}`,
        reason:
          "Reunião com a equipa técnica para revisão do projeto e preparação de entregas ao cliente. ".repeat(
            3,
          ),
      }),
    );
    const doc = createPerDiemPdf(days, "2026-08", "Empresa");
    const output = doc.output();
    assert.ok(doc.getNumberOfPages() > 1);
    for (const day of days) assert.ok(output.includes(day.destination), day.destination);
    assert.equal(output.match(/ASSINATURA/g)?.length, 1);
    assert.equal(output.match(/TOTAL AJUDAS DE CUSTO A PROCESSAR/g)?.length, 1);
    assert.equal(output.match(/FINALIDADE/g)?.length, doc.getNumberOfPages());
    assert.ok(output.includes("562,96"));
  });
  it("rejects duplicate dates, missing details, invalid months and empty months", () => {
    assert.throws(() => createPerDiemPdf([entry(), entry()], "2026-08", "Empresa"));
    assert.throws(() => createPerDiemPdf([entry()], "2026-08", " "));
    assert.throws(() => createPerDiemPdf([entry()], "2026-13", "Empresa"));
    assert.throws(() => createPerDiemPdf([entry()], "2026-09", "Empresa"));
    assert.throws(() => createPerDiemPdf([], "2026-08", "Empresa"));
  });
});
