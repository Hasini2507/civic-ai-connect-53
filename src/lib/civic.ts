export const CATEGORIES = [
  { value: "pothole", label: "Pothole", department: "road" },
  { value: "road_damage", label: "Road Damage", department: "road" },
  { value: "drainage_blockage", label: "Drainage Blockage", department: "sewerage" },
  { value: "water_leakage", label: "Water Leakage", department: "water" },
  { value: "garbage_overflow", label: "Garbage Overflow", department: "sanitation" },
  { value: "streetlight_failure", label: "Streetlight Failure", department: "electricity" },
  { value: "open_manhole", label: "Open Manhole", department: "sewerage" },
  { value: "fallen_tree", label: "Fallen Tree", department: "municipal" },
  { value: "traffic_signal_damage", label: "Traffic Signal Damage", department: "electricity" },
  { value: "public_infrastructure_damage", label: "Public Infrastructure Damage", department: "municipal" },
  { value: "other", label: "Other", department: "municipal" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
  verified: "Verified",
  closed: "Closed",
  rejected: "Rejected",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-warning-foreground border border-warning/40",
  high: "bg-destructive/15 text-destructive border border-destructive/30",
  critical: "bg-destructive text-destructive-foreground",
};

export const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-secondary text-secondary-foreground",
  assigned: "bg-accent/30 text-accent-foreground border border-accent/40",
  in_progress: "bg-warning/20 text-foreground border border-warning/40",
  resolved: "bg-success/20 text-foreground border border-success/40",
  verified: "bg-success/30 text-foreground border border-success/40",
  closed: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/15 text-destructive border border-destructive/30",
};

export function categoryLabel(v: string) {
  return CATEGORIES.find((c) => c.value === v)?.label ?? v;
}
