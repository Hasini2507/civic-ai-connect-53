import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/civic";

export type RoleInfo = {
  loading: boolean;
  roles: AppRole[];
  departmentId: string | null;
  has: (r: AppRole) => boolean;
  isStaff: boolean;
  primary: AppRole;
};

export function useRole(userId: string | null | undefined): RoleInfo {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!userId) {
      setLoading(false);
      setRoles([]);
      return;
    }
    setLoading(true);
    (async () => {
      const [{ data: r }, { data: p }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("department_id").eq("id", userId).maybeSingle(),
      ]);
      if (!alive) return;
      setRoles((r ?? []).map((x) => x.role as AppRole));
      setDepartmentId(p?.department_id ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const has = (r: AppRole) => roles.includes(r);
  const isStaff = roles.some((r) => r !== "citizen");
  const primary: AppRole =
    (["admin", "officer"] as AppRole[]).find((r) => roles.includes(r)) ?? "citizen";

  return { loading, roles, departmentId, has, isStaff, primary };
}
