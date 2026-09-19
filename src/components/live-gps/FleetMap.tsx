"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Driver, Delivery } from "@/types/models";

// Leaflet + OpenStreetMap tiles — no paid Google Maps API key required.
// Custom divIcon markers avoid Leaflet's default marker images, which
// otherwise need extra webpack asset config to resolve correctly in Next.js.
function makeIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:16px;height:16px;border-radius:9999px;background:${color};
      border:3px solid white;box-shadow:0 2px 6px rgba(15,23,42,0.35);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const depotIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;background:#0f172a;transform:rotate(45deg);border:2px solid white;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function FleetMap({
  depot,
  drivers,
  deliveries,
  selectedDriverId,
  height = 360,
}: {
  depot: { lat: number; lng: number };
  drivers: Driver[];
  deliveries: Delivery[];
  selectedDriverId?: string;
  height?: number;
}) {
  const driverIcon = makeIcon("#3b82f6");
  const selectedIcon = makeIcon("#2563eb");

  return (
    <div style={{ height }} className="overflow-hidden rounded-card border border-outline-variant">
      <MapContainer center={[depot.lat, depot.lng]} zoom={12} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[depot.lat, depot.lng]} icon={depotIcon}>
          <Popup>Depot / Hub</Popup>
        </Marker>
        <Circle center={[depot.lat, depot.lng]} radius={400} pathOptions={{ color: "#0f172a", opacity: 0.15 }} />

        {drivers
          .filter((d) => d.lastKnownPosition)
          .map((d) => (
            <Marker
              key={d.id}
              position={[d.lastKnownPosition!.lat, d.lastKnownPosition!.lng]}
              icon={d.id === selectedDriverId ? selectedIcon : driverIcon}
            >
              <Popup>
                {d.name} · {Math.round(d.lastKnownPosition!.speedKph ?? 0)} km/h
              </Popup>
            </Marker>
          ))}

        {deliveries
          .filter((d) => d.lat != null && d.lng != null && d.status !== "delivered")
          .map((d) => (
            <Marker key={d.id} position={[d.lat!, d.lng!]} icon={makeIcon(d.status === "exception" || d.status === "delayed" ? "#ef4444" : "#f59e0b")}>
              <Popup>
                #{d.trackingCode} · {d.recipientName}
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
