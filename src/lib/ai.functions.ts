import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AnalyzeInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  imageUrls: z.array(z.string().url()).max(4).optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

const CATEGORY_LIST = [
  "pothole",
  "road_damage",
  "drainage_blockage",
  "water_leakage",
  "garbage_overflow",
  "streetlight_failure",
  "open_manhole",
  "fallen_tree",
  "traffic_signal_damage",
  "public_infrastructure_damage",
  "other",
] as const;

const DEPARTMENT_BY_CATEGORY: Record<string, string> = {
  pothole: "road",
  road_damage: "road",
  drainage_blockage: "sewerage",
  water_leakage: "water",
  garbage_overflow: "sanitation",
  streetlight_failure: "electricity",
  open_manhole: "sewerage",
  fallen_tree: "municipal",
  traffic_signal_damage: "electricity",
  public_infrastructure_damage: "municipal",
  other: "municipal",
};

export const analyzeComplaint = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return fallback(data.title, data.description);
    }

    const userContent: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Analyze this civic complaint and respond ONLY with strict JSON.

Title: ${data.title}
Description: ${data.description}
${data.latitude && data.longitude ? `Location: ${data.latitude}, ${data.longitude}` : ""}

Choose category from: ${CATEGORY_LIST.join(", ")}.
Severity: one of "minor", "moderate", "severe", "critical".
priority_score: integer 0-100 based on public safety risk, urgency, hazard level.
priority_level: one of "low","medium","high","critical".
Return JSON keys exactly: category, severity, priority_score, priority_level, summary, recommended_department (one of road, water, electricity, sanitation, sewerage, municipal).`,
      },
    ];
    for (const url of data.imageUrls ?? []) {
      userContent.push({ type: "image_url", image_url: { url } });
    }

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are a civic-issue triage AI for a municipal complaint system. Be conservative; favor public-safety urgency. Always return valid JSON.",
            },
            { role: "user", content: userContent },
          ],
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[ai] gateway error", res.status, text);
        if (res.status === 429) {
          return { ...fallback(data.title, data.description), error: "rate_limited" };
        }
        if (res.status === 402) {
          return { ...fallback(data.title, data.description), error: "credits_exhausted" };
        }
        return { ...fallback(data.title, data.description), error: "ai_error" };
      }
      const json = await res.json();
      const raw = json?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

      const category = CATEGORY_LIST.includes(parsed.category) ? parsed.category : "other";
      const priority_score = clamp(Number(parsed.priority_score ?? 50), 0, 100);
      const priority_level = ["low", "medium", "high", "critical"].includes(parsed.priority_level)
        ? parsed.priority_level
        : levelFromScore(priority_score);
      const severity = parsed.severity ?? "moderate";
      const summary = parsed.summary ?? "";
      const recommended_department =
        parsed.recommended_department && typeof parsed.recommended_department === "string"
          ? parsed.recommended_department
          : DEPARTMENT_BY_CATEGORY[category];

      return {
        category,
        severity,
        priority_score,
        priority_level,
        summary,
        recommended_department,
      };
    } catch (err) {
      console.error("[ai] exception", err);
      return { ...fallback(data.title, data.description), error: "ai_exception" };
    }
  });

function clamp(n: number, lo: number, hi: number) {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}
function levelFromScore(s: number) {
  if (s >= 85) return "critical";
  if (s >= 65) return "high";
  if (s >= 35) return "medium";
  return "low";
}
function fallback(title: string, desc: string) {
  const text = `${title} ${desc}`.toLowerCase();
  const guess = CATEGORY_LIST.find((c) => text.includes(c.replace("_", " "))) ?? "other";
  return {
    category: guess,
    severity: "moderate",
    priority_score: 50,
    priority_level: "medium" as const,
    summary: "Heuristic classification (AI unavailable).",
    recommended_department: DEPARTMENT_BY_CATEGORY[guess],
  };
}
