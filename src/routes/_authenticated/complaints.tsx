import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { categoryLabel } from "@/lib/civic";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/complaints")({
  head: () => ({ meta: [{ title: "My Reports · CivicFlow" }] }),
  component: ComplaintsList,
});

function ComplaintsList() {
  const { user } = Route.useRouteContext();
  const { data, isLoading } = useQuery({
    queryKey: ["my-complaints-all", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints").select("*").eq("reporter_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">My reports</h1>
        <p className="text-sm text-muted-foreground">Every complaint you've submitted.</p>
      </header>
      <div className="rounded-xl border bg-card">
        {isLoading && <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-sm text-muted-foreground">
            <Inbox className="h-8 w-8" />
            No reports yet. <Link to="/submit" className="text-accent underline">Submit one</Link>.
          </div>
        )}
        <div className="divide-y">
          {(data ?? []).map((c) => (
            <Link key={c.id} to="/complaints/$id" params={{ id: c.id }} className="flex items-center gap-4 p-4 transition hover:bg-secondary/40">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {categoryLabel(c.category)} · {new Date(c.created_at).toLocaleString()} · {c.supporter_count} supporter{c.supporter_count !== 1 ? "s" : ""}
                </p>
              </div>
              <PriorityBadge level={c.priority_level} />
              <StatusBadge status={c.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
