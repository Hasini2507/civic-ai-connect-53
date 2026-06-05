import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, AlertTriangle, CheckCircle2, Clock, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { categoryLabel } from "@/lib/civic";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · CivicFlow" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();

  const { data: mine } = useQuery({
    queryKey: ["my-complaints", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("reporter_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const open = mine?.filter((c) => !["resolved", "verified", "closed"].includes(c.status)).length ?? 0;
  const resolved = mine?.filter((c) => ["resolved", "verified", "closed"].includes(c.status)).length ?? 0;
  const critical = mine?.filter((c) => c.priority_level === "critical").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Track your reports and report new civic issues in your area.</p>
        </div>
        <Link to="/submit"><Button><Plus className="mr-1.5 h-4 w-4" /> Report an issue</Button></Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Inbox} label="Total reports" value={mine?.length ?? 0} />
        <Stat icon={Clock} label="Open" value={open} tone="warning" />
        <Stat icon={AlertTriangle} label="Critical" value={critical} tone="destructive" />
        <Stat icon={CheckCircle2} label="Resolved" value={resolved} tone="success" />
      </div>

      <section className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Recent reports</h2>
          <Link to="/complaints" className="text-sm text-muted-foreground hover:text-foreground">View all →</Link>
        </div>
        <div className="divide-y">
          {(mine ?? []).length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              You haven't reported anything yet.{" "}
              <Link to="/submit" className="text-accent underline">Submit your first complaint</Link>.
            </div>
          )}
          {(mine ?? []).slice(0, 6).map((c) => (
            <Link
              key={c.id}
              to="/complaints/$id"
              params={{ id: c.id }}
              className="flex items-center gap-4 p-4 transition hover:bg-secondary/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{c.title}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {categoryLabel(c.category)} · {new Date(c.created_at).toLocaleDateString()}
                </div>
              </div>
              <PriorityBadge level={c.priority_level} />
              <StatusBadge status={c.status} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone?: "success" | "warning" | "destructive" }) {
  const tones: Record<string, string> = {
    success: "text-success",
    warning: "text-warning-foreground",
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
