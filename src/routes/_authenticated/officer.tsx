import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { categoryLabel, OFFICER_NEXT_STATUS, statusLabel } from "@/lib/civic";
import { Button } from "@/components/ui/button";
import { useRealtime } from "@/hooks/use-realtime";

export const Route = createFileRoute("/_authenticated/officer")({
  head: () => ({ meta: [{ title: "Officer Queue · CivicFlow" }] }),
  component: OfficerPage,
});

function OfficerPage() {
  const { user, roles, departmentId } = Route.useRouteContext();
  const qc = useQueryClient();

  const allowed = roles.includes("officer") || roles.includes("admin") || roles.includes("supervisor");

  const { data: dept } = useQuery({
    queryKey: ["department", departmentId],
    enabled: !!departmentId,
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").eq("id", departmentId!).maybeSingle();
      return data;
    },
  });

  const { data: complaints } = useQuery({
    queryKey: ["officer-queue", departmentId],
    enabled: allowed && !!departmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("department_id", departmentId!)
        .order("priority_score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  useRealtime("officer-queue", ["complaints", "complaint_activities"], [
    ["officer-queue", departmentId],
  ]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: any }) => {
      const patch: Record<string, any> = { status };
      if (!complaints?.find((c) => c.id === id)?.assigned_officer_id) {
        patch.assigned_officer_id = user.id;
      }
      if (status === "resolved") patch.resolved_at = new Date().toISOString();
      const { error } = await supabase.from("complaints").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["officer-queue", departmentId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });

  if (!allowed) return <p>Access denied.</p>;
  if (!departmentId) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border bg-card p-6 text-center">
        <Briefcase className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold">No department assigned</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask an admin to assign your account to a department from the Users page.
        </p>
      </div>
    );
  }

  const open = complaints?.filter((c) => !["resolved", "closed"].includes(c.status)).length ?? 0;
  const overdue = complaints?.filter((c) => c.sla_due_at && new Date(c.sla_due_at) < new Date() && !["resolved", "closed"].includes(c.status)).length ?? 0;
  const resolved = complaints?.filter((c) => ["resolved", "closed"].includes(c.status)).length ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Officer Queue</h1>
        <p className="text-sm text-muted-foreground">{dept?.name ?? "Your department"} — prioritised by AI score and age.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Briefcase} label="Active" value={open} />
        <Stat icon={AlertTriangle} label="SLA overdue" value={overdue} tone="destructive" />
        <Stat icon={CheckCircle2} label="Resolved" value={resolved} tone="success" />
      </div>

      <section className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Task queue</h2>
          <p className="text-xs text-muted-foreground">Highest priority first.</p>
        </div>
        <div className="divide-y">
          {(complaints ?? []).length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No complaints in your queue.</div>
          )}
          {(complaints ?? []).map((c) => {
            const nexts = OFFICER_NEXT_STATUS[c.status] ?? [];
            const slaRem = c.sla_due_at ? Math.round((new Date(c.sla_due_at).getTime() - Date.now()) / 3600000) : null;
            return (
              <div key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <Link to="/complaints/$id" params={{ id: c.id }} className="min-w-0 flex-1 hover:text-accent">
                  <div className="truncate font-medium">{c.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{categoryLabel(c.category)}</span>
                    <span>·</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    {slaRem !== null && (
                      <span className={slaRem < 0 ? "text-destructive font-medium" : "text-success"}>
                        <Clock className="mr-0.5 inline h-3 w-3" />
                        {slaRem < 0 ? `${Math.abs(slaRem)}h overdue` : `${slaRem}h left`}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <PriorityBadge level={c.priority_level} />
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex flex-wrap gap-1">
                  {nexts.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: c.id, status: s })}
                    >
                      {statusLabel(s)}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
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
