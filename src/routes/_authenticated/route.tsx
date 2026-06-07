import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import type { AppRole } from "@/lib/civic";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const [{ data: roleRows }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", data.user.id),
      supabase.from("profiles").select("department_id").eq("id", data.user.id).maybeSingle(),
    ]);
    const roles = (roleRows ?? []).map((r) => r.role as AppRole);
    return {
      user: data.user,
      roles,
      departmentId: profile?.department_id ?? null,
    };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 md:py-10">
        <Outlet />
      </main>
    </div>
  );
}
