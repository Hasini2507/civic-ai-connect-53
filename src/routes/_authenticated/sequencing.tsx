import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Route as AuthRoute } from "@/routes/_authenticated/route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight, Sparkles, MapPin, Clock, IndianRupee, Layers,
  AlertTriangle, CheckCircle2, Workflow, Building2,
} from "lucide-react";
import { CATEGORIES, categoryLabel, PRIORITY_COLORS } from "@/lib/civic";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sequencing")({
  beforeLoad: ({ context }) => {
    const roles = (context as { roles: string[] }).roles ?? [];
    if (!roles.includes("officer") && !roles.includes("admin")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: SequencingPage,
});

// -------- Domain: work dependency graph --------

type Dept = "water" | "sewerage" | "electricity" | "road" | "sanitation" | "municipal";

const DEPT_LABEL: Record<Dept, string> = {
  water: "Water Board",
  sewerage: "Drainage & Sewerage",
  electricity: "Electricity",
  road: "Roads & Highways",
  sanitation: "Sanitation",
  municipal: "Municipal Works",
};

// depth tier: lower runs first. Underground (1) → sub-surface (2) → surface (3) → above ground (4)
const CATEGORY_META: Record<string, { dept: Dept; tier: number; hours: number; cost: number }> = {
  water_leakage:                 { dept: "water",       tier: 1, hours: 8,  cost: 45000 },
  drainage_blockage:             { dept: "sewerage",    tier: 1, hours: 6,  cost: 30000 },
  open_manhole:                  { dept: "sewerage",    tier: 1, hours: 3,  cost: 15000 },
  streetlight_failure:           { dept: "electricity", tier: 2, hours: 2,  cost: 8000  },
  traffic_signal_damage:         { dept: "electricity", tier: 2, hours: 4,  cost: 22000 },
  pothole:                       { dept: "road",        tier: 3, hours: 4,  cost: 18000 },
  road_damage:                   { dept: "road",        tier: 3, hours: 10, cost: 75000 },
  garbage_overflow:              { dept: "sanitation",  tier: 4, hours: 2,  cost: 4000  },
  fallen_tree:                   { dept: "municipal",   tier: 4, hours: 3,  cost: 6000  },
  public_infrastructure_damage:  { dept: "municipal",   tier: 4, hours: 6,  cost: 25000 },
  other:                         { dept: "municipal",   tier: 5, hours: 4,  cost: 10000 },
};

// Scheduled municipal works (mock — no such table exists yet)
type ScheduledWork = {
  id: string;
  title: string;
  category: keyof typeof CATEGORY_META;
  address: string;
  lat: number;
  lng: number;
  planned_start: string;
};
const SCHEDULED_WORKS: ScheduledWork[] = [
  { id: "w1", title: "Resurfacing – MG Road (Sec 4)",  category: "road_damage",        address: "MG Road, Sector 4", lat: 12.97, lng: 77.59, planned_start: "2026-07-22" },
  { id: "w2", title: "Streetlight retrofit – Park Ave", category: "streetlight_failure", address: "Park Avenue",       lat: 12.98, lng: 77.60, planned_start: "2026-07-25" },
  { id: "w3", title: "Road laying – Lake View Rd",      category: "road_damage",        address: "Lake View Road",    lat: 13.01, lng: 77.58, planned_start: "2026-07-28" },
  { id: "w4", title: "Signal upgrade – Junction 12",    category: "traffic_signal_damage", address: "Junction 12",     lat: 12.96, lng: 77.61, planned_start: "2026-08-02" },
];

function areaKey(lat?: number | null, lng?: number | null, address?: string | null) {
  if (lat != null && lng != null) return `${lat.toFixed(2)}:${lng.toFixed(2)}`;
  return (address ?? "unknown").trim().toLowerCase().slice(0, 40);
}

const PRIO: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

type SequenceStep = {
  kind: "complaint" | "work";
  id: string;
  title: string;
  category: string;
  dept: Dept;
  tier: number;
  hours: number;
  cost: number;
  priority?: string;
  address?: string | null;
  reason: string;
};

type Recommendation = {
  areaKey: string;
  location: string;
  steps: SequenceStep[];
  departments: Dept[];
  naiveHours: number;
  optimizedHours: number;
  timeSavedHours: number;
  costSaved: number;
  reworkAvoided: string[];
  confidence: number;
};

function buildRecommendations(
  complaints: Array<{
    id: string; title: string; category: string; priority_level?: string;
    latitude?: number | null; longitude?: number | null; address?: string | null;
    status: string; created_at?: string;
  }>,
): Recommendation[] {
  const groups = new Map<string, {
    complaints: typeof complaints;
    works: ScheduledWork[];
    address: string;
  }>();

  const openComplaints = complaints.filter(
    (c) => !["resolved", "closed", "verified"].includes(c.status),
  );

  for (const c of openComplaints) {
    const k = areaKey(c.latitude, c.longitude, c.address);
    const g = groups.get(k) ?? { complaints: [], works: [], address: c.address ?? "Unknown area" };
    g.complaints.push(c);
    groups.set(k, g);
  }
  for (const w of SCHEDULED_WORKS) {
    const k = areaKey(w.lat, w.lng, w.address);
    const g = groups.get(k) ?? { complaints: [], works: [], address: w.address };
    g.works.push(w);
    groups.set(k, g);
  }

  const recs: Recommendation[] = [];
  for (const [key, g] of groups) {
    // Only interesting when there is at least one dependency-relevant pair
    if (g.complaints.length + g.works.length < 2) continue;

    const steps: SequenceStep[] = [
      ...g.complaints.map<SequenceStep>((c) => {
        const meta = CATEGORY_META[c.category] ?? CATEGORY_META.other;
        return {
          kind: "complaint",
          id: c.id,
          title: c.title,
          category: c.category,
          dept: meta.dept,
          tier: meta.tier,
          hours: meta.hours,
          cost: meta.cost,
          priority: c.priority_level,
          address: c.address,
          reason: "",
        };
      }),
      ...g.works.map<SequenceStep>((w) => {
        const meta = CATEGORY_META[w.category] ?? CATEGORY_META.other;
        return {
          kind: "work",
          id: w.id,
          title: w.title,
          category: w.category,
          dept: meta.dept,
          tier: meta.tier,
          hours: meta.hours,
          cost: meta.cost,
          address: w.address,
          reason: "",
        };
      }),
    ];

    // Sort: tier asc (dig-first), then priority desc, then complaints before pre-planned works of same tier
    steps.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      const ap = PRIO[a.priority ?? "medium"] ?? 2;
      const bp = PRIO[b.priority ?? "medium"] ?? 2;
      if (ap !== bp) return bp - ap;
      if (a.kind !== b.kind) return a.kind === "complaint" ? -1 : 1;
      return 0;
    });

    // annotate reasons
    steps.forEach((s, i) => {
      const prev = i > 0 ? steps[i - 1] : null;
      if (i === 0) {
        s.reason =
          s.tier === 1
            ? "Underground utility work — must happen before any resurfacing to avoid re-excavation."
            : s.tier === 2
            ? "Sub-surface work — complete before road-level jobs."
            : "Highest-priority job for this location.";
      } else if (prev && prev.tier < s.tier) {
        s.reason = `Wait for ${categoryLabel(prev.category)} — otherwise this work would be undone to redo it.`;
      } else if (prev && prev.tier === s.tier && prev.dept === s.dept) {
        s.reason = `Same crew (${DEPT_LABEL[s.dept]}) can chain this immediately — one mobilisation.`;
      } else {
        s.reason = "Fits the same site window; run after prior tier completes.";
      }
    });

    // Cost/time modelling
    // Naive (worst case): if road work runs before an underground fix, that surface must be redone.
    const hasUnderground = steps.some((s) => s.tier <= 2);
    const hasSurface = steps.some((s) => s.tier === 3);
    const surfaceCost = steps.filter((s) => s.tier === 3).reduce((n, s) => n + s.cost, 0);
    const surfaceHours = steps.filter((s) => s.tier === 3).reduce((n, s) => n + s.hours, 0);
    const totalHours = steps.reduce((n, s) => n + s.hours, 0);
    const naiveHours = totalHours + (hasUnderground && hasSurface ? surfaceHours : 0);
    const optimizedHours = totalHours;
    const costSaved = hasUnderground && hasSurface ? Math.round(surfaceCost * 0.9) : 0;

    const reworkAvoided: string[] = [];
    if (hasUnderground && hasSurface) {
      reworkAvoided.push("Re-excavation of freshly laid road surface");
      reworkAvoided.push("Duplicate mobilisation for Roads department");
    }
    const uniqueDepts = Array.from(new Set(steps.map((s) => s.dept)));
    if (uniqueDepts.length > 1) {
      reworkAvoided.push(`Cross-department coordination across ${uniqueDepts.length} agencies`);
    }

    const confidence = Math.min(
      98,
      60 +
        (hasUnderground && hasSurface ? 25 : 0) +
        (uniqueDepts.length > 1 ? 8 : 0) +
        (steps.length >= 3 ? 5 : 0),
    );

    recs.push({
      areaKey: key,
      location: g.address,
      steps,
      departments: uniqueDepts,
      naiveHours,
      optimizedHours,
      timeSavedHours: naiveHours - optimizedHours,
      costSaved,
      reworkAvoided,
      confidence,
    });
  }

  // sort recommendations by potential savings
  recs.sort((a, b) => b.costSaved + b.timeSavedHours * 100 - (a.costSaved + a.timeSavedHours * 100));
  return recs;
}

// -------- Component --------

function SequencingPage() {
  const { roles, departmentId } = AuthRoute.useRouteContext();
  const isAdmin = roles.includes("admin");

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["sequencing", "complaints", departmentId, isAdmin],
    queryFn: async () => {
      let q = supabase
        .from("complaints")
        .select("id,title,category,priority_level,latitude,longitude,address,status,created_at,department_id")
        .in("status", ["submitted", "under_review", "assigned", "in_progress", "waiting_for_verification"])
        .order("created_at", { ascending: false })
        .limit(300);
      if (!isAdmin && departmentId) q = q.eq("department_id", departmentId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const recs = useMemo(() => buildRecommendations(complaints), [complaints]);
  const [accepted, setAccepted] = useState<Record<string, "accepted" | "rejected" | undefined>>({});

  const totalCostSaved = recs.reduce((n, r) => n + r.costSaved, 0);
  const totalHoursSaved = recs.reduce((n, r) => n + r.timeSavedHours, 0);
  const totalDepts = new Set(recs.flatMap((r) => r.departments)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Activity Sequencing
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Recommended Order of Execution
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The system correlates pending complaints with planned government works in the same
            location and proposes a sequence that eliminates re-digging, duplicate mobilisation,
            and cross-department clashes.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi icon={<Workflow className="h-4 w-4" />} label="AI recommendations" value={String(recs.length)} />
        <Kpi icon={<IndianRupee className="h-4 w-4" />} label="Estimated cost avoided" value={`₹${totalCostSaved.toLocaleString("en-IN")}`} />
        <Kpi icon={<Clock className="h-4 w-4" />} label="Hours of rework avoided" value={`${totalHoursSaved}h`} />
        <Kpi icon={<Building2 className="h-4 w-4" />} label="Departments coordinated" value={String(totalDepts)} />
      </div>

      {isLoading && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Analysing complaints and planned works…</CardContent></Card>
      )}

      {!isLoading && recs.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No overlapping activities detected. When multiple complaints or scheduled works fall in
            the same area, sequencing recommendations will appear here.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {recs.map((r) => {
          const state = accepted[r.areaKey];
          return (
            <Card key={r.areaKey} className={cn(state === "accepted" && "border-success/50", state === "rejected" && "opacity-70")}>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4 text-primary" />
                    {r.location}
                    <Badge variant="secondary" className="ml-1">{r.steps.length} activities</Badge>
                  </CardTitle>
                  <div className="flex flex-wrap gap-1.5">
                    {r.departments.map((d) => (
                      <Badge key={d} variant="outline" className="text-xs">
                        <Building2 className="mr-1 h-3 w-3" />{DEPT_LABEL[d]}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                    <Sparkles className="mr-1 h-3 w-3" />{r.confidence}% confidence
                  </Badge>
                  {state === "accepted" ? (
                    <Badge className="bg-success/20 text-foreground">
                      <CheckCircle2 className="mr-1 h-3 w-3" />Accepted
                    </Badge>
                  ) : state === "rejected" ? (
                    <Badge variant="outline">Dismissed</Badge>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setAccepted((s) => ({ ...s, [r.areaKey]: "rejected" }))}>
                        Dismiss
                      </Button>
                      <Button size="sm" onClick={() => setAccepted((s) => ({ ...s, [r.areaKey]: "accepted" }))}>
                        Accept sequence
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sequence rail */}
                <div className="flex flex-wrap items-stretch gap-2">
                  {r.steps.map((s, i) => (
                    <div key={`${s.kind}-${s.id}`} className="flex items-stretch gap-2">
                      <div className="min-w-[220px] max-w-[280px] rounded-md border bg-card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Step {i + 1}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {s.kind === "complaint" ? "Complaint" : "Planned work"}
                          </Badge>
                        </div>
                        <div className="mt-1 text-sm font-medium leading-tight">{s.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>{DEPT_LABEL[s.dept]}</span>
                          <span>·</span>
                          <span>{categoryLabel(s.category)}</span>
                          {s.priority && (
                            <>
                              <span>·</span>
                              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", PRIORITY_COLORS[s.priority])}>
                                {s.priority}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{s.hours}h</span>
                          <span className="inline-flex items-center gap-1"><IndianRupee className="h-3 w-3" />{s.cost.toLocaleString("en-IN")}</span>
                        </div>
                        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{s.reason}</p>
                      </div>
                      {i < r.steps.length - 1 && (
                        <div className="flex items-center">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Impact */}
                <div className="grid gap-3 md:grid-cols-3">
                  <ImpactStat
                    icon={<IndianRupee className="h-4 w-4" />}
                    label="Cost avoided"
                    value={r.costSaved > 0 ? `₹${r.costSaved.toLocaleString("en-IN")}` : "—"}
                    hint="Prevented redoing surface work"
                  />
                  <ImpactStat
                    icon={<Clock className="h-4 w-4" />}
                    label="Time saved"
                    value={`${r.timeSavedHours}h`}
                    hint={`${r.naiveHours}h → ${r.optimizedHours}h`}
                  />
                  <ImpactStat
                    icon={<Layers className="h-4 w-4" />}
                    label="Rework avoided"
                    value={String(r.reworkAvoided.length)}
                    hint={r.reworkAvoided[0] ?? "No redundant work"}
                  />
                </div>

                {r.reworkAvoided.length > 0 && (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs font-medium text-foreground">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                      Why this order
                    </div>
                    <ul className="ml-4 list-disc space-y-0.5 text-xs text-muted-foreground">
                      {r.reworkAvoided.map((x) => <li key={x}>{x}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}{label}
        </div>
        <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function ImpactStat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-0.5 text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

// silence unused
void CATEGORIES;
