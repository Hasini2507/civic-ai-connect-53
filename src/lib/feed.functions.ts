import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FeedInput = z.object({
  search: z.string().max(200).optional(),
  status: z.string().max(50).optional(),
}).optional();

export const getPublicIssues = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => FeedInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("complaints")
      .select(
        "id,title,description,category,status,priority_level,priority_score,severity,latitude,longitude,address,supporter_count,ai_analysis,created_at,resolved_at,complaint_media(public_url,storage_path,kind)",
      )
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(200);

    if (data?.status && data.status !== "all") {
      if (data.status === "critical") q = q.eq("priority_level", "critical");
      else if (data.status === "escalated") q = q.gte("priority_score", 80);
      else if (data.status === "pending") q = q.in("status", ["submitted", "under_review"]);
      else if (data.status === "in_progress") q = q.in("status", ["assigned", "in_progress", "waiting_for_verification"]);
      else if (data.status === "resolved") q = q.in("status", ["resolved", "verified", "closed"]);
    }
    if (data?.search) {
      q = q.ilike("address", `%${data.search}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { issues: rows ?? [] };
  });

export const toggleSupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ complaintId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("complaint_supporters")
      .select("complaint_id")
      .eq("complaint_id", data.complaintId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("complaint_supporters")
        .delete()
        .eq("complaint_id", data.complaintId)
        .eq("user_id", userId);
      return { supported: false };
    }
    const { error } = await supabase
      .from("complaint_supporters")
      .insert({ complaint_id: data.complaintId, user_id: userId });
    if (error) throw new Error(error.message);
    return { supported: true };
  });
