import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type MinComplaint = {
  id: string;
  title: string;
  status: string;
  priority_level: string;
  sla_due_at: string | null;
  reporter_id: string;
  assigned_officer_id: string | null;
  department_id: string | null;
};

const CLOSED = new Set(["resolved", "closed", "verified"]);
const THRESHOLDS = [
  { key: "breached", ms: 0, label: "SLA breached" },
  { key: "1h", ms: 60 * 60_000, label: "under 1 hour to SLA" },
  { key: "4h", ms: 4 * 60 * 60_000, label: "under 4 hours to SLA" },
  { key: "24h", ms: 24 * 60 * 60_000, label: "under 24 hours to SLA" },
] as const;

function bucketFor(dueAt: string | null): string | null {
  if (!dueAt) return null;
  const diff = new Date(dueAt).getTime() - Date.now();
  for (const t of THRESHOLDS) if (diff <= t.ms) return t.key;
  return null;
}

/**
 * Global SLA + priority-change watcher. Subscribes to complaints the current
 * user should see (their own as citizen, or dept/assigned as staff) and
 * surfaces toast notifications when priority changes or a new SLA threshold
 * is crossed. Also polls every 60s so purely time-based deadlines fire even
 * without a DB write.
 */
export function useSlaAlerts() {
  const { user, roles, departmentId } = useAuth();
  const seenBucket = useRef<Map<string, string>>(new Map());
  const seenPriority = useRef<Map<string, string>>(new Map());
  const seededRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    const isStaff = roles.includes("officer") || roles.includes("admin");
    const isOfficerOnly = roles.includes("officer") && !roles.includes("admin");

    let cancelled = false;

    async function fetchRelevant(): Promise<MinComplaint[]> {
      let q = supabase
        .from("complaints")
        .select("id,title,status,priority_level,sla_due_at,reporter_id,assigned_officer_id,department_id")
        .not("sla_due_at", "is", null)
        .limit(200);
      if (!isStaff) q = q.eq("reporter_id", user!.id);
      else if (isOfficerOnly && departmentId) q = q.eq("department_id", departmentId);
      const { data } = await q;
      return (data ?? []) as MinComplaint[];
    }

    function evaluate(rows: MinComplaint[], emit: boolean) {
      for (const c of rows) {
        if (CLOSED.has(c.status)) {
          seenBucket.current.delete(c.id);
          seenPriority.current.delete(c.id);
          continue;
        }
        // Priority change
        const prevP = seenPriority.current.get(c.id);
        if (prevP && prevP !== c.priority_level && emit) {
          const rising =
            ["low", "medium", "high", "critical"].indexOf(c.priority_level) >
            ["low", "medium", "high", "critical"].indexOf(prevP);
          const fn = rising ? toast.warning : toast.info;
          fn(`Priority ${rising ? "raised" : "changed"} → ${c.priority_level.toUpperCase()}`, {
            description: c.title,
          });
        }
        seenPriority.current.set(c.id, c.priority_level);

        // SLA bucket
        const bucket = bucketFor(c.sla_due_at);
        const prevB = seenBucket.current.get(c.id);
        if (bucket && bucket !== prevB && emit) {
          const t = THRESHOLDS.find((x) => x.key === bucket)!;
          const overdue = bucket === "breached";
          (overdue ? toast.error : toast.warning)(
            overdue ? `SLA breached — ${c.title}` : `${c.title} — ${t.label}`,
            {
              description: new Date(c.sla_due_at!).toLocaleString(),
            },
          );
        }
        if (bucket) seenBucket.current.set(c.id, bucket);
      }
    }

    (async () => {
      const rows = await fetchRelevant();
      if (cancelled) return;
      evaluate(rows, seededRef.current);
      seededRef.current = true;
    })();

    // Realtime — refresh on any UPDATE affecting the user's scope
    const channel = supabase
      .channel(`sla-alerts:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "complaints" },
        async () => {
          const rows = await fetchRelevant();
          if (!cancelled) evaluate(rows, true);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "complaints" },
        async () => {
          const rows = await fetchRelevant();
          if (!cancelled) evaluate(rows, true);
        },
      )
      .subscribe();

    // Time-based poll for deadline crossings
    const poll = window.setInterval(async () => {
      const rows = await fetchRelevant();
      if (!cancelled) evaluate(rows, true);
    }, 60_000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.clearInterval(poll);
    };
  }, [user, roles.join(","), departmentId]);
}
