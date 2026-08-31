import { createFileRoute } from "@tanstack/react-router";

import { LogInView } from "@/features/auth/views/log-in-view";

export const Route = createFileRoute("/_auth/login")({
  head: () => ({
    meta: [{ title: "Sign in" }],
  }),
  component: LogInView,
});
