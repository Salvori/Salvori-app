"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import type { Punto } from "@/lib/ofertas";

function AlTocar({ onElegir }: { onElegir: (p: Punto) => void }) {
  useMapEvents({ click: (e) => onElegir({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

// Mapa de OpenStreetMap: tocar elige el punto desde donde buscar.
export default function SelectorMapa({ valor, onElegir }: { valor: Punto; onElegir: (p: Punto) => void }) {
  return (
    <MapContainer
      center={[valor.lat, valor.lng]}
      zoom={15}
      className="h-72 w-full overflow-hidden rounded-2xl"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker center={[valor.lat, valor.lng]} radius={10} pathOptions={{ color: "#174C3C", fillColor: "#F57A35", fillOpacity: 0.9 }} />
      <AlTocar onElegir={onElegir} />
    </MapContainer>
  );
}
