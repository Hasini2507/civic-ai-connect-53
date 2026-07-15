import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Clock, Building2, Eye, EyeOff, Sparkles, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { categoryLabel, statusLabel, STATUS_FLOW, VISIBILITY_LABELS } from "@/lib/civic";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { useRealtime } from "@/hooks/use-realtime";

export const Route = createFileRoute("/_authenticated/complaints/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Complaint · CivicFlow" }] }),
  component: ComplaintDetail,
});

function ComplaintDetail() {
  const { id } = Route.useParams();
  const { roles } = Route.useRouteContext();
  const isStaff = roles.some((r: string) => r !== "citizen");

  const { data, isLoading } = useQuery({
    queryKey: ["complaint", id],
    queryFn: async () => {
      const [{ data: c, error }, { data: media }] = await Promise.all([
        supabase.from("complaints").select("*").eq("id", id).maybeSingle(),
        supabase.from("complaint_media").select("*").eq("complaint_id", id),
      ]);
      if (error) throw error;
      let department = null;
      let reporter = null;
      if (c?.department_id) {
        const { data: d } = await supabase.from("departments").select("name").eq("id", c.department_id).maybeSingle();
        department = d?.name ?? null;
      }
      if (c?.reporter_id) {
        const { data: r } = await supabase.from("profiles").select("full_name").eq("id", c.reporter_id).maybeSingle();
        const { data: contact } = await supabase.from("profile_contacts").select("phone").eq("id", c.reporter_id).maybeSingle();
        reporter = { full_name: r?.full_name ?? null, phone: contact?.phone ?? null };
      }
      return { c, media: media ?? [], department, reporter };
    },
  });

  useRealtime(
    `complaint-${id}`,
    [{ table: "complaints", filter: `id=eq.${id}` }],
    [["complaint", id]],
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data?.c) return <p>Not found.</p>;
  const c = data.c as any;

  const slaRemaining = c.sla_due_at ? Math.round((new Date(c.sla_due_at).getTime() - Date.now()) / 3600000) : null;
  const currentIdx = STATUS_FLOW.indexOf(c.status as any);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/complaints" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          <PriorityBadge level={c.priority_level} />
          <span className="rounded-full border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">{categoryLabel(c.category)}</span>
          {c.visibility && (
            <span className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">
              {c.visibility === "public" ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {VISIBILITY_LABELS[c.visibility]}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{c.title}</h1>
        <p className="text-sm text-muted-foreground">Reported {new Date(c.created_at).toLocaleString()}</p>
      </header>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold">Status flow</h2>
        <ol className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {STATUS_FLOW.map((s, i) => {
            const reached = i <= currentIdx;
            return (
              <li key={s} className={`rounded-lg border p-3 text-center text-xs ${reached ? "border-accent/40 bg-accent/10 font-medium" : "text-muted-foreground"}`}>
                <span className={`mr-1 inline-block h-2 w-2 rounded-full ${reached ? "bg-accent" : "bg-muted-foreground/30"}`} />
                {statusLabel(s)}
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

          <div className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold">Activity Timeline</h2>
            <div className="mt-4">
              <ActivityTimeline complaintId={id} />
            </div>
          </div>

          {data.media.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="font-semibold">Evidence</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data.media.map((m: any) => (
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
            </ul>
          </div>

          {isStaff && data.reporter && (
            <div className="rounded-xl border bg-card p-6 text-sm">
              <h2 className="font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Reporter</h2>
              <p className="mt-2"><span className="text-muted-foreground">Name: </span>{data.reporter.full_name ?? "—"}</p>
              {data.reporter.phone && <p><span className="text-muted-foreground">Phone: </span>{data.reporter.phone}</p>}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
