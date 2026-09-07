import type z from "zod";
import type { getKmsPaths } from "../server/functions";
import type { localKmsSchema, monthlyMapSchema, tripSchema } from "./validators";

export type KmsPath = Awaited<ReturnType<typeof getKmsPaths>>[number];
export type KmsTrip = z.infer<typeof tripSchema>;
export type MonthlyKmsMap = z.infer<typeof monthlyMapSchema>;
export type KmsEntry = MonthlyKmsMap["entries"][number];
export type LocalKms = z.infer<typeof localKmsSchema>;
