import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, AlertTriangle, Clock, CheckCircle2, Sparkles, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { SlaCountdown } from "@/components/SlaCountdown";
import { categoryLabel, OFFICER_NEXT_STATUS, statusLabel, predictNextAction, scheduleActions } from "@/lib/civic";
import { Button } from "@/components/ui/button";
import { useRealtime } from "@/hooks/use-realtime";

export const Route = createFileRoute("/_authenticated/officer")({
  head: () => ({ meta: [{ title: "Officer Queue · CivicFlow" }] }),
  component: OfficerPage,
});

function OfficerPage() {
  const { user, roles, departmentId } = Route.useRouteContext();
  const qc = useQueryClient();

  const allowed = roles.includes("officer") || roles.includes("admin");

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

  useRealtime(
    "officer-queue",
    departmentId
      ? [
          { table: "complaints", filter: `department_id=eq.${departmentId}` },
          "complaint_activities",
        ]
      : [{ table: "complaints", filter: `assigned_officer_id=eq.${user.id}` }],
    [["officer-queue", departmentId]],
  );

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

  const pendingList = (complaints ?? []).filter((c) => ["submitted", "under_review", "assigned"].includes(c.status));
  const ongoingList = (complaints ?? []).filter((c) => ["in_progress", "waiting_for_verification"].includes(c.status));
  const resolvedList = (complaints ?? []).filter((c) => ["resolved", "closed", "verified"].includes(c.status));

  // Priority sort helper: overdue first, then priority, then age.
  const PRIO_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const sortByUrgency = (a: any, b: any) => {
    const ao = a.sla_due_at && new Date(a.sla_due_at) < new Date() ? 1 : 0;
    const bo = b.sla_due_at && new Date(b.sla_due_at) < new Date() ? 1 : 0;
    if (ao !== bo) return bo - ao;
    const pr = (PRIO_RANK[b.priority_level] ?? 0) - (PRIO_RANK[a.priority_level] ?? 0);
    if (pr !== 0) return pr;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Officer Dashboard</h1>
        <p className="text-sm text-muted-foreground">{dept?.name ?? "Your department"} — AI-prioritised, real-time.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Briefcase} label="Pending" value={pendingList.length} />
        <Stat icon={AlertTriangle} label="SLA overdue" value={overdue} tone="destructive" />
        <Stat icon={CheckCircle2} label="Resolved" value={resolved} tone="success" />
      </div>

      <SmartSchedule complaints={complaints ?? []} />

      <QueueSection title="Pending complaints" desc="Awaiting triage or assignment." items={pendingList.sort(sortByUrgency)} updateStatus={updateStatus} />
      <QueueSection title="On-going issues" desc="Work in progress." items={ongoingList.sort(sortByUrgency)} updateStatus={updateStatus} />
      <QueueSection title="Resolved" desc="Recently completed work." items={resolvedList} updateStatus={updateStatus} muted />
    </div>
  );
}

function SmartSchedule({ complaints }: { complaints: any[] }) {
  const scheduled = scheduleActions(complaints).slice(0, 12);
  if (scheduled.length === 0) return null;
  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> AI Smart Schedule
          </h2>
          <p className="text-xs text-muted-foreground">
            Ordered to avoid rework — underground utility jobs run before resurfacing in the same area.
          </p>
        </div>
        <span className="hidden rounded-full border bg-secondary px-2 py-0.5 text-xs text-muted-foreground sm:inline">
          {scheduled.length} actions
        </span>
      </div>
      <ol className="divide-y">
        {scheduled.map((s) => (
          <li key={s.complaint.id} className="flex items-start gap-3 p-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
              {s.order}
            </div>
            <div className="min-w-0 flex-1">
              <Link to="/complaints/$id" params={{ id: s.complaint.id }} className="block truncate font-medium hover:text-accent">
                {s.complaint.title}
              </Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{categoryLabel(s.complaint.category)}</span>
                {s.complaint.address && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{s.complaint.address}
                  </span>
                )}
                {s.groupSize > 1 && (
                  <span className="rounded-full border bg-secondary px-1.5 py-0.5 text-[10px]">
                    Cluster of {s.groupSize}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-primary/90">{s.reason}</p>
            </div>
            <PriorityBadge level={s.complaint.priority_level} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function QueueSection({ title, desc, items, updateStatus, muted }: { title: string; desc: string; items: any[]; updateStatus: any; muted?: boolean }) {
  return (
    <section className={`rounded-xl border bg-card ${muted ? "opacity-95" : ""}`}>
      <div className="border-b p-4">
        <h2 className="font-semibold">{title} <span className="ml-2 text-xs font-normal text-muted-foreground">({items.length})</span></h2>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className="divide-y">
        {items.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">Nothing here.</div>
        )}
        {items.map((c) => {
          const nexts = OFFICER_NEXT_STATUS[c.status] ?? [];
          const slaRem = c.sla_due_at ? Math.round((new Date(c.sla_due_at).getTime() - Date.now()) / 3600000) : null;
          const pred = predictNextAction(c);
          const urgTone = pred.urgency === "high" ? "text-destructive" : pred.urgency === "medium" ? "text-warning-foreground" : "text-muted-foreground";
          return (
            <div key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
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
                {!muted && (
                  <div className={`mt-1.5 text-xs ${urgTone}`}>
                    <span className="font-medium">AI suggests:</span> {pred.action} <span className="text-muted-foreground">— {pred.reason}</span>
                  </div>
                )}
              </Link>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <PriorityBadge level={c.priority_level} />
                  <StatusBadge status={c.status} />
                </div>
                {nexts.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-1">
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
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
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
