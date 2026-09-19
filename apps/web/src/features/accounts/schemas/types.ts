import type { getAccounts } from "../server/functions";
import type { createAccountSchema } from "./validators";
import type { z } from "zod";

export type Account = Awaited<ReturnType<typeof getAccounts>>[number];
export type AccountFormValues = z.infer<typeof createAccountSchema>;
