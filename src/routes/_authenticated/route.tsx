import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Carrega papel + status ativo
    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", data.user.id),
      supabase.from("profiles").select("ativo, nome").eq("id", data.user.id).maybeSingle(),
    ]);

    if (profile && profile.ativo === false) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { disabled: "1" } });
    }

    const isMaster = (roles ?? []).some((r) => r.role === "master");
    return {
      user: data.user,
      isMaster,
      nome: profile?.nome ?? data.user.email,
    };
  },
  component: () => <Outlet />,
});
