import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, UserCog, Users, Briefcase, CheckCircle2, AlertTriangle, Flame, Sparkles, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_OPTIONS, ROLE_LABELS, type AppRole, scheduleActions, categoryLabel, statusLabel } from "@/lib/civic";
import { useRealtime } from "@/hooks/use-realtime";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Officers · CivicFlow Admin" }] }),
  component: AdminUsersPage,
});

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  department_id: string | null;
  created_at: string;
  roles: AppRole[];
};

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
    queryFn: async (): Promise<ProfileRow[]> => {
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

  // Workload: complaints grouped per officer
  const { data: workload } = useQuery({
    queryKey: ["admin-workload"],
    enabled: roles.includes("admin"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("id,title,status,assigned_officer_id,department_id,sla_due_at,priority_level,category,created_at,latitude,longitude,address");
      if (error) throw error;
      return data ?? [];
    },
  });

  useRealtime("admin-realtime", ["complaints", "user_roles", "profiles"], [
    ["admin-users"],
    ["admin-workload"],
  ]);

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
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

  const officers = (users ?? []).filter((u) => u.roles.includes("officer"));
  const deptNameById = new Map((depts ?? []).map((d) => [d.id, d.name]));

  // Workload aggregation per officer
  const perOfficer = new Map<string, { active: number; resolved: number; overdue: number }>();
  (workload ?? []).forEach((c) => {
    if (!c.assigned_officer_id) return;
    const cur = perOfficer.get(c.assigned_officer_id) ?? { active: 0, resolved: 0, overdue: 0 };
    if (["resolved", "closed", "verified"].includes(c.status)) cur.resolved++;
    else {
      cur.active++;
      if (c.sla_due_at && new Date(c.sla_due_at) < new Date()) cur.overdue++;
    }
    perOfficer.set(c.assigned_officer_id, cur);
  });

  const totalOfficers = officers.length;
  const totalActive = (workload ?? []).filter((c) => !["resolved", "closed", "verified"].includes(c.status)).length;
  const totalOverdue = (workload ?? []).filter((c) => c.sla_due_at && new Date(c.sla_due_at) < new Date() && !["resolved", "closed", "verified"].includes(c.status)).length;
  const totalResolved = (workload ?? []).filter((c) => ["resolved", "closed", "verified"].includes(c.status)).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Officers & Administration</h1>
          <p className="text-sm text-muted-foreground">Assign officers to departments and review live workload.</p>
        </div>
        <Link to="/smart-escalation">
          <Button variant="outline" size="sm"><Flame className="mr-1.5 h-4 w-4" />Smart Escalation</Button>
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Total officers" value={totalOfficers} />
        <Stat icon={Briefcase} label="Active complaints" value={totalActive} />
        <Stat icon={AlertTriangle} label="SLA overdue" value={totalOverdue} tone="destructive" />
        <Stat icon={CheckCircle2} label="Resolved" value={totalResolved} tone="success" />
      </div>

      {/* Officer workload */}
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Officer workload & area coverage</h2>
          <p className="text-xs text-muted-foreground">Each officer handles complaints in their assigned department.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Officer</th>
              <th className="p-3">Department</th>
              <th className="p-3 text-right">Active</th>
              <th className="p-3 text-right">Overdue</th>
              <th className="p-3 text-right">Resolved</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {officers.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No officers yet. Promote a user below.</td></tr>
            )}
            {officers.map((o) => {
              const w = perOfficer.get(o.id) ?? { active: 0, resolved: 0, overdue: 0 };
              return (
                <tr key={o.id}>
                  <td className="p-3">
                    <div className="font-medium">{o.full_name ?? "Unnamed"}</div>
                    <div className="text-xs text-muted-foreground">{o.phone ?? ""}</div>
                  </td>
                  <td className="p-3">{o.department_id ? (deptNameById.get(o.department_id) ?? "—") : <span className="text-muted-foreground">Unassigned</span>}</td>
                  <td className="p-3 text-right tabular-nums">{w.active}</td>
                  <td className={`p-3 text-right tabular-nums ${w.overdue > 0 ? "font-semibold text-destructive" : ""}`}>{w.overdue}</td>
                  <td className="p-3 text-right tabular-nums">{w.resolved}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* User role management */}
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b p-4">
          <div>
            <h2 className="font-semibold">User accounts</h2>
            <p className="text-xs text-muted-foreground">Promote citizens to officer and assign a department for area coverage.</p>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-64"
          />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Role</th>
              <th className="p-3">Department (area)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(users ?? []).length === 0 && (
              <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No users.</td></tr>
            )}
            {(users ?? []).map((u) => {
              const primary: AppRole =
                (["admin", "officer"] as AppRole[]).find((r) => u.roles.includes(r)) ?? "citizen";
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

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone?: "success" | "destructive" }) {
  const tones: Record<string, string> = {
    success: "text-success",
    destructive: "text-destructive",
  };
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${tone ? tones[tone] : "text-muted-foreground"}`} />
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
