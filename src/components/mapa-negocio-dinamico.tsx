"use client";

import dynamic from "next/dynamic";

// Leaflet usa window: el mapa del local solo se carga en el navegador.
export const MapaNegocioDinamico = dynamic(() => import("./mapa-negocio"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-2xl bg-muted" />,
});
