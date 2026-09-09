import type z from "zod";
import type { getKmsJourneys, getKmsPaths } from "../server/functions";
import type { createKmsTripSchema, monthlyMapSchema } from "./validators";

export type KmsPath = Awaited<ReturnType<typeof getKmsPaths>>[number];
export type KmsJourney = Awaited<ReturnType<typeof getKmsJourneys>>[number];
export type CreateKmsTrip = z.infer<typeof createKmsTripSchema>;
export type MonthlyKmsMap = z.infer<typeof monthlyMapSchema>;
export type KmsEntry = MonthlyKmsMap["entries"][number];
