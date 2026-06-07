import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { categoryLabel } from "@/lib/civic";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRealtime } from "@/hooks/use-realtime";

export const Route = createFileRoute("/_authenticated/supervisor")({
  head: () => ({ meta: [{ title: "Supervisor · CivicFlow" }] }),
  component: SupervisorPage,
});

function SupervisorPage() {
  const { roles } = Route.useRouteContext();
  const qc = useQueryClient();
  const [filterDept, setFilterDept] = useState<string>("all");

  const allowed =
    roles.includes("supervisor") ||
    roles.includes("engineer") ||
    roles.includes("commissioner") ||
    roles.includes("admin");

  const { data: depts } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: complaints } = useQuery({
    queryKey: ["supervisor-complaints", filterDept],
    enabled: allowed,
    queryFn: async () => {
      let q = supabase.from("complaints").select("*").order("created_at", { ascending: false }).limit(200);
      if (filterDept !== "all") q = q.eq("department_id", filterDept);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  useRealtime("supervisor", ["complaints", "complaint_activities"], [
    ["supervisor-complaints", filterDept],
  ]);

  const reassign = useMutation({
    mutationFn: async ({ id, department_id }: { id: string; department_id: string }) => {
      const { error } = await supabase
        .from("complaints")
        .update({ department_id, assigned_officer_id: null, status: "under_review" } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reassigned");
      qc.invalidateQueries({ queryKey: ["supervisor-complaints"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (!allowed) return <p>Access denied.</p>;

  const open = complaints?.filter((c) => !["resolved", "closed"].includes(c.status)).length ?? 0;
  const overdue = complaints?.filter((c) => c.sla_due_at && new Date(c.sla_due_at) < new Date() && !["resolved", "closed"].includes(c.status)).length ?? 0;
  const resolved = complaints?.filter((c) => ["resolved", "closed"].includes(c.status)).length ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supervisor View</h1>
          <p className="text-sm text-muted-foreground">Monitor and reassign complaints across departments.</p>
        </div>
        <div className="w-56">
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {(depts ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Building2} label="Active" value={open} />
        <Stat icon={AlertTriangle} label="SLA overdue" value={overdue} tone="destructive" />
        <Stat icon={CheckCircle2} label="Resolved" value={resolved} tone="success" />
      </div>

      <section className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">All complaints</h2>
        </div>
        <div className="divide-y">
          {(complaints ?? []).length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No complaints.</div>
          )}
          {(complaints ?? []).map((c) => {
            const slaRem = c.sla_due_at ? Math.round((new Date(c.sla_due_at).getTime() - Date.now()) / 3600000) : null;
            return (
              <div key={c.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                <Link to="/complaints/$id" params={{ id: c.id }} className="min-w-0 flex-1 hover:text-accent">
                  <div className="truncate font-medium">{c.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{categoryLabel(c.category)}</span>
                    <span>·</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    {slaRem !== null && (
                      <span className={slaRem < 0 ? "text-destructive font-medium" : ""}>
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
                <Select
                  value={c.department_id ?? ""}
                  onValueChange={(v) => reassign.mutate({ id: c.id, department_id: v })}
                >
                  <SelectTrigger className="w-48"><SelectValue placeholder="Reassign…" /></SelectTrigger>
                  <SelectContent>
                    {(depts ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
