import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle, Clock, Flame, ArrowUpRight, Sparkles, MapPin,
  ShieldAlert, ArrowDown, Activity, GitMerge, TrendingUp, Radar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/smart-escalation")({
  component: SmartEscalationPage,
});

const ESCALATIONS = [
  { id: "CMP-1024", title: "Large pothole on MG Road", officer: "Municipal Engineer", priority: "critical", assigned: "Jun 2", deadline: "Jun 3", status: "Overdue", level: 2 },
  { id: "CMP-1031", title: "Persistent water leakage, Sector 9", officer: "Water Dept. Officer", priority: "high", assigned: "Jun 4", deadline: "Jun 6", status: "Due Soon", level: 1 },
  { id: "CMP-1027", title: "Overflowing garbage bin, Market Rd", officer: "Sanitation Officer", priority: "high", assigned: "Jun 3", deadline: "Jun 5", status: "Overdue", level: 1 },
  { id: "CMP-1038", title: "Open manhole near school zone", officer: "Sewerage Engineer", priority: "critical", assigned: "Jun 5", deadline: "Jun 6", status: "Escalated", level: 3 },
  { id: "CMP-1020", title: "Traffic signal malfunction", officer: "Electricity Officer", priority: "high", assigned: "Jun 1", deadline: "Jun 4", status: "Overdue", level: 2 },
];

const CHAIN = ["Municipal Officer", "Assistant Engineer", "District Roads Officer", "Commissioner"];

const TIMELINE = [
  { label: "Complaint Submitted", time: "Jun 2, 09:14", tone: "done" },
  { label: "AI Severity Analysis Completed", time: "Jun 2, 09:14", tone: "done" },
  { label: "Assigned to Municipal Officer", time: "Jun 2, 09:22", tone: "done" },
  { label: "Deadline Missed", time: "Jun 3, 18:00", tone: "alert" },
  { label: "Escalated to Assistant Engineer", time: "Jun 4, 09:00", tone: "escalate" },
  { label: "Escalated to District Roads Officer", time: "Jun 6, 10:30", tone: "escalate" },
  { label: "Awaiting Action", time: "now", tone: "pending" },
];

const AI_ACTIONS = [
  { icon: ShieldAlert, label: "Critical pothole detected on MG Road", time: "2 min ago" },
  { icon: GitMerge, label: "Duplicate complaint merged into CMP-1024", time: "12 min ago" },
  { icon: TrendingUp, label: "Risk score increased: 7.2 → 9.1", time: "32 min ago" },
  { icon: ArrowUpRight, label: "Complaint CMP-1024 auto-escalated to Level 2", time: "3 hr ago" },
  { icon: Radar, label: "Hotspot area identified: MG Road corridor", time: "5 hr ago" },
  { icon: Sparkles, label: "Predicted ETA recomputed for 14 complaints", time: "8 hr ago" },
];

const OVERDUE = [
  { issue: "Large pothole", location: "MG Road, near Bus Stand", priority: "critical", days: 5, officer: "Municipal Engineer", level: 2 },
  { issue: "Open manhole", location: "School Lane, Sector 7", priority: "critical", days: 2, officer: "Sewerage Engineer", level: 3 },
  { issue: "Overflowing garbage", location: "Market Road", priority: "high", days: 3, officer: "Sanitation Officer", level: 1 },
  { issue: "Traffic signal failure", location: "Ring Road Jn.", priority: "high", days: 4, officer: "Electricity Officer", level: 2 },
];

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

function SmartEscalationPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Smart Escalation Monitor</h1>
        <p className="text-muted-foreground">
          AI-tracked complaints nearing or past SLA deadlines, with autonomous escalation chains.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ArrowUpRight} label="Active Escalations" value="14" sub="6 at L2 / 3 at L3" tone="alert" />
        <StatCard icon={Clock} label="Overdue Complaints" value="22" sub="9 critical" tone="danger" />
        <StatCard icon={Flame} label="Critical Alerts" value="7" sub="Immediate action" tone="critical" />
        <StatCard icon={AlertTriangle} label="SLA Breaches Today" value="5" sub="+2 vs yesterday" tone="primary" />
      </section>

      {/* Escalation Monitor Table */}
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Escalation Queue</h2>
          <p className="text-sm text-muted-foreground">Complaints currently tracked by the AI escalation engine.</p>
        </div>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Complaint ID</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Officer</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ESCALATIONS.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.id}</TableCell>
                  <TableCell className="max-w-[240px] truncate font-medium">{e.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.officer}</TableCell>
                  <TableCell>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", PRIORITY_BADGE[e.priority])}>
                      {e.priority}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{e.assigned}</TableCell>
                  <TableCell className="text-sm">{e.deadline}</TableCell>
                  <TableCell>
                    <Badge variant={e.status === "Overdue" || e.status === "Escalated" ? "destructive" : "secondary"}>
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive/15 text-xs font-semibold text-destructive">
                      L{e.level}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Escalation Engine
            </CardTitle>
            <CardDescription>Automated escalation chain for unresolved complaints.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-center">
              {CHAIN.map((step, i) => {
                const current = i === 2;
                const passed = i < 2;
                return (
                  <div key={step} className="flex flex-1 items-center gap-2">
                    <div
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-3 text-center text-sm font-medium transition-colors",
                        current && "border-destructive bg-destructive/10 text-destructive shadow-sm",
                        passed && "border-success/40 bg-success/10",
                        !current && !passed && "border-dashed text-muted-foreground",
                      )}
                    >
                      {step}
                      {current && <div className="mt-1 text-[10px] uppercase tracking-wide">Current</div>}
                    </div>
                    {i < CHAIN.length - 1 && (
                      <ArrowDown className="h-4 w-4 shrink-0 text-muted-foreground md:-rotate-90" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm">Complaint #CMP-1024</p>
                <Badge variant="destructive">Escalation L2</Badge>
              </div>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Current Level</dt>
                  <dd className="font-medium">District Roads Officer</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Reason</dt>
                  <dd className="font-medium">Deadline missed by 3 days</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">AI Recommendation</dt>
                  <dd className="font-medium text-destructive">Immediate action required</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm">Acknowledge</Button>
                <Button size="sm" variant="outline">Reassign Officer</Button>
                <Button size="sm" variant="ghost">View Complaint</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> AI Activity Panel
            </CardTitle>
            <CardDescription>Latest autonomous decisions.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {AI_ACTIONS.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <a.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm leading-tight">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Escalation Timeline — CMP-1024</CardTitle>
            <CardDescription>End-to-end lifecycle including AI checkpoints and escalations.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-5 border-l-2 border-dashed pl-6">
              {TIMELINE.map((t, i) => {
                const dot =
                  t.tone === "done" ? "bg-success text-success-foreground"
                  : t.tone === "alert" ? "bg-warning text-foreground"
                  : t.tone === "escalate" ? "bg-destructive text-destructive-foreground"
                  : "bg-muted text-foreground";
                return (
                  <li key={i} className="relative">
                    <span className={cn("absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full ring-4 ring-background", dot)}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{t.label}</p>
                      {t.tone === "escalate" && <Badge variant="destructive">Escalation</Badge>}
                      {t.tone === "alert" && <Badge variant="secondary">SLA Breach</Badge>}
                      {t.tone === "pending" && <Badge variant="outline">Pending</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{t.time}</p>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-destructive" />
          <h2 className="text-xl font-semibold">Overdue Complaints</h2>
        </div>
        <Card className="border-destructive/40 bg-destructive/5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead>Assigned Officer</TableHead>
                <TableHead className="text-right">Escalation Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {OVERDUE.map((o, i) => (
                <TableRow key={i} className="hover:bg-destructive/10">
                  <TableCell className="font-medium">{o.issue}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {o.location}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", PRIORITY_BADGE[o.priority])}>
                      {o.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-destructive">{o.days} days</span>
                  </TableCell>
                  <TableCell className="text-sm">{o.officer}</TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-semibold text-destructive-foreground">
                      L{o.level}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
