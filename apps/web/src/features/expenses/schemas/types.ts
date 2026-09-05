import type { getExpenses } from "../server/functions";

export type Expense = Awaited<ReturnType<typeof getExpenses>>[number];
