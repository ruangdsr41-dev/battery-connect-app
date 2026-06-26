import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => {
    if (!context.isMaster) throw redirect({ to: "/" });
  },
  component: () => <Outlet />,
});
