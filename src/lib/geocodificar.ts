import "server-only";
import { CENTRO_POPAYAN, distanciaKm, type Punto } from "@/lib/ofertas";

// Geocodificación con Nominatim (OpenStreetMap): gratis y sin clave, con su política de uso:
// máximo 1 petición por segundo, User-Agent que identifique la app y resultados en caché.
// https://operations.osmfoundation.org/policies/nominatim/
const URL_NOMINATIM = "https://nominatim.openstreetmap.org/search";
// Popayán y alrededores (oeste, norte, este, sur).
const CAJA_POPAYAN = "-76.68,2.52,-76.53,2.38";
/** Radio aceptado para una dirección guardada a mano (pin movido en el mapa). */
export const RADIO_POPAYAN_KM = 25;

export type ResultadoGeocodificacion = { punto: Punto; etiqueta: string } | { error: "sin-resultado" | "no-disponible" };

function agenteUsuario(): string {
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://salvori.vercel.app";
  return `Salvori/0.1 (ofertas de comida en Popayan; ${sitio})`;
}

// Una petición a la vez y al menos 1,1 s entre ellas (por instancia del servidor).
let cola: Promise<void> = Promise.resolve();
let ultima = 0;
function esperarTurno(): Promise<void> {
  const turno = cola.then(async () => {
    const espera = ultima + 1100 - Date.now();
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    ultima = Date.now();
  });
  cola = turno.catch(() => {});
  return turno;
}

const cache = new Map<string, ResultadoGeocodificacion>();

export function dentroDePopayan(p: Punto): boolean {
  return distanciaKm(p, CENTRO_POPAYAN) <= RADIO_POPAYAN_KM;
}

/** Dirección escrita por el comprador → punto en Popayán. Nunca lanza. */
export async function geocodificar(direccion: string): Promise<ResultadoGeocodificacion> {
  const texto = direccion.trim().replace(/\s+/g, " ");
  if (process.env.SALVORI_GEOCODIFICADOR === "desactivado") return { error: "no-disponible" };
  const clave = texto.toLowerCase();
  const guardado = cache.get(clave);
  if (guardado) return guardado;

  const parametros = new URLSearchParams({
    q: `${texto}, Popayán, Cauca, Colombia`,
    format: "jsonv2",
    limit: "1",
    countrycodes: "co",
    viewbox: CAJA_POPAYAN,
    bounded: "1",
    "accept-language": "es",
  });

  try {
    await esperarTurno();
    const respuesta = await fetch(`${URL_NOMINATIM}?${parametros}`, {
      headers: { "User-Agent": agenteUsuario(), Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!respuesta.ok) return { error: "no-disponible" };
    const lista = (await respuesta.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    const primero = lista[0];
    const resultado: ResultadoGeocodificacion = primero
      ? { punto: { lat: Number(primero.lat), lng: Number(primero.lon) }, etiqueta: primero.display_name }
      : { error: "sin-resultado" };
    if ("punto" in resultado && !dentroDePopayan(resultado.punto)) return { error: "sin-resultado" };
    if (cache.size > 300) cache.delete(cache.keys().next().value!);
    cache.set(clave, resultado);
    return resultado;
  } catch {
    return { error: "no-disponible" };
  }
}
