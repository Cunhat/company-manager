import { authMiddleware } from "@/middleware/auth";
import { createDb } from "@company-manager/db";
import { kmsPath } from "@company-manager/db/schema/kms_path";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type z from "zod";
import { createKmsPathSchema } from "../schemas/validators";

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
        // This existing required column records path creation, not a journey date.
        date: new Date(),
      })
      .returning();
    return created;
  });

export const createKmsPathMutation = mutationOptions({
  mutationKey: ["createKmsPath"],
  mutationFn: (data: z.infer<typeof createKmsPathSchema>) =>
    createKmsPath({ data }),
});
