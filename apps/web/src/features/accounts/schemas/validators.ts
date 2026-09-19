import z from "zod";

export const moneySchema = z
  .string()
  .regex(/^-?\d+(?:\.\d{1,2})?$/, "Enter an amount with up to two decimal places")
  .refine(
    (value) => Number.isFinite(Number(value)) && Math.abs(Number(value)) < 1_000_000_000_000,
    "Enter an amount below 1 trillion",
  );

export const positiveMoneySchema = moneySchema.refine(
  (value) => Number(value) > 0,
  "Enter an amount greater than 0",
);
export const requiredAccountSchema = z.uuid("Choose an account");

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Enter an account name").max(120),
  description: z.string().trim().max(1000),
  openingBalance: moneySchema,
});
export const accountIdSchema = z.object({ id: z.uuid() });
export const updateAccountSchema = createAccountSchema.extend(accountIdSchema.shape);
