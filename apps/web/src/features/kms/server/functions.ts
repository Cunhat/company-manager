import { authMiddleware } from "@/middleware/auth";
import { createDb } from "@company-manager/db";
import { kmsPath } from "@company-manager/db/schema/kms_path";
import { journey } from "@company-manager/db/schema/journeys";
import { and, eq } from "@company-manager/db/operators";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type z from "zod";
import {
  createKmsPathSchema,
  createKmsTripSchema,
  journeyIdSchema,
  monthSchema,
} from "../schemas/validators";
import { journeyMonthRange, journeysFromPath } from "../lib/journeys";

export const getKmsPaths = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.session?.user.id;

    if (!userId) throw new Error("You must be signed in to view paths");

    return createDb().query.kmsPath.findMany({
      where: (path, { eq }) => eq(path.userId, userId),
      orderBy: (path, { desc }) => desc(path.updatedAt),
    });
  });

export const getKmsPathsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["kms-paths", userId],
    queryFn: getKmsPaths,
  });

export const createKmsPath = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createKmsPathSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;

    if (!userId) throw new Error("You must be signed in to create a path");

    const [created] = await createDb()
      .insert(kmsPath)
      .values({
        userId,
        origin: data.origin,
        destination: data.destination,
        reason: data.reason,
        distance: Number(data.distance),
        description: data.description || null,
      })
      .returning();
    return created;
  });

export const createKmsPathMutation = mutationOptions({
  mutationKey: ["createKmsPath"],
  mutationFn: (data: z.infer<typeof createKmsPathSchema>) => createKmsPath({ data }),
});

export const getKmsJourneys = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(monthSchema)
  .handler(async ({ context, data: month }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to view journeys");

    const { start, end } = journeyMonthRange(month);

    return createDb().query.journey.findMany({
      where: (journey, { and, eq, gte, lt }) =>
        and(eq(journey.userId, userId), gte(journey.date, start), lt(journey.date, end)),
      orderBy: (journey, { asc }) => [asc(journey.date), asc(journey.createdAt), asc(journey.id)],
    });
  });

export const getKmsJourneysQuery = (userId: string, month: string) =>
  queryOptions({
    queryKey: ["kms-journeys", userId, month],
    queryFn: () => getKmsJourneys({ data: month }),
  });

export const createKmsTrip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createKmsTripSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to create journeys");

    const db = createDb();
    const path = await db.query.kmsPath.findFirst({
      where: (path, { and, eq }) => and(eq(path.id, data.pathId), eq(path.userId, userId)),
    });
    if (!path) throw new Error("Path not found or no longer available");

    // A single insert saves both legs atomically, using the owner's saved path.
    return db
      .insert(journey)
      .values(journeysFromPath(path, data, userId))
      .returning();
  });

export const createKmsTripMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof createKmsTripSchema>) => createKmsTrip({ data }),
});

export const deleteKmsJourney = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(journeyIdSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to remove a journey");

    const [deleted] = await createDb()
      .delete(journey)
      .where(and(eq(journey.id, data.id), eq(journey.userId, userId)))
      .returning();
    if (!deleted) throw new Error("Journey not found or no longer available");
    return deleted;
  });

export const deleteKmsJourneyMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof journeyIdSchema>) => deleteKmsJourney({ data }),
});
