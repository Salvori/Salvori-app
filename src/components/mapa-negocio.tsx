"use client";

import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { pinLocal } from "./pines";

// Mapa de un solo local: pin en sus coordenadas y, al tocarlo, nombre y dirección.
export default function MapaNegocio({ lat, lng, nombre, direccion }: { lat: number; lng: number; nombre: string; direccion?: string | null }) {
  const icono = useMemo(() => pinLocal(), []);
  return (
    <MapContainer center={[lat, lng]} zoom={16} className="h-64 w-full overflow-hidden rounded-2xl" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={icono} title={nombre}>
        <Popup>
          <span className="font-display font-bold text-primary">{nombre}</span>
          {direccion ? <span className="block text-xs">{direccion}</span> : null}
        </Popup>
      </Marker>
    </MapContainer>
  );
}
