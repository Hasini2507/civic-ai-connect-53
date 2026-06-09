import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import {
  Briefcase, AlertTriangle, Clock, CheckCircle2, MapPin, Eye, Users,
  Upload, FileText, Brain, Flame, Timer, Image as ImageIcon, ShieldAlert,
} from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/municipality")({
  head: () => ({ meta: [{ title: "Municipality Dashboard · CivicSolve AI" }] }),
  component: MunicipalityDashboard,
});

type Priority = "critical" | "high" | "medium" | "low";
type Risk = "Severe" | "High" | "Moderate" | "Low";

type Complaint = {
  id: string;
  title: string;
  category: string;
  location: string;
  assignedDate: string;
  deadline: string;
  status: string;
  priority: Priority;
  aiScore: number;
  risk: Risk;
  damageType: string;
  estimatedSize: string;
  description: string;
  aiSummary: string;
  recommendations: string[];
  image: string;
  citizen: string;
};

const PRIORITY_RANK: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const SAMPLE: Complaint[] = [
  {
    id: "CIV-10421",
    title: "Large pothole near bus stand",
    category: "Pothole",
    location: "MG Road, Sector 14",
    assignedDate: "2026-06-07",
    deadline: "2026-06-09T18:00:00",
    status: "in_progress",
    priority: "critical",
    aiScore: 9.4,
    risk: "Severe",
    damageType: "Deep pavement cavity",
    estimatedSize: "1.8 m × 0.9 m × 22 cm",
    description: "Deep pothole has formed near the bus stop after recent rains. Two-wheelers swerving into traffic.",
    aiSummary: "Large pothole detected near bus stand. High accident risk. Immediate repair recommended within 24 hours.",
    recommendations: [
      "Immediate repair recommended.",
      "High accident probability.",
      "Escalation risk in 12 hours.",
      "Multiple complaints detected nearby (3 within 200m).",
    ],
    image: "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?w=900&q=70",
    citizen: "R. Sharma",
  },
  {
    id: "CIV-10398",
    title: "Overflowing garbage bin",
    category: "Garbage Issue",
    location: "Park Street, Block C",
    assignedDate: "2026-06-06",
    deadline: "2026-06-10T12:00:00",
    status: "assigned",
    priority: "high",
    aiScore: 8.1,
    risk: "High",
    damageType: "Sanitation overflow",
    estimatedSize: "4 bins, 3-day buildup",
    description: "Garbage bin has been overflowing for three days. Stench attracting strays.",
    aiSummary: "Sanitation hazard with disease vector risk. Dispatch cleaning crew within 24h.",
    recommendations: [
      "Dispatch sanitation team immediately.",
      "Monitor for vector-borne disease risk.",
      "Increase pickup frequency for this route.",
    ],
    image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=900&q=70",
    citizen: "A. Khan",
  },
  {
    id: "CIV-10367",
    title: "Broken streetlight at junction",
    category: "Streetlight Issue",
    location: "Lake View Junction",
    assignedDate: "2026-06-05",
    deadline: "2026-06-08T20:00:00",
    status: "submitted",
    priority: "high",
    aiScore: 7.8,
    risk: "High",
    damageType: "Electrical outage",
    estimatedSize: "3 poles affected",
    description: "Three streetlights at the junction are out, creating a dark stretch at night.",
    aiSummary: "Night-time visibility hazard at busy junction. Crime and accident risk elevated.",
    recommendations: [
      "Replace LED fixtures.",
      "Inspect wiring for shorts.",
      "Coordinate with electricity dept.",
    ],
    image: "https://images.unsplash.com/photo-1517400508447-f8dd518b86db?w=900&q=70",
    citizen: "P. Iyer",
  },
  {
    id: "CIV-10310",
    title: "Water leakage on main pipeline",
    category: "Water Leakage",
    location: "Industrial Area, Phase 2",
    assignedDate: "2026-06-04",
    deadline: "2026-06-07T09:00:00",
    status: "waiting_for_verification",
    priority: "critical",
    aiScore: 9.0,
    risk: "Severe",
    damageType: "Pipeline rupture",
    estimatedSize: "~12,000 L/day loss",
    description: "Significant water leakage along the main supply line. Pressure dropping in adjacent blocks.",
    aiSummary: "Critical water loss. Estimated 12k litres/day wastage. Repair crew dispatched.",
    recommendations: [
      "Shut valve V-204 before repair.",
      "Notify residents of supply interruption.",
      "Inspect adjacent joints for corrosion.",
    ],
    image: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=900&q=70",
    citizen: "S. Mehta",
  },
  {
    id: "CIV-10288",
    title: "Open manhole on residential street",
    category: "Open Manhole",
    location: "Rosewood Avenue",
    assignedDate: "2026-06-03",
    deadline: "2026-06-05T18:00:00",
    status: "in_progress",
    priority: "critical",
    aiScore: 9.7,
    risk: "Severe",
    damageType: "Missing cover",
    estimatedSize: "0.8 m dia open shaft",
    description: "Manhole cover missing for two days. Children play nearby — extreme fall hazard.",
    aiSummary: "Life-safety hazard. Immediate barricade and cover replacement required.",
    recommendations: [
      "Barricade within 1 hour.",
      "Replace cover same day.",
      "Audit nearby manholes for missing covers.",
    ],
    image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=900&q=70",
    citizen: "N. Verma",
  },
  {
    id: "CIV-10256",
    title: "Faded zebra crossing near school",
    category: "Road Damage",
    location: "St. Mary's School Gate",
    assignedDate: "2026-06-02",
    deadline: "2026-06-12T17:00:00",
    status: "assigned",
    priority: "medium",
    aiScore: 6.2,
    risk: "Moderate",
    damageType: "Marking wear",
    estimatedSize: "12 m crossing",
    description: "Zebra crossing markings have faded almost completely. Drivers no longer slowing down.",
    aiSummary: "Pedestrian risk near school zone. Repaint within SLA window.",
    recommendations: [
      "Repaint with thermoplastic.",
      "Add rumble strip 20m before crossing.",
    ],
    image: "https://images.unsplash.com/photo-1545459720-aac8509eb02c?w=900&q=70",
    citizen: "D. Singh",
  },
  {
    id: "CIV-10201",
    title: "Fallen tree blocking lane",
    category: "Fallen Tree",
    location: "Green Park Lane",
    assignedDate: "2026-06-01",
    deadline: "2026-06-04T08:00:00",
    status: "resolved",
    priority: "high",
    aiScore: 7.4,
    risk: "High",
    damageType: "Obstruction",
    estimatedSize: "8 m trunk across road",
    description: "Storm-felled tree blocking one lane completely.",
    aiSummary: "Traffic obstruction cleared. Confirm debris removal.",
    recommendations: ["Verify debris removal.", "Inspect adjacent trees for stability."],
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=900&q=70",
    citizen: "K. Rao",
  },
  {
    id: "CIV-10180",
    title: "Drainage block causing flooding",
    category: "Drainage Issue",
    location: "Market Lane 5",
    assignedDate: "2026-05-30",
    deadline: "2026-06-06T16:00:00",
    status: "in_progress",
    priority: "low",
    aiScore: 4.1,
    risk: "Low",
    damageType: "Silt accumulation",
    estimatedSize: "30 m stretch",
    description: "Standing water near market entrance during light rain.",
    aiSummary: "Routine de-silting required. Low immediate risk.",
    recommendations: ["Schedule de-silting.", "Coordinate with sanitation dept."],
    image: "https://images.unsplash.com/photo-1500964757637-c85e8a162699?w=900&q=70",
    citizen: "M. Joseph",
  },
];

const PERF_DATA = [
  { month: "Jan", resolved: 38, escalated: 6, pending: 18, avgHours: 42 },
  { month: "Feb", resolved: 44, escalated: 5, pending: 16, avgHours: 39 },
  { month: "Mar", resolved: 52, escalated: 8, pending: 21, avgHours: 36 },
  { month: "Apr", resolved: 61, escalated: 4, pending: 14, avgHours: 31 },
  { month: "May", resolved: 70, escalated: 7, pending: 19, avgHours: 28 },
  { month: "Jun", resolved: 58, escalated: 3, pending: 12, avgHours: 25 },
];

function MunicipalityDashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>(SAMPLE);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [notes, setNotes] = useState("");

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      assigned: complaints.length,
      critical: complaints.filter((c) => c.priority === "critical").length,
      overdue: complaints.filter(
        (c) => new Date(c.deadline) < new Date() && !["resolved", "closed"].includes(c.status),
      ).length,
      resolvedToday: complaints.filter(
        (c) => c.status === "resolved" && c.assignedDate <= today,
      ).length,
    };
  }, [complaints]);

  const aiQueue = useMemo(
    () =>
      [...complaints].sort(
        (a, b) =>
          PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
          b.aiScore - a.aiScore,
      ),
    [complaints],
  );

  const criticals = complaints.filter((c) => c.priority === "critical");

  function updateStatus(id: string, status: string) {
    setComplaints((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)));
    setSelected((s) => (s && s.id === id ? { ...s, status } : s));
    toast.success(`Status updated → ${status.replace(/_/g, " ")}`);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Municipality Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage assigned civic issues and track AI-prioritized complaints.
        </p>
      </header>

      {/* TOP STATS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Briefcase} label="Assigned Complaints" value={stats.assigned} />
        <StatCard icon={Flame} label="Critical Issues" value={stats.critical} tone="destructive" />
        <StatCard icon={Clock} label="Overdue Complaints" value={stats.overdue} tone="warning" />
        <StatCard icon={CheckCircle2} label="Resolved Today" value={stats.resolvedToday} tone="success" />
      </div>

      {/* SECTION 1: AI PRIORITY QUEUE */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" />
            <CardTitle>AI Priority Queue</CardTitle>
          </div>
          <CardDescription>Sorted by AI severity score and priority level.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">AI Score</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aiQueue.map((c) => (
                <TableRow
                  key={c.id}
                  className={cn(c.priority === "critical" && "bg-destructive/5")}
                >
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell className="text-muted-foreground">{c.location}</TableCell>
                  <TableCell className="text-right font-mono">{c.aiScore.toFixed(1)}</TableCell>
                  <TableCell>{c.risk}</TableCell>
                  <TableCell><PriorityBadge level={c.priority} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(c.deadline).toLocaleDateString()}
                  </TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* SECTION 2: COMPLAINT MANAGEMENT */}
      <Card>
        <CardHeader>
          <CardTitle>Complaint Management</CardTitle>
          <CardDescription>Take action on individual complaints.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Issue Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {complaints.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell>{c.category}</TableCell>
                  <TableCell className="text-muted-foreground">{c.location}</TableCell>
                  <TableCell className="text-xs">{c.assignedDate}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setSelected(c)}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toast("Team assignment opened")}>
                        <Users className="h-3.5 w-3.5" /> Assign Team
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "in_progress")}>
                        Update
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toast.success("Repair proof uploaded")}>
                        <Upload className="h-3.5 w-3.5" /> Proof
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* SECTION 6: CRITICAL ISSUES */}
      <Card className="border-destructive/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <CardTitle className="text-destructive">Critical Issues</CardTitle>
          </div>
          <CardDescription>Highest-risk complaints with escalation countdown.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {criticals.map((c) => (
            <div key={c.id} className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    <MapPin className="mr-1 inline h-3 w-3" />{c.location}
                  </p>
                </div>
                <PriorityBadge level={c.priority} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">{c.id}</span>
                <Countdown deadline={c.deadline} />
              </div>
            </div>
          ))}
          {criticals.length === 0 && (
            <p className="text-sm text-muted-foreground">No critical issues open.</p>
          )}
        </CardContent>
      </Card>

      {/* SECTION 7: PERFORMANCE */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resolution Rate & Backlog</CardTitle>
            <CardDescription>Monthly resolved vs pending vs escalated.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PERF_DATA}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="resolved" fill="hsl(var(--success))" name="Resolved" />
                <Bar dataKey="pending" fill="hsl(var(--warning))" name="Pending" />
                <Bar dataKey="escalated" fill="hsl(var(--destructive))" name="Escalated" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Resolution Time</CardTitle>
            <CardDescription>Hours to resolution, trending down.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={PERF_DATA}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="avgHours"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Avg hours"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ISSUE DETAILS DIALOG */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {selected.id} · Reported by {selected.citizen}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="aspect-video overflow-hidden rounded-lg border bg-muted">
                    <img src={selected.image} alt={selected.title} className="h-full w-full object-cover" />
                  </div>
                  <InfoRow icon={MapPin} label="Location" value={selected.location} />
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Citizen description</p>
                    <p className="mt-1 text-sm">{selected.description}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border bg-accent/5 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Brain className="h-4 w-4 text-accent" />
                      <p className="text-sm font-semibold">AI Analysis</p>
                    </div>
                    <dl className="grid grid-cols-2 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">Damage Type</dt>
                      <dd className="font-medium">{selected.damageType}</dd>
                      <dt className="text-muted-foreground">Severity Score</dt>
                      <dd className="font-mono font-medium">{selected.aiScore.toFixed(1)} / 10</dd>
                      <dt className="text-muted-foreground">Risk Level</dt>
                      <dd className="font-medium">{selected.risk}</dd>
                      <dt className="text-muted-foreground">Estimated Size</dt>
                      <dd className="font-medium">{selected.estimatedSize}</dd>
                    </dl>
                    <p className="mt-3 border-t pt-2 text-xs italic text-muted-foreground">
                      {selected.aiSummary}
                    </p>
                  </div>

                  <div className="rounded-lg border bg-card p-3">
                    <p className="mb-2 text-sm font-semibold">AI Recommendations</p>
                    <ul className="space-y-1.5">
                      {selected.recommendations.map((r) => (
                        <li key={r} className="flex gap-2 text-xs">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border bg-card p-3">
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <FileText className="h-4 w-4" /> Repair Management
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => updateStatus(selected.id, "in_progress")}>
                        Mark In Progress
                      </Button>
                      <Button size="sm" onClick={() => updateStatus(selected.id, "resolved")}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark Resolved
                      </Button>
                    </div>
                    <div className="mt-3 space-y-2">
                      <Label htmlFor="repair-img" className="text-xs">Upload repair image</Label>
                      <Input id="repair-img" type="file" accept="image/*" onChange={() => toast.success("Repair image queued")} />
                      <Label htmlFor="notes" className="text-xs">Notes</Label>
                      <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Add field notes..." />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                <Button onClick={() => { toast.success("Notes saved"); setNotes(""); }}>
                  Save Notes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, tone,
}: { icon: any; label: string; value: number; tone?: "success" | "destructive" | "warning" }) {
  const tones: Record<string, string> = {
    success: "text-success",
    destructive: "text-destructive",
    warning: "text-warning",
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className={cn("h-4 w-4", tone ? tones[tone] : "text-muted-foreground")} />
        </div>
        <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs uppercase text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function Countdown({ deadline }: { deadline: string }) {
  const ms = new Date(deadline).getTime() - Date.now();
  const overdue = ms < 0;
  const hours = Math.floor(Math.abs(ms) / 3600000);
  const mins = Math.floor((Math.abs(ms) % 3600000) / 60000);
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono font-medium", overdue ? "text-destructive" : "text-warning")}>
      <Timer className="h-3 w-3" />
      {overdue ? `Escalated · ${hours}h ${mins}m overdue` : `Escalates in ${hours}h ${mins}m`}
    </span>
  );
}
