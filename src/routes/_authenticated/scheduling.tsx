import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Calendar, CheckCircle2, XCircle, Sparkles, Layers, AlertTriangle,
  TrendingDown, TrendingUp, Wrench, Droplets, Zap, Trash2, Truck,
  Radio, Map as MapIcon, Filter, Download, ChevronRight, Users,
  DollarSign, Clock, GitBranch, ShieldAlert, Route as RouteIcon,
  CloudRain, Brain, Package, Activity, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/scheduling")({
  component: SchedulingPage,
});

// ============ MOCK DATA ============
const SUMMARY = [
  { label: "Scheduled Works", value: 214, delta: "+12", icon: Calendar, tone: "text-primary" },
  { label: "Optimized Schedules", value: 87, delta: "+9", icon: Sparkles, tone: "text-success" },
  { label: "AI Recommendations", value: 52, delta: "+7", icon: Brain, tone: "text-accent-foreground" },
  { label: "Resource Savings", value: "₹42.8L", delta: "+18%", icon: TrendingDown, tone: "text-success" },
  { label: "Duplicate Works Prevented", value: 34, delta: "+5", icon: Layers, tone: "text-warning" },
  { label: "Delayed Projects", value: 11, delta: "-3", icon: Clock, tone: "text-destructive" },
  { label: "Interdepartment Tasks", value: 46, delta: "+8", icon: GitBranch, tone: "text-primary" },
  { label: "Estimated Cost Savings", value: "₹1.24Cr", delta: "+22%", icon: DollarSign, tone: "text-success" },
];

type Rec = {
  id: string;
  title: string;
  ward: string;
  departments: string[];
  steps: { label: string; dept: string; days: number }[];
  reason: string;
  savings: { cost: string; days: number; excavations: number };
  confidence: number;
  completion: string;
};

const RECOMMENDATIONS: Rec[] = [
  {
    id: "OPT-2041",
    title: "Ward 12 — Road Laying vs Water Pipeline Leakage",
    ward: "Ward 12, MG Road",
    departments: ["Water Supply", "Roads"],
    steps: [
      { label: "Repair water pipeline", dept: "Water Supply", days: 2 },
      { label: "Quality inspection & backfill", dept: "Water Supply", days: 1 },
      { label: "Road laying & finishing", dept: "Roads", days: 3 },
    ],
    reason: "Road laying is scheduled for tomorrow on the same stretch where a high-priority pipeline leak was reported. Doing pipeline first avoids re-excavating a freshly paved road.",
    savings: { cost: "₹6.2L", days: 5, excavations: 1 },
    confidence: 96,
    completion: "6 days",
  },
  {
    id: "OPT-2042",
    title: "Ward 4 — Drainage rework before footpath tiling",
    ward: "Ward 4, Anna Nagar",
    departments: ["Drainage", "Roads"],
    steps: [
      { label: "Clear drainage blockage", dept: "Drainage", days: 1 },
      { label: "Reset kerb stones", dept: "Roads", days: 1 },
      { label: "Footpath tiling", dept: "Roads", days: 2 },
    ],
    reason: "Two open drainage complaints on the same corridor as scheduled footpath tiling. Tiling first would need to be lifted again within a week.",
    savings: { cost: "₹1.8L", days: 3, excavations: 1 },
    confidence: 91,
    completion: "4 days",
  },
  {
    id: "OPT-2043",
    title: "Ward 7 — Underground cable before streetlight installation",
    ward: "Ward 7, Sector 9",
    departments: ["Electricity", "Telecom"],
    steps: [
      { label: "Lay underground cable duct", dept: "Telecom", days: 2 },
      { label: "Power feed commissioning", dept: "Electricity", days: 1 },
      { label: "Streetlight pole install", dept: "Electricity", days: 2 },
    ],
    reason: "Streetlight installation is planned before duct laying — running duct after poles are set means trenching next to fresh foundations.",
    savings: { cost: "₹3.4L", days: 4, excavations: 2 },
    confidence: 88,
    completion: "5 days",
  },
  {
    id: "OPT-2044",
    title: "Ward 15 — Merge duplicate pothole tickets",
    ward: "Ward 15, Ring Road",
    departments: ["Roads"],
    steps: [
      { label: "Combine 6 pothole tickets", dept: "Roads", days: 0 },
      { label: "Single crew mobilisation", dept: "Roads", days: 1 },
      { label: "Mill & pave", dept: "Roads", days: 2 },
    ],
    reason: "Six pothole complaints within 300m — one mobilisation and one road closure instead of six.",
    savings: { cost: "₹2.1L", days: 4, excavations: 0 },
    confidence: 94,
    completion: "3 days",
  },
];

const CONFLICTS = [
  { severity: "critical", title: "Road resurfacing planned above pending pipeline repair", location: "Ward 12 · MG Road", fix: "Delay resurfacing by 3 days, complete pipeline first." },
  { severity: "high", title: "Two departments requesting excavation permits at same junction", location: "Ward 3 · Gandhi Chowk", fix: "Merge into a single joint dig; assign Roads as lead." },
  { severity: "medium", title: "Duplicate garbage-clearance orders on the same route", location: "Ward 9 · Market Rd", fix: "De-duplicate — one truck route covers all tickets." },
  { severity: "high", title: "Sanitation crew shortage for weekend workload", location: "Zone East", fix: "Reallocate 2 workers from Zone North (idle Sat)." },
];

const DEPENDENCIES = [
  { from: "Water Pipeline", to: "Road Repair", icon: Droplets },
  { from: "Drainage Repair", to: "Road Construction", icon: Droplets },
  { from: "Underground Cable", to: "Footpath Construction", icon: Radio },
  { from: "Gas Pipeline", to: "Road Excavation", icon: Truck },
  { from: "Electricity Maintenance", to: "Streetlight Installation", icon: Zap },
];

const RESOURCES = [
  { label: "Field Officers", used: 42, total: 60, unit: "" },
  { label: "Field Workers", used: 168, total: 220, unit: "" },
  { label: "JCB / Excavators", used: 9, total: 14, unit: "" },
  { label: "Tipper Trucks", used: 22, total: 30, unit: "" },
  { label: "Bitumen (Roads)", used: 62, total: 100, unit: "T" },
  { label: "HDPE Pipe (Water)", used: 340, total: 600, unit: "m" },
];

const COMPARISON = {
  current: { cost: "₹18.6L", duration: "22 d", excavations: 4, workforce: 34, material: "High" },
  optimized: { cost: "₹12.4L", duration: "14 d", excavations: 1, workforce: 26, material: "Optimized" },
  improvement: { cost: 33, duration: 36, excavations: 75, workforce: 24, material: 40 },
};

const DEPARTMENTS = [
  { name: "Roads", active: 42, pending: 8, joint: 6, tone: "bg-primary/10 text-primary border-primary/30" },
  { name: "Water Supply", active: 28, pending: 4, joint: 9, tone: "bg-accent/20 text-accent-foreground border-accent/40" },
  { name: "Drainage", active: 19, pending: 3, joint: 5, tone: "bg-warning/20 text-foreground border-warning/40" },
  { name: "Electricity", active: 24, pending: 5, joint: 4, tone: "bg-warning/20 text-foreground border-warning/40" },
  { name: "Sanitation", active: 33, pending: 2, joint: 3, tone: "bg-success/20 text-foreground border-success/40" },
  { name: "Telecom", active: 11, pending: 2, joint: 4, tone: "bg-secondary text-secondary-foreground" },
  { name: "Traffic", active: 14, pending: 1, joint: 2, tone: "bg-secondary text-secondary-foreground" },
];

const AI_FEATURES = [
  { icon: Brain, label: "Smart Task Prioritization" },
  { icon: GitBranch, label: "Dependency Detection" },
  { icon: Layers, label: "Duplicate Work Detection" },
  { icon: ShieldAlert, label: "Conflict Prediction" },
  { icon: Package, label: "Resource Allocation" },
  { icon: Users, label: "Officer Assignment" },
  { icon: DollarSign, label: "Budget Optimization" },
  { icon: Clock, label: "Delay Prediction" },
  { icon: Truck, label: "Traffic-aware Scheduling" },
  { icon: CloudRain, label: "Weather-aware Scheduling" },
  { icon: RouteIcon, label: "Route Optimization" },
  { icon: TrendingUp, label: "Cost Prediction" },
];

const TRENDS = [
  { month: "Jan", value: 38 }, { month: "Feb", value: 44 }, { month: "Mar", value: 51 },
  { month: "Apr", value: 58 }, { month: "May", value: 66 }, { month: "Jun", value: 74 },
];

const MAP_PINS = [
  { x: 18, y: 30, kind: "water", label: "Pipeline leak" },
  { x: 22, y: 32, kind: "road", label: "Road laying" },
  { x: 46, y: 20, kind: "drain", label: "Drainage block" },
  { x: 52, y: 62, kind: "elec", label: "Streetlight" },
  { x: 70, y: 40, kind: "road", label: "Pothole cluster" },
  { x: 34, y: 70, kind: "sanit", label: "Garbage route" },
  { x: 80, y: 74, kind: "water", label: "Valve replacement" },
  { x: 60, y: 12, kind: "drain", label: "Manhole" },
];

const PIN_STYLE: Record<string, string> = {
  water: "bg-primary",
  road: "bg-warning",
  drain: "bg-accent",
  elec: "bg-destructive",
  sanit: "bg-success",
};

// ============ COMPONENT ============
function SchedulingPage() {
  const [accepted, setAccepted] = useState<Record<string, "accept" | "reject" | undefined>>({});
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const recs = useMemo(
    () =>
      RECOMMENDATIONS.filter((r) => {
        if (deptFilter !== "all" && !r.departments.includes(deptFilter)) return false;
        if (query && !`${r.title} ${r.ward}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [deptFilter, query],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Optimized Action Scheduling
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Scheduling Command Center</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Coordinate maintenance across departments before work begins. Prevent duplicate excavation,
            optimize resources, and reduce public inconvenience.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ward / project"
              className="w-56 pl-8"
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {DEPARTMENTS.map((d) => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" />Export</Button>
        </div>
      </header>

      {/* Summary cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SUMMARY.map((s) => (
          <Card key={s.label} className="border-border/60 bg-card/70 backdrop-blur transition hover:shadow-md">
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold">{s.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.delta} vs last month</p>
              </div>
              <span className={cn("grid h-9 w-9 place-items-center rounded-lg bg-secondary", s.tone)}>
                <s.icon className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Tabs */}
      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="map">GIS Map</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="coordination">Coordination</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Recommendations */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {recs.map((r) => {
              const state = accepted[r.id];
              return (
                <Card key={r.id} className="border-border/60 bg-card/70 backdrop-blur">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{r.title}</CardTitle>
                        <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1"><MapIcon className="h-3.5 w-3.5" />{r.ward}</span>
                          {r.departments.map((d) => (
                            <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>
                          ))}
                        </CardDescription>
                      </div>
                      <div className="shrink-0 rounded-md border bg-secondary/40 px-2 py-1 text-center">
                        <p className="text-[10px] uppercase text-muted-foreground">Confidence</p>
                        <p className="text-sm font-semibold text-primary">{r.confidence}%</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Workflow steps */}
                    <ol className="space-y-2">
                      {r.steps.map((s, i) => (
                        <li key={i} className="flex items-center gap-3 rounded-md border bg-background/60 p-2.5">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{s.label}</p>
                            <p className="text-xs text-muted-foreground">{s.dept} · {s.days}d</p>
                          </div>
                          {i < r.steps.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                        </li>
                      ))}
                    </ol>

                    <p className="rounded-md bg-secondary/40 p-3 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Why:</span> {r.reason}
                    </p>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-md border bg-success/10 p-2">
                        <p className="text-[10px] uppercase text-muted-foreground">Cost saved</p>
                        <p className="text-sm font-semibold text-success">{r.savings.cost}</p>
                      </div>
                      <div className="rounded-md border bg-primary/10 p-2">
                        <p className="text-[10px] uppercase text-muted-foreground">Days saved</p>
                        <p className="text-sm font-semibold text-primary">{r.savings.days}d</p>
                      </div>
                      <div className="rounded-md border bg-accent/20 p-2">
                        <p className="text-[10px] uppercase text-muted-foreground">Excavations avoided</p>
                        <p className="text-sm font-semibold">{r.savings.excavations}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t pt-3">
                      <p className="text-xs text-muted-foreground">Est. completion: <span className="font-medium text-foreground">{r.completion}</span></p>
                      {state === "accept" ? (
                        <Badge className="bg-success text-success-foreground"><CheckCircle2 className="mr-1 h-3 w-3" />Accepted</Badge>
                      ) : state === "reject" ? (
                        <Badge variant="outline"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            setAccepted((s) => ({ ...s, [r.id]: "reject" }));
                            toast({ title: "Recommendation rejected", description: r.id });
                          }}>Reject</Button>
                          <Button size="sm" onClick={() => {
                            setAccepted((s) => ({ ...s, [r.id]: "accept" }));
                            toast({ title: "Schedule accepted", description: `${r.id} pushed to departments` });
                          }}>
                            Accept Schedule <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Conflicts */}
        <TabsContent value="conflicts" className="space-y-3">
          {CONFLICTS.map((c, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-wrap items-start gap-3 rounded-lg border p-4",
                c.severity === "critical" && "border-destructive/40 bg-destructive/5",
                c.severity === "high" && "border-warning/40 bg-warning/5",
                c.severity === "medium" && "border-accent/40 bg-accent/5",
              )}
            >
              <span className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-md",
                c.severity === "critical" ? "bg-destructive text-destructive-foreground" :
                c.severity === "high" ? "bg-warning text-warning-foreground" :
                "bg-accent text-accent-foreground",
              )}>
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="uppercase text-[10px]">{c.severity}</Badge>
                  <p className="font-medium">{c.title}</p>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.location}</p>
                <p className="mt-2 text-sm"><span className="font-medium">Suggested fix:</span> {c.fix}</p>
              </div>
              <Button size="sm" variant="outline">Resolve</Button>
            </div>
          ))}
        </TabsContent>

        {/* Dependencies */}
        <TabsContent value="dependencies" className="space-y-3">
          <Card className="border-border/60 bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Smart dependency detection</CardTitle>
              <CardDescription>Sub-surface work must complete before surface work — automatically enforced.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DEPENDENCIES.map((d, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border bg-background/60 p-3">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                    <d.icon className="h-4 w-4" />
                  </span>
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <Badge variant="outline">{d.from}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Badge>{d.to}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">Blocking rule</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Map */}
        <TabsContent value="map">
          <Card className="border-border/60 bg-card/70 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">GIS planning map</CardTitle>
                <CardDescription>Scheduled works, active complaints and utility zones.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(PIN_STYLE).map(([k, cls]) => (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <span className={cn("h-2.5 w-2.5 rounded-full", cls)} />
                    <span className="capitalize text-muted-foreground">{k}</span>
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative h-96 overflow-hidden rounded-lg border bg-gradient-to-br from-secondary/40 via-background to-accent/10">
                {/* grid */}
                <svg className="absolute inset-0 h-full w-full opacity-30" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
                {/* roads */}
                <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-muted-foreground/20" />
                <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-muted-foreground/20" />
                {/* pins */}
                {MAP_PINS.map((p, i) => (
                  <div
                    key={i}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  >
                    <span className={cn("block h-3 w-3 rounded-full ring-4 ring-background", PIN_STYLE[p.kind])} />
                    <span className="mt-1 block whitespace-nowrap rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium shadow">
                      {p.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources */}
        <TabsContent value="resources" className="grid gap-3 sm:grid-cols-2">
          {RESOURCES.map((r) => {
            const pct = Math.round((r.used / r.total) * 100);
            return (
              <Card key={r.label} className="border-border/60 bg-card/70 backdrop-blur">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.used}{r.unit} / {r.total}{r.unit}
                    </p>
                  </div>
                  <Progress value={pct} />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Utilisation {pct}%</span>
                    <Badge variant="outline" className="text-[10px]">
                      {pct > 85 ? "Tight" : pct > 60 ? "Balanced" : "Available"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Comparison */}
        <TabsContent value="comparison">
          <Card className="border-border/60 bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Current plan vs AI-optimized plan</CardTitle>
              <CardDescription>Side-by-side for the same corridor of works.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>AI Optimized</TableHead>
                    <TableHead className="text-right">Improvement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <Row label="Cost" a={COMPARISON.current.cost} b={COMPARISON.optimized.cost} imp={COMPARISON.improvement.cost} />
                  <Row label="Duration" a={COMPARISON.current.duration} b={COMPARISON.optimized.duration} imp={COMPARISON.improvement.duration} />
                  <Row label="Excavations" a={String(COMPARISON.current.excavations)} b={String(COMPARISON.optimized.excavations)} imp={COMPARISON.improvement.excavations} />
                  <Row label="Workforce" a={String(COMPARISON.current.workforce)} b={String(COMPARISON.optimized.workforce)} imp={COMPARISON.improvement.workforce} />
                  <Row label="Material usage" a={COMPARISON.current.material} b={COMPARISON.optimized.material} imp={COMPARISON.improvement.material} />
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coordination */}
        <TabsContent value="coordination">
          <Card className="border-border/60 bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Department coordination workspace</CardTitle>
              <CardDescription>Active load, pending approvals and joint maintenance opportunities.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Pending approvals</TableHead>
                    <TableHead>Joint tasks</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DEPARTMENTS.map((d) => (
                    <TableRow key={d.name}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.active}</TableCell>
                      <TableCell>{d.pending}</TableCell>
                      <TableCell>{d.joint}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={cn("border", d.tone)}>Operational</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          <Card className="border-border/60 bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Monthly optimization trend</CardTitle>
              <CardDescription>Optimized schedules accepted per month.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-48 items-end gap-3">
                {TRENDS.map((t) => (
                  <div key={t.month} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary/50"
                      style={{ height: `${t.value * 2}px` }}
                    />
                    <p className="text-xs text-muted-foreground">{t.month}</p>
                    <p className="text-xs font-medium">{t.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Cost savings YTD", value: "₹4.82Cr", icon: DollarSign },
              { label: "Time saved YTD", value: "312 d", icon: Clock },
              { label: "Duplicate works stopped", value: "128", icon: Layers },
              { label: "CO₂ reduced (est.)", value: "18.6 t", icon: Activity },
            ].map((k) => (
              <Card key={k.label} className="border-border/60 bg-card/70 backdrop-blur">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                    <k.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
                    <p className="text-lg font-semibold">{k.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* AI Feature grid */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">AI capabilities</h2>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {AI_FEATURES.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2 rounded-lg border bg-card/70 p-3 text-xs backdrop-blur transition hover:border-primary/50 hover:shadow"
            >
              <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
                <f.icon className="h-4 w-4" />
              </span>
              <span className="font-medium">{f.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Row({ label, a, b, imp }: { label: string; a: string; b: string; imp: number }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell className="text-muted-foreground line-through">{a}</TableCell>
      <TableCell className="font-semibold text-primary">{b}</TableCell>
      <TableCell className="text-right">
        <Badge className="bg-success text-success-foreground">
          <TrendingDown className="mr-1 h-3 w-3" />{imp}%
        </Badge>
      </TableCell>
    </TableRow>
  );
}
