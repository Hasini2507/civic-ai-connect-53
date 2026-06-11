import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, AlertTriangle, Clock, Flame, CheckCircle2, ArrowUpRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime } from "@/hooks/use-realtime";
import { categoryLabel, statusLabel, predictNextAction } from "@/lib/civic";

export const Route = createFileRoute("/_authenticated/alerts")({
  component: AlertsCenter,
});

type FeedItem = {
  id: string;
  kind: "success" | "alert" | "escalation" | "resolved";
  title: string;
  desc: string;
  time: string;
  complaintId: string;
  priority: string;
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "alert", label: "Alerts" },
  { value: "escalation", label: "Escalations" },
  { value: "resolved", label: "Resolved" },
] as const;

const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-foreground border border-warning/40",
  high: "bg-destructive/15 text-destructive border border-destructive/30",
  critical: "bg-destructive text-destructive-foreground",
};

function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function StatCard({ icon: Icon, label, value, sub, tone }: any) {
  const toneCls =
    tone === "alert" ? "bg-warning/15 text-warning-foreground"
    : tone === "danger" ? "bg-destructive/15 text-destructive"
    : tone === "critical" ? "bg-destructive text-destructive-foreground"
    : "bg-primary/15 text-primary";
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("grid h-11 w-11 place-items-center rounded-lg", toneCls)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold leading-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertsCenter() {
  const { user, roles, departmentId } = Route.useRouteContext();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const isStaff = roles.includes("officer") || roles.includes("admin");

  // Live complaints stream for staff (dept-scoped) or citizen (own)
  const { data: complaints } = useQuery({
    queryKey: ["alerts-complaints", user.id, departmentId, roles.join(",")],
    queryFn: async () => {
      let q = supabase
        .from("complaints")
        .select("id,title,status,priority_level,category,created_at,updated_at,sla_due_at,assigned_officer_id,reporter_id,department_id,address")
        .order("updated_at", { ascending: false })
        .limit(60);
      if (!isStaff) q = q.eq("reporter_id", user.id);
      else if (roles.includes("officer") && !roles.includes("admin") && departmentId) {
        q = q.eq("department_id", departmentId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  useRealtime("alerts-live", ["complaints", "complaint_activities", "notifications"], [
    ["alerts-complaints"],
  ]);

  const items: FeedItem[] = useMemo(() => {
    const out: FeedItem[] = [];
    for (const c of complaints ?? []) {
      const overdue =
        c.sla_due_at && new Date(c.sla_due_at) < new Date() &&
        !["resolved", "closed", "verified"].includes(c.status);
      if (["resolved", "closed", "verified"].includes(c.status)) {
        out.push({
          id: `r-${c.id}`, kind: "resolved",
          title: `Complaint resolved — ${c.title}`,
          desc: `${categoryLabel(c.category)} marked ${statusLabel(c.status)}.`,
          time: relTime(c.updated_at ?? c.created_at),
          complaintId: c.id.slice(0, 8).toUpperCase(),
          priority: c.priority_level,
        });
        continue;
      }
      if (overdue) {
        out.push({
          id: `e-${c.id}`, kind: "escalation",
          title: `SLA breached — ${c.title}`,
          desc: `Deadline passed. AI suggests: ${predictNextAction(c).action}.`,
          time: relTime(c.sla_due_at!),
          complaintId: c.id.slice(0, 8).toUpperCase(),
          priority: c.priority_level,
        });
      } else if (c.priority_level === "critical" || c.priority_level === "high") {
        out.push({
          id: `a-${c.id}`, kind: "alert",
          title: `${c.priority_level === "critical" ? "Critical" : "High-priority"} — ${c.title}`,
          desc: `${categoryLabel(c.category)} • ${statusLabel(c.status)}${c.address ? ` • ${c.address}` : ""}`,
          time: relTime(c.updated_at ?? c.created_at),
          complaintId: c.id.slice(0, 8).toUpperCase(),
          priority: c.priority_level,
        });
      } else {
        out.push({
          id: `s-${c.id}`, kind: "success",
          title: c.title,
          desc: `${categoryLabel(c.category)} • ${statusLabel(c.status)}`,
          time: relTime(c.updated_at ?? c.created_at),
          complaintId: c.id.slice(0, 8).toUpperCase(),
          priority: c.priority_level,
        });
      }
    }
    return out;
  }, [complaints]);

  const filtered = filter === "all" ? items : items.filter((i) => i.kind === filter);

  const overdueCount = (complaints ?? []).filter(
    (c) => c.sla_due_at && new Date(c.sla_due_at) < new Date() &&
      !["resolved", "closed", "verified"].includes(c.status),
  ).length;
  const criticalCount = (complaints ?? []).filter(
    (c) => c.priority_level === "critical" &&
      !["resolved", "closed", "verified"].includes(c.status),
  ).length;
  const activeEsc = items.filter((i) => i.kind === "escalation").length;

  const idMap = new Map((complaints ?? []).map((c) => [c.id.slice(0, 8).toUpperCase(), c.id]));

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          {isStaff ? "Live Alerts — Department Feed" : "Notification Center"}
        </h1>
        <p className="text-muted-foreground">
          {isStaff
            ? "Real-time complaints, AI escalations, and SLA breaches for your jurisdiction."
            : "Track your complaint deadlines, AI alerts, and resolution progress."}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Bell} label="Live Items" value={items.length} sub="updated in real time" tone="primary" />
        <StatCard icon={ArrowUpRight} label="Active Escalations" value={activeEsc} sub="SLA breaches" tone="alert" />
        <StatCard icon={Clock} label="Overdue" value={overdueCount} tone="danger" />
        <StatCard icon={Flame} label="Critical Open" value={criticalCount} sub="Immediate action" tone="critical" />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Recent Notifications</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> AI-prioritised, live from the database.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.length === 0 && (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No items yet.</CardContent></Card>
          )}
          {filtered.map((n) => {
            const realId = idMap.get(n.complaintId);
            const map = {
              success: { I: CheckCircle2, cls: "bg-success/20 text-foreground" },
              alert: { I: AlertTriangle, cls: "bg-warning/20 text-foreground" },
              escalation: { I: Flame, cls: "bg-destructive/15 text-destructive" },
              resolved: { I: CheckCircle2, cls: "bg-success/30 text-foreground" },
            }[n.kind];
            const Inner = (
              <CardContent className="flex gap-3 p-4">
                <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", map.cls)}>
                  <map.I className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium leading-tight">{n.title}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", PRIORITY_BADGE[n.priority])}>
                      {n.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.desc}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">{n.complaintId}</span>
                    <span>•</span>
                    <span>{n.time}</span>
                  </div>
                </div>
              </CardContent>
            );
            return (
              <Card key={n.id} className="transition-colors hover:bg-muted/40">
                {realId ? (
                  <Link to="/complaints/$id" params={{ id: realId }} className="block">{Inner}</Link>
                ) : Inner}
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
