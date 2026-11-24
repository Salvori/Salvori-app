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

/** Caminando a unos 4,5 km/h, en línea recta (la ruta real suele ser algo más larga). */
export function minutosAPie(km: number): number {
  return Math.max(1, Math.round((km / 4.5) * 60));
}

/** «650 m · 9 min a pie». */
export function textoDistancia(km: number): string {
  return `${formatDistancia(km)} · ${minutosAPie(km)} min a pie`;
}

/** Porcentaje de descuento redondeado («-33%»). */
export function descuento(final: number, habitual: number): number {
  return Math.round((1 - final / habitual) * 100);
}

/** Insignia de la tarjeta: «−33 %» (signo menos tipográfico y espacio duro antes de %). */
export function textoDescuento(final: number, habitual: number): string {
  return `−${descuento(final, habitual)} %`;
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
  // «?v=…» (versión del logo) se conserva tal cual para refrescar la caché.
  const [camino, version] = ruta.split("?");
  const url = `${base}/storage/v1/object/public/ofertas/${camino.split("/").map(encodeURIComponent).join("/")}`;
  return version ? `${url}?${version}` : url;
}

/** Ordena por distancia y, a igual distancia, por la ventana que cierra antes. */
export function ordenarCercanas<T extends { km: number; recogida_hasta: string }>(ofertas: T[]): T[] {
  return [...ofertas].sort(
    (a, b) => a.km - b.km || new Date(a.recogida_hasta).getTime() - new Date(b.recogida_hasta).getTime(),
  );
}

/** «3 unidades disponibles», «1 unidad disponible»; en «Lleva N, paga M», paquetes. */
export function textoDisponibles(n: number, formato?: string | null): string {
  if (n <= 0) return "Agotada";
  if (formato === "lleva_paga") return n === 1 ? "1 paquete disponible" : `${n} paquetes disponibles`;
  return n === 1 ? "1 unidad disponible" : `${n} unidades disponibles`;
}

/** Ruta del logo del negocio en el bucket «ofertas». */
export function rutaLogo(negocioId: string, version = Date.now()): string {
  return `negocios/${negocioId}/logo.webp?v=${version}`;
}

/** Inicial del negocio para el avatar sin logo. */
export function inicialNegocio(nombre: string): string {
  return (nombre.trim().match(/[\p{L}\p{N}]/u)?.[0] ?? "S").toLocaleUpperCase("es-CO");
}

/** Coordenadas sin ajustar: (0, 0) o el punto por defecto del centro de Popayán. */
export function faltanCoordenadas(p: { lat: number | null; lng: number | null }): boolean {
  if (p.lat == null || p.lng == null) return true;
  if (p.lat === 0 && p.lng === 0) return true;
  return Math.abs(p.lat - CENTRO_POPAYAN.lat) < 1e-6 && Math.abs(p.lng - CENTRO_POPAYAN.lng) < 1e-6;
}
