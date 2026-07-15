import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { statusLabel } from "@/lib/civic";
import { useRealtime } from "@/hooks/use-realtime";

export function ActivityTimeline({ complaintId }: { complaintId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["activities", complaintId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaint_activities")
        .select("*")
        .eq("complaint_id", complaintId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  useRealtime(
    `activities-${complaintId}`,
    [
      { table: "complaint_activities", filter: `complaint_id=eq.${complaintId}` },
      { table: "complaints", filter: `id=eq.${complaintId}` },
    ],
    [["activities", complaintId], ["complaint", complaintId]],
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading timeline…</p>;
  if (!data?.length) return <p className="text-sm text-muted-foreground">No activity yet.</p>;

  return (
    <ol className="relative space-y-4 border-l pl-6">
      {data.map((a, i) => {
        const last = i === data.length - 1;
        return (
          <li key={a.id} className="relative">
            <span className="absolute -left-[27px] top-1 grid h-4 w-4 place-items-center rounded-full bg-background">
              {last ? <CheckCircle2 className="h-4 w-4 text-accent" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
            </span>
            <div className="text-sm font-medium capitalize">
              {a.action.replace(/_/g, " ")}
              {a.from_status && a.to_status && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  {statusLabel(a.from_status)} <ArrowRight className="h-3 w-3" /> {statusLabel(a.to_status)}
                </span>
              )}
              {!a.from_status && a.to_status && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">→ {statusLabel(a.to_status)}</span>
              )}
            </div>
            {a.note && <p className="text-xs text-muted-foreground">{a.note}</p>}
            <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
          </li>
        );
      })}
    </ol>
  );
}
