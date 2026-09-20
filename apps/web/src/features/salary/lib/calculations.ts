import { salaryValuesSchema, type PayrollKind, type SalaryValues } from "../schemas/validators";

export const KIND_LABELS = {
  monthly: "Monthly salary",
  holiday: "Subsídio de férias",
  christmas: "Subsídio de Natal",
} as const;
export const PAYMENT_LABELS = {
  salary: "Personal transfer",
  ss: "Segurança Social + TSU",
  irs: "IRS",
} as const;
export const DEFAULT_VALUES: SalaryValues = {
  grossCents: 175000,
  mealCents: 13000,
  ssRate: 1100,
  tsuRate: 2375,
  irsRate: 1303,
  irsOverrideCents: null,
};
export type TravelTotals = {
  perDiemCents: number;
  mileageCents: number;
  kilometres: number;
  perDiemDays: number;
};
export const NO_TRAVEL: TravelTotals = {
  perDiemCents: 0,
  mileageCents: 0,
  kilometres: 0,
  perDiemDays: 0,
};

export function calculateSalary(
  input: SalaryValues,
  kind: PayrollKind = "monthly",
  travel: TravelTotals = NO_TRAVEL,
) {
  const values = salaryValuesSchema.parse(input);
  const ssCents = Math.round((values.grossCents * values.ssRate) / 10_000);
  const tsuCents = Math.round((values.grossCents * values.tsuRate) / 10_000);
  const irsCents =
    values.irsOverrideCents ?? Math.round((values.grossCents * values.irsRate) / 10_000);
  const mealCents = kind === "monthly" ? values.mealCents : 0;
  const perDiemCents = kind === "monthly" ? travel.perDiemCents : 0;
  const mileageCents = kind === "monthly" ? travel.mileageCents : 0;
  const netSalaryCents = values.grossCents - ssCents - irsCents;
  const netCents = netSalaryCents + mealCents + perDiemCents + mileageCents;
  return {
    ssCents,
    tsuCents,
    irsCents,
    mealCents,
    perDiemCents,
    mileageCents,
    netSalaryCents,
    netCents,
    socialSecurityCents: ssCents + tsuCents,
    companyCents: values.grossCents + tsuCents + mealCents + perDiemCents + mileageCents,
  };
}

const euro = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
export const money = (cents: number) => euro.format(cents / 100);
export const percent = (basisPoints: number) => `${(basisPoints / 100).toFixed(2)}%`;
export const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
