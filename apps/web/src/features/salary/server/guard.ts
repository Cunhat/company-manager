import type { createDb } from "@company-manager/db";
import { and, eq } from "@company-manager/db/operators";
import { payrollRecord } from "@company-manager/db/schema/payroll";

export async function requireOpenPayrollMonths(
  db: ReturnType<typeof createDb>,
  userId: string,
  dates: (Date | string)[],
) {
  for (const month of new Set(
    dates.map((date) => (date instanceof Date ? date.toISOString() : date).slice(0, 7)),
  )) {
    const closed = await db.query.payrollRecord.findFirst({
      where: and(
        eq(payrollRecord.userId, userId),
        eq(payrollRecord.month, month),
        eq(payrollRecord.kind, "monthly"),
      ),
      columns: { id: true },
    });
    if (closed)
      throw new Error("This month is closed by payroll. Change salary values on the Salary page.");
  }
}
