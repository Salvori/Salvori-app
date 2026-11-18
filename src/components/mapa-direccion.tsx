"use client";

import "leaflet/dist/leaflet.css";
import type { Marker as MarcadorLeaflet } from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { Punto } from "@/lib/ofertas";
import { pinComprador } from "./pines";

function Seguir({ punto }: { punto: Punto }) {
  const mapa = useMap();
  useEffect(() => {
    mapa.panTo([punto.lat, punto.lng]);
  }, [mapa, punto.lat, punto.lng]);
  return null;
}

function AlTocar({ onMover }: { onMover: (p: Punto) => void }) {
  useMapEvents({ click: (e) => onMover({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

// Pin del comprador que se arrastra (o se mueve tocando el mapa) cuando la dirección quedó mal ubicada.
export default function MapaDireccion({ punto, onMover }: { punto: Punto; onMover: (p: Punto) => void }) {
  const icono = useMemo(() => pinComprador(), []);
  return (
    <MapContainer center={[punto.lat, punto.lng]} zoom={16} className="h-72 w-full overflow-hidden rounded-2xl" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={[punto.lat, punto.lng]}
        icon={icono}
        draggable
        title="Tu dirección"
        eventHandlers={{
          dragend: (e) => {
            const p = (e.target as MarcadorLeaflet).getLatLng();
            onMover({ lat: p.lat, lng: p.lng });
          },
        }}
      />
      <AlTocar onMover={onMover} />
      <Seguir punto={punto} />
    </MapContainer>
  );
}
