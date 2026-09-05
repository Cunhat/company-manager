import InvoicesView from "@/features/invoices/views/invoices-view";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/invoices")({
  component: InvoicesView,
});
