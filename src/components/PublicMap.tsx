import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapIssue = {
  id: string;
  title: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  priority_level: string;
  status: string;
  created_at: string;
  imageUrl?: string | null;
};

function colorFor(i: MapIssue) {
  if (["resolved", "verified", "closed"].includes(i.status)) return "#16a34a";
  if (i.priority_level === "critical") return "#dc2626";
  if (i.priority_level === "high") return "#f97316";
  return "#eab308";
}

export function PublicMap({ issues, onSelect }: { issues: MapIssue[]; onSelect?: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView([20.5937, 78.9629], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const pts: [number, number][] = [];
    for (const i of issues) {
      if (i.latitude == null || i.longitude == null) continue;
      const color = colorFor(i);
      const m = L.circleMarker([i.latitude, i.longitude], {
        radius: 9,
        color: "#fff",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      });
      const img = i.imageUrl
        ? `<img src="${i.imageUrl}" style="width:100%;height:96px;object-fit:cover;border-radius:6px;margin-bottom:6px"/>`
        : "";
      m.bindPopup(
        `<div style="min-width:200px;font-family:inherit">
          ${img}
          <div style="font-weight:600;margin-bottom:4px">${escapeHtml(i.title)}</div>
          <div style="font-size:12px;color:#555">${escapeHtml(i.address ?? "Unknown location")}</div>
          <div style="font-size:12px;margin-top:4px">Severity: <b>${i.priority_level}</b></div>
          <div style="font-size:12px">Status: ${escapeHtml(i.status)}</div>
          <div style="font-size:12px;color:#777">${new Date(i.created_at).toLocaleDateString()}</div>
          <button data-id="${i.id}" class="civic-view-btn" style="margin-top:6px;font-size:12px;color:#2563eb;cursor:pointer;background:none;border:none;padding:0">View details →</button>
        </div>`,
      );
      m.on("popupopen", (e) => {
        const el = (e.popup.getElement() as HTMLElement | null)?.querySelector(".civic-view-btn");
        el?.addEventListener("click", () => onSelect?.(i.id));
      });
      m.addTo(layer);
      pts.push([i.latitude, i.longitude]);
    }
    if (pts.length > 0) {
      const b = L.latLngBounds(pts);
      map.fitBounds(b.pad(0.2), { maxZoom: 13 });
    }
  }, [issues, onSelect]);

  return <div ref={containerRef} className="h-[420px] w-full rounded-lg border" />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
