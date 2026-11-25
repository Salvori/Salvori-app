// Eventos de medición hacia GA4 y el píxel de Meta. No hace nada si faltan los IDs,
// si el usuario no aceptó las cookies de medición o si se llama en el servidor.
// Solo viajan los campos de la lista blanca: nunca correo, teléfono ni nombre.
import { aceptoMedicion, idsMedicion } from "./consentimiento";

export type EventoMedicion =
  | "view_item"
  | "reserva_solicitada"
  | "reserva_confirmada"
  | "reserva_entregada"
  | "no_recogida"
  | "reserva_cancelada";

export type DatosEvento = {
  negocio_slug?: string | null;
  oferta_id?: string | null;
  origen?: string | null;
  categoria?: string | null;
  /** Título de la oferta (dato del negocio, no del comprador). */
  titulo?: string | null;
  cantidad?: number | null;
  /** Valor en COP sin decimales. */
  valor?: number | null;
};

type Parametros = Record<string, string | number>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const CORREO_O_TELEFONO = /@|\+?\d[\d\s-]{6,}\d/;

function texto(v: string | null | undefined, max = 100): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  // Defensa extra: un texto con forma de correo o teléfono no se envía.
  return t && !CORREO_O_TELEFONO.test(t) ? t : null;
}

/** Identificadores (slug, UUID): solo letras, números, guiones y «:». */
function identificador(v: string | null | undefined, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t && t.length <= max && /^[a-z0-9:_-]+$/i.test(t) ? t : null;
}

function numero(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
}

/** Parámetros limpios del evento (lista blanca). Exportado para pruebas. */
export function parametrosEvento(d: DatosEvento): Parametros {
  const p: Parametros = {};
  const slug = identificador(d.negocio_slug, 60);
  const oferta = identificador(d.oferta_id, 40);
  const origen = texto(d.origen);
  const categoria = texto(d.categoria, 40);
  const valor = numero(d.valor);
  const cantidad = numero(d.cantidad);
  if (slug) p.negocio_slug = slug;
  if (oferta) p.oferta_id = oferta;
  if (origen) p.origen = origen;
  if (categoria) p.categoria = categoria;
  if (cantidad !== null) p.cantidad = cantidad;
  if (valor !== null) {
    p.value = valor;
    p.currency = "COP";
  }
  return p;
}

/** Evento estándar del píxel de Meta que acompaña a cada evento propio. */
export const EVENTO_PIXEL: Partial<Record<EventoMedicion, string>> = {
  view_item: "ViewContent",
  reserva_solicitada: "Lead",
  reserva_entregada: "Purchase",
};

/** Envía el evento a GA4 y al píxel (si están cargados y hay consentimiento). Devuelve si se envió. */
export function medir(evento: EventoMedicion, datos: DatosEvento = {}): boolean {
  if (typeof window === "undefined" || !aceptoMedicion()) return false;
  const { ga, pixel } = idsMedicion();
  if (!ga && !pixel) return false;
  // Si los scripts aún no cargan (primer render), el evento espera en la cola.
  const listoGa = !ga || typeof window.gtag === "function";
  const listoPixel = !pixel || typeof window.fbq === "function";
  if (!listoGa || !listoPixel) {
    if (cola.length < 20) cola.push([evento, datos]);
    return true;
  }
  return enviar(evento, datos, ga, pixel);
}

const cola: Array<[EventoMedicion, DatosEvento]> = [];

/** Lo llama el componente de medición cuando GA y el píxel ya cargaron. */
export function vaciarCola(): void {
  const pendientes = cola.splice(0, cola.length);
  for (const [evento, datos] of pendientes) medir(evento, datos);
}

/** Solo para pruebas. */
export function _colaPendiente(): number {
  return cola.length;
}

function enviar(evento: EventoMedicion, datos: DatosEvento, ga: string | null, pixel: string | null): boolean {
  const p = parametrosEvento(datos);
  let enviado = false;

  if (ga && typeof window.gtag === "function") {
    const ga4: Record<string, unknown> = { ...p };
    if (evento === "view_item" && p.oferta_id) {
      const titulo = texto(datos.titulo);
      ga4.items = [
        {
          item_id: p.oferta_id,
          ...(titulo ? { item_name: titulo } : {}),
          ...(p.categoria ? { item_category: p.categoria } : {}),
          ...(p.negocio_slug ? { item_brand: p.negocio_slug } : {}),
          ...(p.value !== undefined ? { price: p.value } : {}),
        },
      ];
    }
    window.gtag("event", evento, ga4);
    enviado = true;
  }

  if (pixel && typeof window.fbq === "function") {
    const estandar = EVENTO_PIXEL[evento];
    if (estandar) {
      const fb: Record<string, unknown> = {};
      if (p.oferta_id) {
        fb.content_ids = [p.oferta_id];
        fb.content_type = "product";
      }
      if (p.categoria) fb.content_category = p.categoria;
      if (p.value !== undefined) {
        fb.value = p.value;
        fb.currency = "COP";
      }
      window.fbq("track", estandar, fb);
    }
    window.fbq("trackCustom", evento, p);
    enviado = true;
  }
  return enviado;
}

/**
 * Igual que `medir`, pero una sola vez por clave en la pestaña (sessionStorage):
 * evita duplicados al recargar o volver a una página.
 */
export function medirUnaVez(clave: string, evento: EventoMedicion, datos: DatosEvento = {}): boolean {
  if (typeof window === "undefined") return false;
  const k = `salvori-medido:${clave}`;
  try {
    if (window.sessionStorage.getItem(k)) return false;
  } catch {}
  const enviado = medir(evento, datos);
  if (enviado) {
    try {
      window.sessionStorage.setItem(k, "1");
    } catch {}
  }
  return enviado;
}
