import { cn } from "@/lib/utils";
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS } from "@/lib/civic";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[status] ?? "bg-secondary")}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PriorityBadge({ level }: { level: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide", PRIORITY_COLORS[level] ?? "bg-secondary")}>
      {level}
    </span>
  );
}
