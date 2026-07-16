import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Shield, LayoutDashboard, Plus, ListChecks, ClipboardList,
  Users, User as UserIcon, LogOut, Bell, Flame, CalendarClock, Workflow,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Route as AuthRoute } from "@/routes/_authenticated/route";
import type { AppRole } from "@/lib/civic";
import { ROLE_LABELS } from "@/lib/civic";

type NavLink = { to: string; label: string; icon: any; roles?: AppRole[] };

const ALL_LINKS: NavLink[] = [
  // Citizen
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["citizen"] },
  { to: "/submit", label: "Report", icon: Plus, roles: ["citizen"] },
  { to: "/complaints", label: "My Reports", icon: ListChecks, roles: ["citizen"] },
  { to: "/alerts", label: "Alerts", icon: Bell, roles: ["citizen"] },
  // Officer
  { to: "/officer", label: "Dashboard", icon: ClipboardList, roles: ["officer"] },
  { to: "/alerts", label: "Live Alerts", icon: Bell, roles: ["officer", "admin"] },
  { to: "/scheduling", label: "Scheduling", icon: CalendarClock, roles: ["officer", "admin"] },
  { to: "/sequencing", label: "Sequencing", icon: Workflow, roles: ["officer", "admin"] },
  { to: "/priority-order", label: "Priority Order", icon: Flame, roles: ["officer", "admin"] },
  { to: "/smart-escalation", label: "Smart Escalation", icon: Flame, roles: ["officer", "admin"] },
  // Admin
  { to: "/admin/users", label: "Officers", icon: Users, roles: ["admin"] },
];

function visibleFor(roles: AppRole[]): NavLink[] {
  return ALL_LINKS.filter((l) => !l.roles || l.roles.some((r) => roles.includes(r)));
}

export function AppHeader() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, roles, departmentId } = AuthRoute.useRouteContext();
  useSlaAlerts({ userId: user?.id, roles, departmentId });
  const links = visibleFor(roles);
  const primary =
    (["admin", "officer", "citizen"] as AppRole[]).find((r) => roles.includes(r)) ?? "citizen";


  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          <span className="text-base font-semibold tracking-tight">CivicFlow</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = path.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                  active && "bg-secondary text-foreground",
                )}
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden rounded-full border bg-card px-2.5 py-0.5 text-xs text-muted-foreground sm:inline">
            {ROLE_LABELS[primary]}
          </span>
          <Link to="/profile">
            <Button variant="ghost" size="icon" aria-label="Profile">
              <UserIcon className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto border-t px-2 py-1 md:hidden">
        {links.map((l) => {
          const active = path.startsWith(l.to);
          return (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground",
                active && "bg-secondary text-foreground",
              )}
            >
              <l.icon className="h-3.5 w-3.5" />
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
