import type { getTransactions } from "../server/functions";
import type { z } from "zod";
import type { createTransactionSchema } from "./validators";

export type Transaction = Awaited<ReturnType<typeof getTransactions>>[number];
export type TransactionFormValues = z.infer<typeof createTransactionSchema>;
