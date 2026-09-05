import type { getInvoices } from "../server/functions";

export type Invoice = Awaited<ReturnType<typeof getInvoices>>[number];
