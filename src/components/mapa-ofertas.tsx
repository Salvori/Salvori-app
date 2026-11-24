"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { OfertaTarjeta } from "@/lib/catalogo";
import { etiquetaFormato } from "@/lib/esquema-oferta";
import { formatCOP } from "@/lib/formato";
import { textoDescuento, textoDisponibles, textoDistancia, type Punto } from "@/lib/ofertas";
import { LogoNegocio } from "./logo-negocio";
import { pinComprador, pinNegocio } from "./pines";

type OfertaCercana = OfertaTarjeta & { km: number };

const ZOOM: Record<number, number> = { 1: 15, 3: 14, 5: 13 };

function Encuadre({ punto, zoom }: { punto: Punto; zoom: number }) {
  const mapa = useMap();
  useEffect(() => {
    mapa.setView([punto.lat, punto.lng], zoom);
  }, [mapa, punto.lat, punto.lng, zoom]);
  return null;
}

function AlTocar({ onElegir }: { onElegir: (p: Punto) => void }) {
  useMapEvents({ click: (e) => onElegir({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

// Un pin por negocio con ofertas activas y otro, distinto, para el comprador.
export default function MapaOfertas({
  ofertas,
  punto,
  radio,
  onElegir,
}: {
  ofertas: OfertaCercana[];
  punto: Punto;
  radio: number;
  onElegir: (p: Punto) => void;
}) {
  const negocios = useMemo(() => {
    const grupos = new Map<string, { negocio: OfertaCercana["negocio"]; km: number; ofertas: OfertaCercana[] }>();
    for (const o of ofertas) {
      const g = grupos.get(o.negocio.id) ?? { negocio: o.negocio, km: o.km, ofertas: [] };
      g.ofertas.push(o);
      grupos.set(o.negocio.id, g);
    }
    return [...grupos.values()];
  }, [ofertas]);
  const iconoComprador = useMemo(() => pinComprador(), []);

  return (
    <MapContainer center={[punto.lat, punto.lng]} zoom={ZOOM[radio] ?? 14} className="h-[28rem] w-full overflow-hidden rounded-2xl" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[punto.lat, punto.lng]} icon={iconoComprador} title="Tú estás aquí" zIndexOffset={1000}>
        <Popup>Tú estás aquí</Popup>
      </Marker>
      {negocios.map((g) => (
        <Marker key={g.negocio.id} position={[g.negocio.lat, g.negocio.lng]} icon={pinNegocio(g.ofertas.length)} title={g.negocio.nombre}>
          <Popup minWidth={220}>
            <div className="font-sans">
              <div className="flex items-center gap-2">
                <LogoNegocio nombre={g.negocio.nombre} logo={g.negocio.logo_url} tamano="md" />
                <div>
                  <p className="font-display text-base font-extrabold text-primary">{g.negocio.nombre}</p>
                  <p className="text-xs text-muted-foreground">{textoDistancia(g.km)}</p>
                </div>
              </div>
              <ul className="mt-2 space-y-2">
                {g.ofertas.map((o) => (
                  <li key={o.id}>
                    <a href={`/oferta/${o.id}`} className="block rounded-lg bg-secondary px-2 py-1.5 !text-foreground no-underline">
                      <span className="block text-sm font-bold">{o.titulo}</span>
                      <span className="text-xs">
                        {etiquetaFormato(o.formato, o.lleva, o.paga)}
                        {o.tamano ? ` · ${o.tamano}` : ""} · {formatCOP(o.precio_final)} · {textoDescuento(o.precio_final, o.precio_habitual)} ·{" "}
                        {textoDisponibles(o.cupos_disponibles, o.formato).toLowerCase()}
                      </span>
                      <span className="mt-0.5 block text-xs font-bold text-primary">Ver oferta →</span>
                    </a>
                  </li>
                ))}
              </ul>
              <a href={`/n/${g.negocio.slug}`} className="mt-2 block text-xs font-bold !text-primary">
                Ver el negocio →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
      <AlTocar onElegir={onElegir} />
      <Encuadre punto={punto} zoom={ZOOM[radio] ?? 14} />
    </MapContainer>
  );
}
