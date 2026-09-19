import { cents } from "./quarters";

// Match PostgreSQL's per-document, half-up rounding without binary decimal math.
export function invoiceIvaCents(value: number | string) {
  const amount = cents(String(value));
  if (amount === null) throw new Error("Invalid invoice amount");
  return Number((BigInt(amount) * 23n + 50n) / 100n);
}

export function expenseIvaCents(value: string, includesIva: boolean) {
  if (!includesIva) return 0;
  const amount = cents(value);
  if (amount === null) throw new Error("Invalid expense amount");
  const net = (BigInt(amount) * 100n + 61n) / 123n;
  return amount - Number(net);
}
