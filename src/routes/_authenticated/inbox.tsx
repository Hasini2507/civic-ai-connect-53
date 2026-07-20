import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Check, Inbox as InboxIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRealtime } from "@/hooks/use-realtime";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inbox")({
  component: InboxPage,
});

type Notif = {
  id: string;
  title: string;
  body: string | null;
  complaint_id: string | null;
  created_at: string;
  read_at: string | null;
};

function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function kindOf(n: Notif): "priority" | "sla" | "status" | "assignment" | "other" {
  const t = (n.title + " " + (n.body ?? "")).toLowerCase();
  if (t.includes("priority")) return "priority";
  if (t.includes("sla") || t.includes("deadline")) return "sla";
  if (t.includes("status")) return "status";
  if (t.includes("assign")) return "assignment";
  return "other";
}

const KIND_STYLES: Record<string, string> = {
  priority: "bg-warning/20 text-foreground",
  sla: "bg-destructive/15 text-destructive",
  status: "bg-primary/15 text-primary",
  assignment: "bg-secondary text-foreground",
  other: "bg-muted text-muted-foreground",
};

function InboxPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: notifs } = useQuery({
    queryKey: ["inbox", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,title,body,complaint_id,created_at,read_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Notif[];
    },
  });

  useRealtime(
    "inbox-live",
    [{ table: "notifications", filter: `user_id=eq.${user.id}` }],
    [["inbox"]],
  );

  const unread = useMemo(() => (notifs ?? []).filter((n) => !n.read_at), [notifs]);

  async function markRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["inbox"] });
  }

  async function markAllRead() {
    if (unread.length === 0) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread.map((n) => n.id));
    if (error) return toast.error(error.message);
    toast.success(`Marked ${unread.length} as read`);
    qc.invalidateQueries({ queryKey: ["inbox"] });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Notification Inbox</h1>
          <p className="text-muted-foreground">
            SLA deadlines, priority changes, and status updates for your complaints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            {unread.length} unread · {notifs?.length ?? 0} total
          </span>
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unread.length === 0}>
            <CheckCheck className="mr-1 h-4 w-4" /> Mark all read
          </Button>
        </div>
      </header>

      {(!notifs || notifs.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <InboxIcon className="h-8 w-8" />
            <p className="text-sm">You have no notifications yet.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {(notifs ?? []).map((n) => {
          const kind = kindOf(n);
          const isUnread = !n.read_at;
          const body = (
            <CardContent className="flex items-start gap-3 p-4">
              <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", KIND_STYLES[kind])}>
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={cn("leading-tight", isUnread ? "font-semibold" : "font-medium text-muted-foreground")}>
                    {n.title}
                  </p>
                  <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {kind}
                  </span>
                  {isUnread && <span className="h-2 w-2 rounded-full bg-primary" aria-label="unread" />}
                </div>
                {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {relTime(n.created_at)} · {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {isUnread && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    markRead(n.id);
                  }}
                >
                  <Check className="mr-1 h-4 w-4" /> Read
                </Button>
              )}
            </CardContent>
          );
          return (
            <Card
              key={n.id}
              className={cn("transition-colors hover:bg-muted/40", isUnread && "border-primary/40 bg-primary/5")}
            >
              {n.complaint_id ? (
                <Link
                  to="/complaints/$id"
                  params={{ id: n.complaint_id }}
                  className="block"
                  onClick={() => isUnread && markRead(n.id)}
                >
                  {body}
                </Link>
              ) : (
                body
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
