import { authMiddleware } from "@/middleware/auth";
import { createDb } from "@company-manager/db";
import { and, eq } from "@company-manager/db/operators";
import { perDiem } from "@company-manager/db/schema/per_diem";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type z from "zod";
import dayjs from "@/features/kms/lib/dates";
import { monthSchema } from "@/features/kms/schemas/validators";
import { createPerDiemSchema, perDiemIdSchema, updatePerDiemSchema } from "../schemas/validators";
import { perDiemsFromJourney } from "../lib/allowances";

export const getPerDiems = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(monthSchema)
  .handler(async ({ context, data: month }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to view per diems");
    return createDb().query.perDiem.findMany({
      where: (row, { and, eq, gte, lt }) =>
        and(
          eq(row.userId, userId),
          gte(row.date, `${month}-01`),
          lt(row.date, dayjs.utc(month).add(1, "month").format("YYYY-MM-DD")),
        ),
      orderBy: (row, { asc }) => asc(row.date),
    });
  });

export const getPerDiemsQuery = (userId: string, month: string) =>
  queryOptions({
    queryKey: ["per-diems", userId, month],
    queryFn: () => getPerDiems({ data: month }),
  });

function throwSaveError(cause: unknown): never {
  // Drizzle wraps driver errors; don't expose SQL or other users' data in an error message.
  const error = cause as { code?: string; cause?: { code?: string } } | null;
  if (error?.code === "23505" || error?.cause?.code === "23505") {
    throw new Error(
      "An allowance already exists for one of these dates. Edit the existing entry or choose other dates. No new entries were saved.",
    );
  }
  throw new Error("Could not save per diems. Please try again.");
}

export const createPerDiems = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createPerDiemSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to create per diems");
    const db = createDb();
    const source = await db.query.journey.findFirst({
      where: (row, { and, eq }) => and(eq(row.id, data.sourceJourneyId), eq(row.userId, userId)),
    });
    if (!source) throw new Error("Mileage journey not found or no longer available");
    const rows = perDiemsFromJourney(data, source, userId);
    try {
      // One atomic insert: conflicting dates reject the entire trip, including across months.
      return await db.insert(perDiem).values(rows).returning();
    } catch (cause) {
      throwSaveError(cause);
    }
  });

export const createPerDiemsMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof createPerDiemSchema>) => createPerDiems({ data }),
});

export const updatePerDiem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(updatePerDiemSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to edit per diems");
    let updated;
    try {
      [updated] = await createDb()
        .update(perDiem)
        .set({
          date: data.date,
          destination: data.destination,
          reason: data.reason,
          type: data.type,
          territory: data.territory,
          dailyRateCents: Math.round(Number(data.dailyRate) * 100),
          percentage: Number(data.percentage),
          updatedAt: new Date(),
        })
        .where(and(eq(perDiem.id, data.id), eq(perDiem.userId, userId)))
        .returning();
    } catch (cause) {
      throwSaveError(cause);
    }
    if (!updated) throw new Error("Per diem not found or no longer available");
    return updated;
  });

export const updatePerDiemMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof updatePerDiemSchema>) => updatePerDiem({ data }),
});

export const deletePerDiem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(perDiemIdSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to remove per diems");
    const [deleted] = await createDb()
      .delete(perDiem)
      .where(and(eq(perDiem.id, data.id), eq(perDiem.userId, userId)))
      .returning();
    if (!deleted) throw new Error("Per diem not found or no longer available");
    return deleted;
  });

export const deletePerDiemMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof perDiemIdSchema>) => deletePerDiem({ data }),
});
