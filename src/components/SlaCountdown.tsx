import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(ms: number) {
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s.toString().padStart(2, "0")}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

/**
 * Live-ticking SLA countdown. Re-renders every second when < 1h remains,
 * every minute otherwise. Colour ramps up as the deadline approaches.
 */
export function SlaCountdown({
  dueAt,
  resolved,
  className,
  compact,
}: {
  dueAt: string | null | undefined;
  resolved?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const due = dueAt ? new Date(dueAt).getTime() : null;
  const diff = due !== null ? due - now : null;

  useEffect(() => {
    if (!due || resolved) return;
    const remaining = due - Date.now();
    const interval = Math.abs(remaining) < 3_600_000 ? 1000 : 60_000;
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [due, resolved]);

  if (!due) return null;
  const overdue = diff! < 0;
  const soon = !overdue && diff! < 4 * 3_600_000;
  const warn = !overdue && !soon && diff! < 24 * 3_600_000;

  const tone = resolved
    ? "text-muted-foreground"
    : overdue
      ? "text-destructive"
      : soon
        ? "text-destructive"
        : warn
          ? "text-warning-foreground"
          : "text-success";

  const Icon = overdue || soon ? AlertTriangle : Clock;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular-nums",
        tone,
        !compact && (overdue || soon) && !resolved && "animate-pulse",
        className,
      )}
      title={new Date(due).toLocaleString()}
    >
      <Icon className="h-3.5 w-3.5" />
      {resolved
        ? "SLA closed"
        : overdue
          ? `${fmt(diff!)} overdue`
          : `${fmt(diff!)} left`}
    </span>
  );
}
