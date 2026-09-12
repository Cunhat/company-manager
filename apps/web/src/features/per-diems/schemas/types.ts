import type z from "zod";
import type { perDiem } from "@company-manager/db/schema/per_diem";
import type { createPerDiemSchema, editPerDiemSchema } from "./validators";

export type PerDiem = typeof perDiem.$inferSelect;
export type CreatePerDiem = z.infer<typeof createPerDiemSchema>;
export type EditPerDiem = z.infer<typeof editPerDiemSchema>;
export type AllowanceDay = Pick<
  PerDiem,
  "date" | "type" | "destination" | "reason" | "territory" | "dailyRateCents" | "percentage"
>;
