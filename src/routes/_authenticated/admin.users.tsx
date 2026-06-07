import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_OPTIONS, ROLE_LABELS, type AppRole } from "@/lib/civic";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users · CivicFlow Admin" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { roles } = Route.useRouteContext();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: depts } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users", search],
    enabled: roles.includes("admin"),
    queryFn: async () => {
      let q = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
      if (search.trim()) q = q.ilike("full_name", `%${search.trim()}%`);
      const { data: profiles, error } = await q;
      if (error) throw error;
      const ids = (profiles ?? []).map((p) => p.id);
      if (ids.length === 0) return [];
      const { data: r } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
      const roleMap = new Map<string, AppRole[]>();
      (r ?? []).forEach((x) => {
        const arr = roleMap.get(x.user_id) ?? [];
        arr.push(x.role as AppRole);
        roleMap.set(x.user_id, arr);
      });
      return (profiles ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // remove all non-citizen roles, then add new one (keep citizen base)
      await supabase.from("user_roles").delete().eq("user_id", userId).neq("role", "citizen");
      if (role !== "citizen") {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const setDept = useMutation({
    mutationFn: async ({ userId, department_id }: { userId: string; department_id: string | null }) => {
      const { error } = await supabase.from("profiles").update({ department_id }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Department updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (!roles.includes("admin")) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border bg-card p-6 text-center">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-destructive" />
        <h1 className="text-xl font-semibold">Admin only</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You don't have access. The first admin must be promoted via the database directly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-sm text-muted-foreground">Assign roles and departments. Every user is a citizen by default.</p>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="w-64"
        />
      </header>

      <section className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Role</th>
              <th className="p-3">Department</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(users ?? []).length === 0 && (
              <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No users.</td></tr>
            )}
            {(users ?? []).map((u: any) => {
              const primary: AppRole =
                (["admin", "commissioner", "engineer", "supervisor", "officer"] as AppRole[]).find((r) =>
                  u.roles.includes(r),
                ) ?? "citizen";
              return (
                <tr key={u.id}>
                  <td className="p-3">
                    <div className="font-medium">{u.full_name ?? "Unnamed"}</div>
                    <div className="text-xs text-muted-foreground">{u.phone ?? ""}</div>
                  </td>
                  <td className="p-3">
                    <Select
                      value={primary}
                      onValueChange={(v) => setRole.mutate({ userId: u.id, role: v as AppRole })}
                    >
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    <Select
                      value={u.department_id ?? "none"}
                      onValueChange={(v) =>
                        setDept.mutate({ userId: u.id, department_id: v === "none" ? null : v })
                      }
                    >
                      <SelectTrigger className="w-56"><SelectValue placeholder="No department" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {(depts ?? []).map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="rounded-xl border bg-card/50 p-4 text-xs text-muted-foreground">
        <UserCog className="mr-1 inline h-3.5 w-3.5" />
        Bootstrap: To create the first admin, run this SQL in the database:
        <code className="ml-2 rounded bg-secondary px-1.5 py-0.5">
          INSERT INTO public.user_roles (user_id, role) VALUES ('&lt;your-user-id&gt;', 'admin');
        </code>
      </div>
    </div>
  );
}
