export const CATEGORIES = [
  { value: "pothole", label: "Pothole", department: "road" },
  { value: "road_damage", label: "Road Damage", department: "road" },
  { value: "drainage_blockage", label: "Drainage Issue", department: "sewerage" },
  { value: "garbage_overflow", label: "Garbage Issue", department: "sanitation" },
  { value: "water_leakage", label: "Water Leakage", department: "water" },
  { value: "streetlight_failure", label: "Streetlight Issue", department: "electricity" },
  { value: "public_infrastructure_damage", label: "Public Property Damage", department: "municipal" },
  { value: "traffic_signal_damage", label: "Traffic Signal Issue", department: "electricity" },
  { value: "open_manhole", label: "Open Manhole", department: "sewerage" },
  { value: "fallen_tree", label: "Fallen Tree", department: "municipal" },
  { value: "other", label: "Other Civic Issues", department: "municipal" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

/** Canonical lifecycle (display order). Older values kept for back-compat. */
export const STATUS_FLOW = [
  "submitted",
  "under_review",
  "assigned",
  "in_progress",
  "waiting_for_verification",
  "resolved",
  "closed",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  assigned: "Assigned",
  in_progress: "In Progress",
  waiting_for_verification: "Waiting for Verification",
  resolved: "Resolved",
  verified: "Verified",
  closed: "Closed",
  rejected: "Rejected",
};

export const VISIBILITY_LABELS: Record<string, string> = {
  public: "Public",
  private: "Private",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-warning-foreground border border-warning/40",
  high: "bg-destructive/15 text-destructive border border-destructive/30",
  critical: "bg-destructive text-destructive-foreground",
};

export const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-secondary text-secondary-foreground",
  under_review: "bg-accent/20 text-accent-foreground border border-accent/40",
  assigned: "bg-accent/30 text-accent-foreground border border-accent/40",
  in_progress: "bg-warning/20 text-foreground border border-warning/40",
  waiting_for_verification: "bg-warning/30 text-foreground border border-warning/40",
  resolved: "bg-success/20 text-foreground border border-success/40",
  verified: "bg-success/30 text-foreground border border-success/40",
  closed: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/15 text-destructive border border-destructive/30",
};

export function categoryLabel(v: string) {
  return CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

export function statusLabel(v: string) {
  return STATUS_LABELS[v] ?? v;
}

export const ROLE_LABELS: Record<string, string> = {
  citizen: "Citizen",
  officer: "Department Officer",
  supervisor: "Supervisor",
  engineer: "Engineer",
  commissioner: "Commissioner",
  admin: "Admin",
};

export const ROLE_OPTIONS = [
  "citizen",
  "officer",
  "supervisor",
  "engineer",
  "commissioner",
  "admin",
] as const;

export type AppRole = (typeof ROLE_OPTIONS)[number];

/** Officer-allowed transitions (used in officer UI). */
export const OFFICER_NEXT_STATUS: Record<string, string[]> = {
  submitted: ["under_review", "assigned"],
  under_review: ["assigned"],
  assigned: ["in_progress"],
  in_progress: ["waiting_for_verification", "resolved"],
  waiting_for_verification: ["resolved"],
  resolved: ["closed"],
  closed: [],
};
