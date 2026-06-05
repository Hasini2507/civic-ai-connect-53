import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Clock, Building2, ShieldUser, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { categoryLabel, STATUS_LABELS } from "@/lib/civic";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/complaints/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Complaint · CivicFlow" }] }),
  component: ComplaintDetail,
});

function ComplaintDetail() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["complaint", id],
    queryFn: async () => {
      const [{ data: c, error }, { data: media }, { data: dept }] = await Promise.all([
        supabase.from("complaints").select("*").eq("id", id).maybeSingle(),
        supabase.from("complaint_media").select("*").eq("complaint_id", id),
        Promise.resolve({ data: null }),
      ]);
      if (error) throw error;
      let department = null;
      if (c?.department_id) {
        const { data: d } = await supabase.from("departments").select("name").eq("id", c.department_id).maybeSingle();
        department = d?.name ?? null;
      }
      return { c, media: media ?? [], department };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data?.c) return <p>Not found.</p>;
  const c = data.c;

  const slaRemaining = c.sla_due_at ? Math.round((new Date(c.sla_due_at).getTime() - Date.now()) / 3600000) : null;
  const steps = ["submitted", "assigned", "in_progress", "resolved", "verified", "closed"];
  const currentIdx = steps.indexOf(c.status);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/complaints" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to my reports
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          <PriorityBadge level={c.priority_level} />
          <span className="rounded-full border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">{categoryLabel(c.category)}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{c.title}</h1>
        <p className="text-sm text-muted-foreground">Reported {new Date(c.created_at).toLocaleString()} · {c.supporter_count} supporter{c.supporter_count !== 1 ? "s" : ""}</p>
      </header>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold">Timeline</h2>
        <ol className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
          {steps.map((s, i) => {
            const reached = i <= currentIdx;
            return (
              <li key={s} className={`rounded-lg border p-3 text-center text-xs ${reached ? "border-accent/40 bg-accent/10 font-medium" : "text-muted-foreground"}`}>
                <span className={`mr-1 inline-block h-2 w-2 rounded-full ${reached ? "bg-accent" : "bg-muted-foreground/30"}`} />
                {STATUS_LABELS[s]}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm">{c.description}</p>
          </div>
          {data.media.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="font-semibold">Evidence</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data.media.map((m) => (
                  <a key={m.id} href={m.public_url ?? "#"} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border">
                    {m.kind === "image" ? (
                      <img src={m.public_url ?? ""} alt="" className="aspect-square w-full object-cover" />
                    ) : m.kind === "video" ? (
                      <video src={m.public_url ?? ""} controls className="aspect-square w-full object-cover" />
                    ) : (
                      <audio src={m.public_url ?? ""} controls className="w-full" />
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
          {c.ai_analysis && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI assessment</h2>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-secondary/50 p-3 text-xs">{JSON.stringify(c.ai_analysis, null, 2)}</pre>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-6 text-sm">
            <h2 className="font-semibold">Details</h2>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2"><Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" /><span><span className="text-muted-foreground">Dept: </span>{data.department ?? "Pending assignment"}</span></li>
              {c.address && <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />{c.address}</li>}
              {c.latitude && c.longitude && (
                <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />{c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}</li>
              )}
              {c.sla_due_at && (
                <li className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span>SLA: {new Date(c.sla_due_at).toLocaleString()}
                    {slaRemaining !== null && (
                      <span className={`ml-1 font-medium ${slaRemaining < 0 ? "text-destructive" : "text-success"}`}>
                        ({slaRemaining < 0 ? `${Math.abs(slaRemaining)}h overdue` : `${slaRemaining}h left`})
                      </span>
                    )}
                  </span>
                </li>
              )}
              <li className="flex items-start gap-2"><ShieldUser className="mt-0.5 h-4 w-4 text-muted-foreground" />{c.is_anonymous ? "Anonymous report" : "Identity visible to officers"}</li>
            </ul>
          </div>
          <Link to="/map"><Button variant="outline" className="w-full">View on map</Button></Link>
        </aside>
      </div>
    </div>
  );
}
