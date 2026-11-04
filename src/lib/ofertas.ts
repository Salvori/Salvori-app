import { formatHora } from "./formato";

export type Punto = { lat: number; lng: number };

/** Parque Caldas, centro de Popayán: punto por defecto sin ubicación. */
export const CENTRO_POPAYAN: Punto = { lat: 2.4419, lng: -76.6063 };

export const RADIOS_KM = [1, 3, 5] as const;
export type RadioKm = (typeof RADIOS_KM)[number];

export const CATEGORIA_LABEL: Record<string, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  panaderia_pasteleria: "Panadería y pastelería",
  cafe: "Café",
  comida_rapida: "Comida rápida",
  saludable: "Saludable",
  postres: "Postres",
  bebidas: "Bebidas",
  otro: "Otro",
};

/** Distancia en km con la fórmula de Haversine. */
export function distanciaKm(a: Punto, b: Punto): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistancia(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

/** Porcentaje de descuento redondeado («-33%»). */
export function descuento(final: number, habitual: number): number {
  return Math.round((1 - final / habitual) * 100);
}

export function textoVentana(desde: string, hasta: string): string {
  return `Recoge de ${formatHora(desde)} a ${formatHora(hasta)}`;
}

/** URL pública de una foto del bucket «ofertas» (o la URL tal cual si ya es absoluta). */
export function urlFoto(ruta: string | null | undefined): string | null {
  if (!ruta) return null;
  if (/^https?:\/\//.test(ruta)) return ruta;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/ofertas/${ruta.split("/").map(encodeURIComponent).join("/")}`;
}

/** Ordena por distancia y, a igual distancia, por la ventana que cierra antes. */
export function ordenarCercanas<T extends { km: number; recogida_hasta: string }>(ofertas: T[]): T[] {
  return [...ofertas].sort(
    (a, b) => a.km - b.km || new Date(a.recogida_hasta).getTime() - new Date(b.recogida_hasta).getTime(),
  );
}
