import { createFileRoute } from "@tanstack/react-router";
import KmsView from "@/features/kms/views/kms-view";
import { getKmsPathsQuery } from "@/features/kms/server/functions";

export const Route = createFileRoute("/_authed/kms")({
  component: KmsView,
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...getKmsPathsQuery(context.session.user.id),
      staleTime: "static",
    });
  },
});
