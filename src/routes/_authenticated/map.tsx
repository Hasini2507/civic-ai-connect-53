import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LeafletMap } from "@/components/LeafletMap";
import { CATEGORIES } from "@/lib/civic";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/map")({
  ssr: false,
  head: () => ({ meta: [{ title: "Live map · CivicFlow" }] }),
  component: MapPage,
});

function MapPage() {
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("open");

  const { data } = useQuery({
    queryKey: ["map-complaints", category, status],
    queryFn: async () => {
      let q = supabase.from("complaints")
        .select("id,title,latitude,longitude,priority_level,status,category")
        .not("latitude", "is", null).not("longitude", "is", null)
        .limit(500);
      if (category !== "all") q = q.eq("category", category as any);
      if (status === "open") q = q.in("status", ["submitted", "assigned", "in_progress"]);
      else if (status === "resolved") q = q.in("status", ["resolved", "verified", "closed"]);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const pins = useMemo(
    () => (data ?? []).map((c) => ({ id: c.id, lat: c.latitude!, lng: c.longitude!, title: c.title, status: c.status, priority: c.priority_level })),
    [data],
  );

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Live map</h1>
        <p className="text-sm text-muted-foreground">All civic reports in your area.</p>
      </header>
      <div className="flex flex-wrap gap-3 rounded-xl border bg-card p-4">
        <div className="min-w-44">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-44">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <Dot color="#dc2626" /> Critical
          <Dot color="#f97316" /> High
          <Dot color="#f59e0b" /> Medium
          <Dot color="#0ea5e9" /> Low
        </div>
      </div>
      <LeafletMap pins={pins} height={600} />
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: color }} />&nbsp;</span>;
}
