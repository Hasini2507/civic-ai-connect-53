import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, lazy, Suspense } from "react";
import { Search, MapPin, Calendar, ThumbsUp, ArrowRight, Shield, AlertTriangle, Brain } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { getPublicIssues, toggleSupport } from "@/lib/feed.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PublicMap = lazy(() => import("@/components/PublicMap").then((m) => ({ default: m.PublicMap })));

export const Route = createFileRoute("/feed")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Public Issues — CivicFlow" },
      { name: "description", content: "View and track civic issues reported by the community." },
      { property: "og:title", content: "CivicFlow Public Issues" },
      { property: "og:description", content: "Browse civic issues reported across the city, see status and severity in real time." },
    ],
  }),
  component: FeedPage,
});

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "escalated", label: "Escalated" },
  { key: "critical", label: "Critical" },
];

function FeedPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const fetchIssues = useServerFn(getPublicIssues);
  const support = useServerFn(toggleSupport);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["public-feed", status, search],
    queryFn: () => fetchIssues({ data: { status, search: search || undefined } }),
  });

  const issues = data?.issues ?? [];
  const mapIssues = useMemo(
    () =>
      issues.map((i: any) => ({
        id: i.id,
        title: i.title,
        address: i.address,
        latitude: i.latitude,
        longitude: i.longitude,
        priority_level: i.priority_level,
        status: i.status,
        created_at: i.created_at,
        imageUrl: i.complaint_media?.[0]?.public_url ?? null,
      })),
    [issues],
  );

  const supportMut = useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.info("Sign in to support this issue");
        navigate({ to: "/auth" });
        throw new Error("Not authenticated");
      }
      return support({ data: { complaintId: id } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["public-feed"] }),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Shield className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">CivicFlow</span>
          </Link>
          <div className="flex gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth"><Button size="sm">Report Issue</Button></Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Public Issues</h1>
          <p className="mt-2 text-muted-foreground">
            View and track civic issues reported by the community.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by location or address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={status === f.key ? "default" : "outline"}
                onClick={() => setStatus(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        <Card className="mb-8 overflow-hidden">
          <CardContent className="p-0">
            <Suspense fallback={<Skeleton className="h-[420px] w-full" />}>
              <ClientOnly fallback={<Skeleton className="h-[420px] w-full" />}>
                <PublicMap
                  issues={mapIssues}
                  onSelect={(id) => navigate({ to: "/complaints/$id", params: { id } })}
                />
              </ClientOnly>
            </Suspense>
            <div className="flex flex-wrap items-center gap-4 border-t bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
              <LegendDot color="#dc2626" label="Critical" />
              <LegendDot color="#f97316" label="High" />
              <LegendDot color="#eab308" label="Medium" />
              <LegendDot color="#16a34a" label="Resolved" />
            </div>
          </CardContent>
        </Card>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isLoading ? "Loading…" : `${issues.length} ${issues.length === 1 ? "issue" : "issues"}`}
          </h2>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : issues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No issues match your filters.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {issues.map((i: any) => (
              <IssueCard
                key={i.id}
                issue={i}
                onSupport={() => supportMut.mutate(i.id)}
                supporting={supportMut.isPending && supportMut.variables === i.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

function IssueCard({
  issue,
  onSupport,
  supporting,
}: {
  issue: any;
  onSupport: () => void;
  supporting: boolean;
}) {
  const photo = issue.complaint_media?.find((m: any) => m.kind === "image")?.public_url ?? null;
  const summary: string | undefined = issue.ai_analysis?.summary;
  const risk: string | undefined = issue.ai_analysis?.risk_level ?? issue.priority_level;
  const score = issue.priority_score ?? 0;

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/10] w-full bg-muted">
        {photo ? (
          <img src={photo} alt={issue.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 opacity-40" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          <PriorityBadge level={issue.priority_level} />
          <StatusBadge status={issue.status} />
        </div>
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 font-semibold leading-tight">{issue.title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {issue.address ?? "Unknown"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(issue.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/30 p-2 text-center text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">AI Score</div>
            <div className="text-sm font-semibold">{score}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Risk</div>
            <div className="text-sm font-semibold capitalize">{risk}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Priority</div>
            <div className="text-sm font-semibold capitalize">{issue.priority_level}</div>
          </div>
        </div>

        {summary && (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-2 text-xs">
            <div className="mb-1 inline-flex items-center gap-1 font-medium text-primary">
              <Brain className="h-3 w-3" /> AI Summary
            </div>
            <p className="line-clamp-3 text-foreground/80">{summary}</p>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onSupport} disabled={supporting}>
            <ThumbsUp className="h-3.5 w-3.5" />
            Support · {issue.supporter_count ?? 0}
          </Button>
          <Link to="/complaints/$id" params={{ id: issue.id }}>
            <Button size="sm" variant="ghost">
              Details <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
