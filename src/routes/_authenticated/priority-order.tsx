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
  AlertTriangle, Flame, Clock, Users, MapPin, Layers, Siren,
  ShieldAlert, ArrowUpRight, Sparkles, RefreshCw,
} from "lucide-react";
import { PRIORITY_COLORS, categoryLabel } from "@/lib/civic";
import { useRealtime } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/priority-order")({
  beforeLoad: ({ context }) => {
    const roles = (context as { roles: string[] }).roles ?? [];
    if (!roles.includes("officer") && !roles.includes("admin")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: PriorityOrderPage,
});

type Dept = "water" | "sewerage" | "electricity" | "road" | "sanitation" | "municipal";

const CATEGORY_META: Record<string, { dept: Dept; tier: number; safety: number; scope: number }> = {
  // safety = intrinsic public-safety weight (0-100). scope = citizens-affected weight (0-100).
  open_manhole:                  { dept: "sewerage",    tier: 1, safety: 95, scope: 70 },
  water_leakage:                 { dept: "water",       tier: 1, safety: 70, scope: 85 },
  drainage_blockage:             { dept: "sewerage",    tier: 1, safety: 60, scope: 75 },
  traffic_signal_damage:         { dept: "electricity", tier: 2, safety: 90, scope: 80 },
  streetlight_failure:           { dept: "electricity", tier: 2, safety: 55, scope: 60 },
  road_damage:                   { dept: "road",        tier: 3, safety: 65, scope: 70 },
  pothole:                       { dept: "road",        tier: 3, safety: 55, scope: 55 },
  fallen_tree:                   { dept: "municipal",   tier: 4, safety: 80, scope: 50 },
  public_infrastructure_damage:  { dept: "municipal",   tier: 4, safety: 50, scope: 45 },
  garbage_overflow:              { dept: "sanitation",  tier: 4, safety: 40, scope: 60 },
  other:                         { dept: "municipal",   tier: 5, safety: 30, scope: 30 },
};

const DEPT_LABEL: Record<Dept, string> = {
  water: "Water Board",
  sewerage: "Drainage & Sewerage",
  electricity: "Electricity",
  road: "Roads & Highways",
  sanitation: "Sanitation",
  municipal: "Municipal Works",
};

type Complaint = {
  id: string;
  title: string;
  category: string;
  status: string;
  priority_level: string | null;
  priority_score: number | null;
  supporter_count: number | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  created_at: string;
  sla_due_at: string | null;
  
};

function areaKey(c: Pick<Complaint, "latitude" | "longitude" | "address">) {
  if (c.latitude != null && c.longitude != null)
    return `${c.latitude.toFixed(2)}:${c.longitude.toFixed(2)}`;
  return (c.address ?? "unknown").trim().toLowerCase().slice(0, 40) || "unknown";
}

type Scored = {
  c: Complaint;
  score: number;
  level: "critical" | "high" | "medium" | "low";
  factors: { label: string; value: number; icon: any }[];
  clusterSize: number;
  tier: number;
  impact: string;
  dept: Dept;
  execOrder: number;
  execReason: string;
};

function bucket(score: number): Scored["level"] {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function computePriority(complaints: Complaint[]): Scored[] {
  const open = complaints.filter(
    (c) => !["resolved", "closed", "verified"].includes(c.status),
  );
  // area clustering — more complaints on the same block => higher exposure
  const clusters = new Map<string, Complaint[]>();
  for (const c of open) {
    const k = areaKey(c);
    const arr = clusters.get(k) ?? [];
    arr.push(c);
    clusters.set(k, arr);
  }

  const now = Date.now();
  const scored: Scored[] = open.map((c) => {
    const meta = CATEGORY_META[c.category] ?? CATEGORY_META.other;
    const clusterSize = clusters.get(areaKey(c))?.length ?? 1;

    // ---- factor scoring (each 0..100, weighted sum) ----
    const severityScore = meta.safety;                                       // intrinsic hazard
    const ageHours = (now - new Date(c.created_at).getTime()) / 3600000;
    const ageScore = Math.min(100, ageHours * 2);                            // ~50h → 100
    const slaScore = c.sla_due_at
      ? (() => {
          const remaining = (new Date(c.sla_due_at).getTime() - now) / 3600000;
          if (remaining < 0) return 100;                                     // breached
          if (remaining < 6) return 85;
          if (remaining < 24) return 65;
          return 30;
        })()
      : 40;
    const supporters = c.supporter_count ?? 0;
    const scopeScore = Math.min(100, meta.scope * 0.6 + Math.min(supporters * 4, 40)); // citizens affected
    const clusterScore = Math.min(100, (clusterSize - 1) * 25);              // co-located issues
    const emergencyScore = (c.priority_level === "critical") ? 100 : 0;
    const infraScore = meta.tier <= 2 ? 80 : meta.tier === 3 ? 55 : 30;      // infrastructure dependency

    const weights = {
      severity: 0.22,
      emergency: 0.18,
      sla: 0.15,
      scope: 0.15,
      infra: 0.12,
      age: 0.10,
      cluster: 0.08,
    };
    let score =
      severityScore * weights.severity +
      emergencyScore * weights.emergency +
      slaScore * weights.sla +
      scopeScore * weights.scope +
      infraScore * weights.infra +
      ageScore * weights.age +
      clusterScore * weights.cluster;
    score = Math.round(Math.min(100, Math.max(0, score)));

    const factors = [
      { label: `Safety risk ${Math.round(severityScore)}`, value: severityScore, icon: ShieldAlert },
      { label: (c.priority_level === "critical") ? "Emergency flagged" : "Non-emergency", value: emergencyScore, icon: Siren },
      { label: slaScore >= 85 ? "SLA breach imminent" : "SLA on track", value: slaScore, icon: Clock },
      { label: `${supporters} citizens affected`, value: scopeScore, icon: Users },
      { label: meta.tier <= 2 ? "Blocks other works" : "Surface / above-ground", value: infraScore, icon: Layers },
      { label: `${Math.round(ageHours)}h since report`, value: ageScore, icon: Clock },
      { label: clusterSize > 1 ? `${clusterSize} issues at same site` : "Standalone site", value: clusterScore, icon: MapPin },
    ];

    const impactParts: string[] = [];
    if ((c.priority_level === "critical")) impactParts.push("emergency response required");
    if (scopeScore >= 60) impactParts.push(`affects ~${Math.max(50, supporters * 20)} residents`);
    if (meta.tier <= 2) impactParts.push("blocks downstream surface works");
    if (slaScore >= 85) impactParts.push("SLA at risk");
    if (clusterSize > 1) impactParts.push(`${clusterSize - 1} co-located issue(s)`);
    const impact = impactParts.length ? impactParts.join(" · ") : "Localized impact";

    return {
      c,
      score,
      level: bucket(score),
      factors,
      clusterSize,
      tier: meta.tier,
      impact,
      dept: meta.dept,
      execOrder: 0,
      execReason: "",
    };
  });

  // ---- execution-order reorder inside each area cluster ----
  const byArea = new Map<string, Scored[]>();
  for (const s of scored) {
    const k = areaKey(s.c);
    const arr = byArea.get(k) ?? [];
    arr.push(s);
    byArea.set(k, arr);
  }
  // rank areas by max score
  const areasSorted = [...byArea.entries()].sort(
    (a, b) => Math.max(...b[1].map((x) => x.score)) - Math.max(...a[1].map((x) => x.score)),
  );

  let order = 1;
  for (const [, items] of areasSorted) {
    items.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;           // dig-first
      return b.score - a.score;
    });
    items.forEach((s, i) => {
      s.execOrder = order++;
      const prev = i > 0 ? items[i - 1] : null;
      if (items.length === 1) s.execReason = "Standalone site — run by priority score.";
      else if (i === 0)
        s.execReason =
          s.tier <= 2
            ? "Underground/sub-surface first — prevents re-excavation of later road work."
            : "Highest-scored job in this cluster.";
      else if (prev && prev.tier < s.tier)
        s.execReason = `After ${categoryLabel(prev.c.category)} — running this first would force re-digging.`;
      else s.execReason = "Same crew window at this location.";
    });
  }
  return scored.sort((a, b) => b.score - a.score);
}

const LEVEL_ICON: Record<Scored["level"], any> = {
  critical: Flame, high: AlertTriangle, medium: Clock, low: Layers,
};
const LEVEL_LABEL: Record<Scored["level"], string> = {
  critical: "Critical", high: "High", medium: "Medium", low: "Low",
};

function PriorityOrderPage() {
  const { departmentId, roles } = AuthRoute.useRouteContext();
  const isAdmin = roles.includes("admin");
  const [filter, setFilter] = useState<"all" | Scored["level"]>("all");

  const q = useQuery({
    queryKey: ["priority-order", isAdmin ? "all" : departmentId ?? "none"],
    queryFn: async () => {
      let query = supabase
        .from("complaints")
        .select("id,title,category,status,priority_level,priority_score,supporter_count,latitude,longitude,address,created_at,sla_due_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!isAdmin && departmentId) query = query.eq("department_id", departmentId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Complaint[];
    },
  });

  useRealtime(
    "priority-order",
    [{ table: "complaints" }],
    [["priority-order", isAdmin ? "all" : departmentId ?? "none"]],
  );

  const scored = useMemo(() => computePriority(q.data ?? []), [q.data]);
  const filtered = filter === "all" ? scored : scored.filter((s) => s.level === filter);
  const executionOrder = [...scored].sort((a, b) => a.execOrder - b.execOrder);

  const counts = {
    critical: scored.filter((s) => s.level === "critical").length,
    high: scored.filter((s) => s.level === "high").length,
    medium: scored.filter((s) => s.level === "medium").length,
    low: scored.filter((s) => s.level === "low").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="h-6 w-6 text-primary" /> AI Priority Order Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Live prioritization across all open reports — weighted by safety, SLA, scope, infrastructure dependency, age and co-location.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw className={cn("mr-2 h-4 w-4", q.isFetching && "animate-spin")} />
          Recalculate
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["critical", "high", "medium", "low"] as const).map((lvl) => {
          const Icon = LEVEL_ICON[lvl];
          const active = filter === lvl;
          return (
            <button
              key={lvl}
              onClick={() => setFilter(active ? "all" : lvl)}
              className={cn(
                "rounded-lg border bg-card p-4 text-left transition hover:border-primary/60",
                active && "border-primary ring-2 ring-primary/30",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{LEVEL_LABEL[lvl]}</span>
                <Icon className={cn("h-4 w-4", PRIORITY_COLORS[lvl])} />
              </div>
              <div className="mt-2 text-3xl font-semibold">{counts[lvl]}</div>
              <div className="text-xs text-muted-foreground">open reports</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Dynamic Priority List {filter !== "all" && `— ${LEVEL_LABEL[filter as Scored["level"]]}`}</CardTitle>
            <Badge variant="secondary">{filtered.length} items</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!q.isLoading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground">No matching reports.</p>
            )}
            {filtered.map((s, idx) => {
              const Icon = LEVEL_ICON[s.level];
              return (
                <div key={s.c.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-md bg-secondary text-sm font-semibold">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", PRIORITY_COLORS[s.level])}>
                            <Icon className="h-3 w-3" /> {LEVEL_LABEL[s.level]}
                          </span>
                          <Badge variant="outline">{categoryLabel(s.c.category)}</Badge>
                          <Badge variant="outline">{DEPT_LABEL[s.dept]}</Badge>
                          {s.(c.priority_level === "critical") && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                              <Siren className="h-3 w-3" /> Emergency
                            </span>
                          )}
                        </div>
                        <div className="mt-1 font-medium">{s.c.title}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {s.c.address ?? "Unspecified"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold">{s.score}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">score</div>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-foreground">Why this rank</div>
                      <ul className="space-y-1">
                        {s.factors.filter((f) => f.value >= 40).slice(0, 4).map((f) => {
                          const FIcon = f.icon;
                          return (
                            <li key={f.label} className="flex items-center gap-1.5">
                              <FIcon className="h-3 w-3" /> {f.label}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-foreground">Estimated impact</div>
                      <p>{s.impact}</p>
                      <p className="mt-2 flex items-center gap-1 text-foreground">
                        <ArrowUpRight className="h-3 w-3" /> Execution step #{s.execOrder} — {s.execReason}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommended Execution Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Reordered per-area so underground/utility work runs before surface work — prevents duplicate excavation and re-mobilisation.
            </p>
            {executionOrder.slice(0, 12).map((s) => {
              const Icon = LEVEL_ICON[s.level];
              return (
                <div key={s.c.id} className="flex items-start gap-3 rounded-md border p-2.5 text-sm">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded bg-primary/10 text-xs font-semibold text-primary">
                    {s.execOrder}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn("h-3.5 w-3.5", PRIORITY_COLORS[s.level])} />
                      <span className="truncate font-medium">{s.c.title}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{DEPT_LABEL[s.dept]} · Tier {s.tier}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{s.execReason}</div>
                  </div>
                </div>
              );
            })}
            {executionOrder.length === 0 && (
              <p className="text-sm text-muted-foreground">No open items to sequence.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
