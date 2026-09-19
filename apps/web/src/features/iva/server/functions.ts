import { createDb } from "@company-manager/db";
import { sql } from "@company-manager/db/operators";
import { authMiddleware } from "@/middleware/auth";
import { createServerFn } from "@tanstack/react-start";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import z from "zod";
import { cents, type IvaQuarter } from "../lib/quarters";

const periodSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  quarter: z.number().int().min(1).max(4),
});
export const closeQuarterSchema = periodSchema.extend({
  governmentAmount: z
    .string()
    .refine(
      (value) => cents(value) !== null,
      "Enter a valid non-negative amount with up to two decimal places",
    ),
  accountId: z.uuid().optional(),
  paymentDate: z.iso.date().optional(),
});

// Expose only known business errors; database statements and parameters stay server-side.
async function changeQuarter(statement: ReturnType<typeof sql>) {
  try {
    await createDb().execute(statement);
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error;
    const message = cause instanceof Error ? cause.message : "";
    const allowed = [
      "This quarter is already closed",
      "Close all earlier quarters first",
      "Pay every non-cancelled invoice before closing this quarter",
      "Government amount does not match the calculated IVA",
      "Corrections must preserve the original payment and deduction carried forward",
      "Choose the payment date",
      "Choose one of your accounts",
      "Closed quarter not found",
    ];
    throw new Error(
      allowed.find((item) => message.includes(item)) ??
        "Could not update the quarter. Refresh and try again.",
    );
  }
}

export const getIva = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<IvaQuarter[]> => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to view IVA");
    // One snapshot includes every historical year and any future-dated documents.
    const result = await createDb().execute(sql`
    select q.* from iva_ledger(${userId}, greatest(extract(year from current_date)::integer,
      coalesce((select max(extract(year from created_at))::integer from invoice where user_id = ${userId}), 0),
      coalesce((select max(extract(year from created_at))::integer from expense where user_id = ${userId}), 0),
      coalesce((select max(year) from iva_quarter where user_id = ${userId}), 0))) q`);
    return result.rows.map((row) => ({
      year: Number(row.year),
      quarter: Number(row.quarter),
      status: row.status as IvaQuarter["status"],
      salesCents: Number(row.sales_cents),
      deductionsCents: Number(row.deductions_cents),
      carryInCents: Number(row.carry_in_cents),
      payableCents: Number(row.payable_cents),
      carryOutCents: Number(row.carry_out_cents),
      unpaidInvoices: Number(row.unpaid_invoices),
      governmentCents: row.government_cents === null ? null : Number(row.government_cents),
      confirmedCarryOutCents:
        row.confirmed_carry_out_cents === null ? null : Number(row.confirmed_carry_out_cents),
      previousClosed: Boolean(row.previous_closed),
      paymentTransactionId: row.payment_transaction_id as string | null,
      closedAt: row.closed_at === null ? null : String(row.closed_at),
    }));
  });
export const getIvaQuery = queryOptions({ queryKey: ["iva"], queryFn: getIva });

export const closeQuarter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(closeQuarterSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to close a quarter");
    await changeQuarter(sql`select iva_close_quarter(${userId}, ${data.year}::integer, ${data.quarter}::integer,
    ${cents(data.governmentAmount)}::numeric, ${data.accountId ?? null}::uuid, ${data.paymentDate ?? null}::date)`);
  });
export const reopenQuarter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(periodSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to reopen a quarter");
    await changeQuarter(
      sql`select iva_reopen_quarter(${userId}, ${data.year}::integer, ${data.quarter}::integer)`,
    );
  });
export const closeQuarterMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof closeQuarterSchema>) => closeQuarter({ data }),
});
export const reopenQuarterMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof periodSchema>) => reopenQuarter({ data }),
});
