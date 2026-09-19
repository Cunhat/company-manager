export function periodOf(date: Date | string) {
  const value = new Date(date);
  return { year: value.getUTCFullYear(), quarter: Math.floor(value.getUTCMonth() / 3) + 1 };
}

export function cents(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [euros = "0", decimal = ""] = value.split(".");
  const result = Number(euros) * 100 + Number(decimal.padEnd(2, "0"));
  return Number.isSafeInteger(result) && result < 100_000_000_000_000 ? result : null;
}

export const formatCents = (value: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(value / 100);

export type IvaQuarter = {
  year: number;
  quarter: number;
  status: "open" | "closed";
  salesCents: number;
  deductionsCents: number;
  carryInCents: number;
  payableCents: number;
  carryOutCents: number;
  governmentCents: number | null;
  confirmedCarryOutCents: number | null;
  unpaidInvoices: number;
  previousClosed: boolean;
  paymentTransactionId: string | null;
  closedAt: string | null;
};

export function closeBlocker(period: IvaQuarter) {
  if (period.status === "closed") return "This quarter is already closed.";
  if (!period.previousClosed) return "Close all earlier quarters first.";
  if (period.unpaidInvoices)
    return `${period.unpaidInvoices} unpaid invoice${period.unpaidInvoices === 1 ? "" : "s"} must be paid first.`;
  if (period.governmentCents !== null && period.payableCents !== period.governmentCents)
    return "Correct the records to match the original government amount.";
  if (
    period.confirmedCarryOutCents !== null &&
    period.carryOutCents !== period.confirmedCarryOutCents
  )
    return "Correct the records to preserve the original deduction carried forward.";
  return null;
}
