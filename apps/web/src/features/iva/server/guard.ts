import type { createDb } from "@company-manager/db";
import { and, eq } from "@company-manager/db/operators";
import { ivaQuarter } from "@company-manager/db/schema/iva";
import { periodOf } from "../lib/quarters";

// Friendly preflight errors; the database trigger enforces this again atomically.
export async function requireOpenQuarter(
  db: ReturnType<typeof createDb>,
  userId: string,
  date: Date | string,
) {
  const { year, quarter } = periodOf(date);
  const record = await db.query.ivaQuarter.findFirst({
    where: and(
      eq(ivaQuarter.userId, userId),
      eq(ivaQuarter.year, year),
      eq(ivaQuarter.quarter, quarter),
    ),
  });
  if (record?.status === "closed")
    throw new Error(
      "This quarter is closed. Reopen it on the IVA page before changing invoices or expenses.",
    );
}
