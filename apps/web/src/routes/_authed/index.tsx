import { getWidgetsQuery } from "@/features/dashboard/server/widgets";
import DashboardView from "@/features/dashboard/views/dashboard-view";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/")({
  component: DashboardView,
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...getWidgetsQuery(),
      staleTime: "static",
    });
  },
});
