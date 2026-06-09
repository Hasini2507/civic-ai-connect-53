import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bell, AlertTriangle, Clock, Flame, CheckCircle2, ArrowUpRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/alerts")({
  component: AlertsCenter,
});

type NotifKind = "success" | "alert" | "escalation" | "resolved";
type Notif = {
  id: string;
  kind: NotifKind;
  title: string;
  desc: string;
  time: string;
  complaintId: string;
  priority: "low" | "medium" | "high" | "critical";
};

const NOTIFS: Notif[] = [
  { id: "n1", kind: "success", title: "Complaint submitted successfully", desc: "Pothole report received and queued for AI triage.", time: "2 min ago", complaintId: "CMP-1042", priority: "medium" },
  { id: "n2", kind: "alert", title: "Complaint marked as High Priority", desc: "AI severity engine raised the priority due to accident risk.", time: "18 min ago", complaintId: "CMP-1038", priority: "high" },
  { id: "n3", kind: "alert", title: "Deadline approaching in 24 hours", desc: "Resolution SLA window is closing for water leakage.", time: "1 hr ago", complaintId: "CMP-1031", priority: "high" },
  { id: "n4", kind: "escalation", title: "Complaint automatically escalated", desc: "Routed from Municipal Officer → Assistant Engineer.", time: "3 hr ago", complaintId: "CMP-1024", priority: "critical" },
  { id: "n5", kind: "escalation", title: "Re-escalation triggered by AI", desc: "Deadline missed by 3 days. Escalated to District Roads Officer.", time: "5 hr ago", complaintId: "CMP-1024", priority: "critical" },
  { id: "n6", kind: "resolved", title: "Complaint resolved", desc: "Streetlight restored on Sector 14, verification pending.", time: "Yesterday", complaintId: "CMP-1019", priority: "medium" },
  { id: "n7", kind: "alert", title: "Hotspot detected near MG Road", desc: "5 related complaints in 500m radius in 48 hours.", time: "Yesterday", complaintId: "CMP-1024", priority: "critical" },
];

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

function NotifIcon({ kind }: { kind: NotifKind }) {
  const map = {
    success: { I: CheckCircle2, cls: "bg-success/20 text-foreground" },
    alert: { I: AlertTriangle, cls: "bg-warning/20 text-foreground" },
    escalation: { I: Flame, cls: "bg-destructive/15 text-destructive" },
    resolved: { I: CheckCircle2, cls: "bg-success/30 text-foreground" },
  }[kind];
  return (
    <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", map.cls)}>
      <map.I className="h-4 w-4" />
    </div>
  );
}

function AlertsCenter() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const filtered = useMemo(
    () => (filter === "all" ? NOTIFS : NOTIFS.filter((n) => n.kind === filter)),
    [filter],
  );

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Notification Center</h1>
        <p className="text-muted-foreground">
          Track complaint deadlines, AI alerts, and resolution progress.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Bell} label="Total Notifications" value="248" sub="+18 today" tone="primary" />
        <StatCard icon={ArrowUpRight} label="Active Escalations" value="14" sub="6 at L2 / 3 at L3" tone="alert" />
        <StatCard icon={Clock} label="Overdue Complaints" value="22" sub="9 critical" tone="danger" />
        <StatCard icon={Flame} label="Critical Alerts" value="7" sub="Immediate action" tone="critical" />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Recent Notifications</h2>
            <p className="text-sm text-muted-foreground">Real-time system, AI, and SLA notifications.</p>
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
          {filtered.map((n) => (
            <Card key={n.id} className="transition-colors hover:bg-muted/40">
              <CardContent className="flex gap-3 p-4">
                <NotifIcon kind={n.kind} />
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
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
