import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import Header from "@/components/header";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/_authed")({
  component: AuthedLayout,
  beforeLoad: async () => {
    const session = await getUser();
    if (!session) {
      throw redirect({
        to: "/login",
      });
    }
    return { session };
  },
  loader: async ({ context }) => {
    if (!context.session) {
      throw redirect({
        to: "/login",
      });
    }
  },
});

function AuthedLayout() {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr]">
      <Header />
      <Outlet />
    </div>
  );
}
