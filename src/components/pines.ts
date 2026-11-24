"use client";

import L from "leaflet";

// Pines dibujados con HTML (sin imágenes de Leaflet, que el empaquetador no copia).
// Negocio: gota Mandarina con borde Bosque. Comprador: círculo Bosque con anillo Crema.

export function pinNegocio(total: number): L.DivIcon {
  return L.divIcon({
    className: "pin-negocio",
    html: `<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#F57A35;border:3px solid #174C3C;box-shadow:0 4px 10px rgba(23,76,60,.35)"><span style="transform:rotate(45deg);font:800 13px/1 Manrope,Arial,sans-serif;color:#242824">${total}</span></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });
}

export const pinComprador: () => L.DivIcon = () =>
  L.divIcon({
    className: "pin-comprador",
    html: `<span style="display:block;width:22px;height:22px;border-radius:50%;background:#174C3C;border:4px solid #F8F5EA;box-shadow:0 0 0 3px #174C3C,0 4px 10px rgba(23,76,60,.4)"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

/** Pin del local en su ficha y en el panel: la misma gota, sin número. */
export const pinLocal: () => L.DivIcon = () =>
  L.divIcon({
    className: "pin-local",
    html: `<span style="display:block;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#F57A35;border:3px solid #174C3C;box-shadow:0 4px 10px rgba(23,76,60,.35)"></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });
