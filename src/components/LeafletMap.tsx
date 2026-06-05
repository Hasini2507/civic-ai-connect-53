import { useEffect, useRef } from "react";
import L from "leaflet";

type Pin = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  status: string;
  priority: string;
};

// Workaround for bundler-broken default marker icons
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const colorFor = (p: string) =>
  p === "critical" ? "#dc2626" : p === "high" ? "#f97316" : p === "medium" ? "#f59e0b" : "#0ea5e9";

export function LeafletMap({
  pins,
  center,
  zoom = 12,
  height = 480,
  onPick,
}: {
  pins: Pin[];
  center?: [number, number];
  zoom?: number;
  height?: number | string;
  onPick?: (lat: number, lng: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const fallbackCenter: [number, number] =
      center ?? (pins[0] ? [pins[0].lat, pins[0].lng] : [20.5937, 78.9629]);
    const map = L.map(ref.current).setView(fallbackCenter, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    if (onPick) {
      map.on("click", (e: L.LeafletMouseEvent) => onPick(e.latlng.lat, e.latlng.lng));
    }

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    pins.forEach((p) => {
      const m = L.circleMarker([p.lat, p.lng], {
        radius: 9,
        color: colorFor(p.priority),
        fillColor: colorFor(p.priority),
        fillOpacity: 0.7,
        weight: 2,
      }).bindPopup(
        `<div style="font-family:inherit"><strong>${escapeHtml(p.title)}</strong><br/><small>${p.status} · ${p.priority}</small></div>`,
      );
      m.addTo(layer);
      L.marker([p.lat, p.lng], { icon: defaultIcon, opacity: 0 }).addTo(layer);
    });
    if (pins.length && mapRef.current) {
      const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
      mapRef.current.fitBounds(bounds.pad(0.2), { maxZoom: 15 });
    }
  }, [pins]);

  return <div ref={ref} style={{ height, width: "100%" }} className="overflow-hidden rounded-lg border" />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]!,
  );
}
