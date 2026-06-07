import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, Upload, Sparkles, X, Mic, Video as VideoIcon, Image as ImageIcon, Eye, EyeOff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { analyzeComplaint } from "@/lib/ai.functions";
import { CATEGORIES, type CategoryValue } from "@/lib/civic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/submit")({
  ssr: false,
  head: () => ({ meta: [{ title: "Report an issue · CivicFlow" }] }),
  component: SubmitPage,
});

type UploadedMedia = { kind: "image" | "video" | "audio"; path: string; url: string };

function SubmitPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeComplaint);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CategoryValue | "">("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiPreview, setAiPreview] = useState<any>(null);

  function fetchLocation() {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast.success("Location captured"); },
      () => toast.error("Could not get location. You can still submit without it."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function handleFiles(files: FileList | null, kind: "image" | "video" | "audio") {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} exceeds 20MB`); continue; }
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("complaint-media").upload(path, file, { upsert: false, contentType: file.type });
        if (error) { toast.error(error.message); continue; }
        const { data: signed } = await supabase.storage.from("complaint-media").createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signed?.signedUrl) setMedia((m) => [...m, { kind, path, url: signed.signedUrl }]);
      }
    } finally {
      setUploading(false);
    }
  }

  function removeMedia(path: string) {
    setMedia((m) => m.filter((x) => x.path !== path));
    supabase.storage.from("complaint-media").remove([path]).catch(() => {});
  }

  async function runAI() {
    if (!title || !description) return toast.error("Title and description required for AI preview");
    const imageUrls = media.filter((m) => m.kind === "image").map((m) => m.url);
    const res = await toast.promise(
      analyze({ data: { title, description, imageUrls, latitude: coords?.lat ?? null, longitude: coords?.lng ?? null } }),
      { loading: "Analyzing with AI…", success: "AI analysis ready", error: "AI failed" },
    );
    const unwrapped = await Promise.resolve(res as any);
    setAiPreview(unwrapped);
    if (unwrapped?.category && !category) setCategory(unwrapped.category);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return toast.error("Title and description are required");
    setSubmitting(true);

    let ai = aiPreview;
    if (!ai) {
      const imageUrls = media.filter((m) => m.kind === "image").map((m) => m.url);
      ai = await analyze({ data: { title, description, imageUrls, latitude: coords?.lat ?? null, longitude: coords?.lng ?? null } });
    }

    const finalCategory = (category || ai?.category || "other") as CategoryValue;
    const deptCode = ai?.recommended_department ?? CATEGORIES.find((c) => c.value === finalCategory)?.department ?? "municipal";
    const { data: dept } = await supabase.from("departments").select("id").eq("code", deptCode).maybeSingle();
    const { data: sla } = await supabase.from("sla_configurations").select("hours_to_resolve").eq("category", finalCategory).maybeSingle();
    const slaDue = sla ? new Date(Date.now() + sla.hours_to_resolve * 3600 * 1000).toISOString() : null;

    const { data: inserted, error } = await supabase
      .from("complaints")
      .insert({
        reporter_id: user.id,
        is_anonymous: false,
        title: title.trim(),
        description: description.trim(),
        category: finalCategory,
        visibility,
        severity: ai?.severity ?? null,
        priority_score: ai?.priority_score ?? 50,
        priority_level: ai?.priority_level ?? "medium",
        department_id: dept?.id ?? null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        address: address.trim() || null,
        ai_analysis: ai ?? null,
        sla_due_at: slaDue,
      } as any)
      .select("id")
      .single();

    if (error || !inserted) { setSubmitting(false); toast.error(error?.message ?? "Submission failed"); return; }

    if (media.length) {
      const rows = media.map((m) => ({
        complaint_id: inserted.id, kind: m.kind, storage_path: m.path, public_url: m.url,
      }));
      await supabase.from("complaint_media").insert(rows);
    }

    setSubmitting(false);
    toast.success("Complaint submitted");
    navigate({ to: "/complaints/$id", params: { id: inserted.id } });
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Report an issue</h1>
        <p className="text-sm text-muted-foreground">Describe what's wrong. Add a photo and location to help us resolve it faster.</p>
      </header>

      <section className="space-y-4 rounded-xl border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Large pothole on MG Road" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" maxLength={4000} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell us what happened, when, and any safety concerns…" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Category (AI will suggest)</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as CategoryValue)}>
              <SelectTrigger><SelectValue placeholder="Auto-detect from description" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as "public" | "private")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public"><Eye className="mr-2 inline h-3.5 w-3.5" /> Public — visible city-wide</SelectItem>
                <SelectItem value="private"><EyeOff className="mr-2 inline h-3.5 w-3.5" /> Private — only you and staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="addr">Address (optional)</Label>
          <Input id="addr" maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, landmark, neighborhood" />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Evidence</h2>
            <p className="text-xs text-muted-foreground">Photos help AI detect severity. Up to 20MB per file.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary">
              <ImageIcon className="h-3.5 w-3.5" /> Image
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files, "image")} />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary">
              <VideoIcon className="h-3.5 w-3.5" /> Video
              <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFiles(e.target.files, "video")} />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary">
              <Mic className="h-3.5 w-3.5" /> Voice
              <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFiles(e.target.files, "audio")} />
            </label>
            {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
        {media.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {media.map((m) => (
              <div key={m.path} className="group relative overflow-hidden rounded-lg border bg-secondary/30">
                {m.kind === "image" ? (
                  <img src={m.url} alt="" className="aspect-square w-full object-cover" />
                ) : m.kind === "video" ? (
                  <video src={m.url} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="grid aspect-square place-items-center text-muted-foreground"><Mic className="h-6 w-6" /></div>
                )}
                <button type="button" onClick={() => removeMedia(m.path)} className="absolute right-1 top-1 rounded-full bg-background/90 p-1 opacity-0 transition group-hover:opacity-100">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Location</h2>
            <p className="text-xs text-muted-foreground">{coords ? `Captured: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "Helps officers find the exact spot."}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={fetchLocation}><MapPin className="mr-1.5 h-4 w-4" /> Use my location</Button>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> AI preview</h2>
            <p className="text-xs text-muted-foreground">Get an instant category and priority assessment before you submit.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={runAI}>Analyze</Button>
        </div>
        {aiPreview && (
          <div className="grid gap-2 rounded-lg bg-secondary/40 p-4 text-sm">
            <div><span className="text-muted-foreground">Category:</span> <strong>{aiPreview.category}</strong></div>
            <div><span className="text-muted-foreground">Priority:</span> <strong className="uppercase">{aiPreview.priority_level}</strong> ({aiPreview.priority_score}/100)</div>
            <div><span className="text-muted-foreground">Department:</span> <strong>{aiPreview.recommended_department}</strong></div>
            {aiPreview.summary && <div className="text-muted-foreground italic">{aiPreview.summary}</div>}
          </div>
        )}
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>Cancel</Button>
        <Button type="submit" disabled={submitting || uploading}>
          {submitting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Submitting…</> : <><Upload className="mr-1.5 h-4 w-4" /> Submit report</>}
        </Button>
      </div>
    </form>
  );
}
