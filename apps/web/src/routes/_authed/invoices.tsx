import InvoicesView from "@/features/invoices/views/invoices-view";
import { getInvoicesQuery } from "@/features/invoices/server/functions";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/invoices")({
  component: InvoicesView,
  loader: async ({ context }) => {
    await context.queryClient.query({ ...getInvoicesQuery, staleTime: "static" });
  },
});
