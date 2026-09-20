import { authMiddleware } from "@/middleware/auth";
import { requireOwnedAccount } from "@/features/accounts/server/queries";
import { createDb } from "@company-manager/db";
import { and, desc, eq, sql } from "@company-manager/db/operators";
import { salarySettings, payrollRecord, payrollPayment } from "@company-manager/db/schema/payroll";
import { expense } from "@company-manager/db/schema/expense";
import { transaction } from "@company-manager/db/schema/transactions";
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import {
  applyPayrollSchema,
  deletePayrollSchema,
  generatePayrollSchema,
  payPayrollSchema,
  payrollMonthSchema,
  saveSettingsSchema,
  unpayPayrollSchema,
} from "../schemas/validators";
import type { TravelTotals } from "../lib/calculations";

function owner(context: { session?: { user: { id: string } } | null }) {
  if (!context.session?.user.id) throw new Error("You must be signed in to manage salary");
  return context.session.user.id;
}

async function changePayroll(statement: ReturnType<typeof sql>) {
  try {
    await createDb().execute(statement);
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error;
    const code = (cause as { code?: string })?.code;
    if (code === "23505")
      throw new Error("This salary record already exists. Open it to simulate or edit its values.");
    const message = cause instanceof Error ? cause.message : "";
    const allowed = [
      "Travel amounts changed. Refresh the preview before generating payroll.",
      "Payroll changed or is unavailable. Refresh before applying changes.",
      "Payroll record not found",
      "Choose one of your accounts",
      "There is no payment due",
      "This quarter is closed. Reopen it on the IVA page before changing invoices or expenses.",
      "This document predates the confirmed IVA history. Correct its document date.",
    ];
    throw new Error(
      allowed.find((text) => message.includes(text)) ??
        "Could not save payroll. Refresh and try again.",
    );
  }
}

export const getSalary = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = owner(context);
    const db = createDb();
    const [settings, records, payments] = await Promise.all([
      db.query.salarySettings.findFirst({ where: eq(salarySettings.userId, userId) }),
      db
        .select()
        .from(payrollRecord)
        .where(eq(payrollRecord.userId, userId))
        .orderBy(desc(payrollRecord.month), desc(payrollRecord.createdAt)),
      db
        .select({
          recordId: payrollPayment.recordId,
          kind: payrollPayment.kind,
          expenseId: expense.id,
          transactionId: transaction.id,
          accountId: sql<string | null>`coalesce(${expense.accountId}, ${transaction.accountId})`,
          paidAt: sql`coalesce(${expense.createdAt}, ${transaction.createdAt})`.mapWith(
            expense.createdAt,
          ),
        })
        .from(payrollPayment)
        .innerJoin(payrollRecord, eq(payrollPayment.recordId, payrollRecord.id))
        .leftJoin(
          expense,
          and(eq(payrollPayment.expenseId, expense.id), eq(expense.userId, userId)),
        )
        .leftJoin(
          transaction,
          and(eq(payrollPayment.transactionId, transaction.id), eq(transaction.userId, userId)),
        )
        .where(eq(payrollRecord.userId, userId)),
    ]);
    return { settings: settings ?? null, records, payments };
  });
export const getSalaryQuery = (userId: string) =>
  queryOptions({ queryKey: ["salary", userId], queryFn: getSalary });
export type SalaryData = Awaited<ReturnType<typeof getSalary>>;
export type SalaryRecord = SalaryData["records"][number];
export type SalaryPayment = SalaryData["payments"][number];

export const getSalaryTravel = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(payrollMonthSchema)
  .handler(async ({ context, data: month }): Promise<TravelTotals> => {
    const userId = owner(context);
    const result = await createDb().execute(sql`select
      (select coalesce(sum(round(daily_rate_cents::numeric * percentage / 100)), 0) from per_diem
        where user_id = ${userId} and date >= ${month + "-01"}::date and date < ${month + "-01"}::date + interval '1 month') as per_diem_cents,
      (select count(*) from per_diem where user_id = ${userId} and date >= ${month + "-01"}::date and date < ${month + "-01"}::date + interval '1 month') as per_diem_days,
      (select coalesce(sum(distance), 0) from journey where user_id = ${userId} and date >= ${month + "-01"}::date and date < ${month + "-01"}::date + interval '1 month') as kilometres`);
    const row = result.rows[0];
    return {
      perDiemCents: Number(row.per_diem_cents),
      perDiemDays: Number(row.per_diem_days),
      kilometres: Number(row.kilometres),
      mileageCents: Number(row.kilometres) * 40,
    };
  });
export const getSalaryTravelQuery = (userId: string, month: string) =>
  queryOptions({
    queryKey: ["salary-travel", userId, month],
    queryFn: () => getSalaryTravel({ data: month }),
  });

export const saveSalarySettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(saveSettingsSchema)
  .handler(async ({ context, data }) => {
    const userId = owner(context);
    const db = createDb();
    await requireOwnedAccount(db, userId, data.accountId);
    const { irsOverrideCents: _override, ...values } = data.values;
    await db
      .insert(salarySettings)
      .values({ ...values, accountId: data.accountId, userId })
      .onConflictDoUpdate({
        target: salarySettings.userId,
        set: { ...values, accountId: data.accountId, updatedAt: new Date() },
      });
  });
export const generatePayroll = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(generatePayrollSchema)
  .handler(async ({ context, data }) => {
    await changePayroll(
      sql`select payroll_generate(${owner(context)}, ${data.month}, ${data.kind}, ${JSON.stringify(data.values)}::jsonb, ${JSON.stringify(data.expected)}::jsonb)`,
    );
  });
export const applyPayroll = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(applyPayrollSchema)
  .handler(async ({ context, data }) => {
    await changePayroll(
      sql`select payroll_apply(${owner(context)}, ${data.id}::uuid, ${data.revision}::integer, ${JSON.stringify(data.values)}::jsonb)`,
    );
  });
export const payPayroll = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(payPayrollSchema)
  .handler(async ({ context, data }) => {
    await changePayroll(
      sql`select payroll_pay(${owner(context)}, ${data.id}::uuid, ${data.kind}, ${data.date}::date, ${data.accountId}::uuid, ${data.revision}::integer)`,
    );
  });
export const unpayPayroll = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(unpayPayrollSchema)
  .handler(async ({ context, data }) => {
    await changePayroll(
      sql`select payroll_unpay(${owner(context)}, ${data.id}::uuid, ${data.kind})`,
    );
  });

export const deletePayroll = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(deletePayrollSchema)
  .handler(async ({ context, data }) => {
    await changePayroll(
      sql`select payroll_delete(${owner(context)}, ${data.id}::uuid, ${data.revision}::integer)`,
    );
  });
