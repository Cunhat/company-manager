import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AuthLayout } from "@/features/auth/components/auth-layout";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    const session = await getUser();
    if (session) {
      throw redirect({
        to: "/dashboard",
      });
    }
  },
  component: AuthRouteLayout,
});

function AuthRouteLayout() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
