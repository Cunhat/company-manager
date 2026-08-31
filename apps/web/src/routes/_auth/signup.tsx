import { createFileRoute } from "@tanstack/react-router";

import { SignUpView } from "@/features/auth/views/sign-up-view";

export const Route = createFileRoute("/_auth/signup")({
  head: () => ({
    meta: [{ title: "Create account" }],
  }),
  component: SignUpView,
});
