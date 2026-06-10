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
  admin: "Admin",
};

export const ROLE_OPTIONS = ["citizen", "officer", "admin"] as const;

export type AppRole = (typeof ROLE_OPTIONS)[number];

/** Rule-based prediction of next recommended action for a complaint. */
export function predictNextAction(c: {
  status: string;
  sla_due_at?: string | null;
  created_at?: string;
  assigned_officer_id?: string | null;
  priority_level?: string;
}): { action: string; reason: string; urgency: "low" | "medium" | "high" } {
  const now = Date.now();
  const slaMs = c.sla_due_at ? new Date(c.sla_due_at).getTime() - now : null;
  const overdue = slaMs !== null && slaMs < 0;
  const ageHours = c.created_at ? (now - new Date(c.created_at).getTime()) / 3600000 : 0;
  const critical = c.priority_level === "critical" || c.priority_level === "high";

  if (["resolved", "closed", "verified"].includes(c.status))
    return { action: "Await citizen verification / close out", reason: "Work is complete.", urgency: "low" };

  if (c.status === "submitted") {
    if (critical || ageHours > 4)
      return { action: "Triage & assign officer now", reason: critical ? "High priority report." : "Awaiting review > 4h.", urgency: "high" };
    return { action: "Review intake within 4h", reason: "Standard SLA for new reports.", urgency: "medium" };
  }
  if (c.status === "under_review")
    return { action: "Assign to department officer", reason: "Reviewed but unassigned.", urgency: critical ? "high" : "medium" };
  if (c.status === "assigned" && !c.assigned_officer_id)
    return { action: "Confirm officer assignment", reason: "Status assigned but no officer set.", urgency: "high" };
  if (c.status === "assigned")
    return { action: "Begin field work", reason: "Officer assigned; move to in-progress.", urgency: overdue ? "high" : "medium" };
  if (c.status === "in_progress") {
    if (overdue) return { action: "Escalate — SLA breached", reason: "Work past SLA deadline.", urgency: "high" };
    return { action: "Complete repair & upload proof", reason: "Work in flight.", urgency: "medium" };
  }
  if (c.status === "waiting_for_verification")
    return { action: "Request citizen confirmation", reason: "Awaiting verification of repair.", urgency: "low" };
  return { action: "Review and act", reason: "Status needs attention.", urgency: "medium" };
}

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
