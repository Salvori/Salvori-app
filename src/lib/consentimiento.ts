// Consentimiento de cookies de medición (GA4 y píxel de Meta), Ley 1581 de 2012.
// Por defecto no se carga nada: solo con «aceptado» se activan. La elección vive en
// localStorage del navegador (con try/catch: modo privado o almacenamiento bloqueado).

export type Consentimiento = "aceptado" | "esencial";

export const CLAVE_CONSENTIMIENTO = "salvori-consentimiento";
/** Evento de ventana cuando cambia la elección (para el banner y los scripts). */
export const EVENTO_CONSENTIMIENTO = "salvori:consentimiento";
/** Evento de ventana para volver a mostrar el banner (enlace «Preferencias de cookies»). */
export const EVENTO_PREFERENCIAS = "salvori:preferencias-cookies";

/** IDs públicos de medición. Se leen en cada llamada (Next los fija en el build). */
export function idsMedicion(): { ga: string | null; pixel: string | null } {
  const ga = (process.env.NEXT_PUBLIC_GA_ID ?? "").trim();
  const pixel = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim();
  return {
    ga: /^G-[A-Z0-9]+$/i.test(ga) ? ga : null,
    pixel: /^\d{5,20}$/.test(pixel) ? pixel : null,
  };
}

/** ¿Hay al menos un ID? Sin IDs no se muestra banner ni enlace de preferencias. */
export function medicionConfigurada(): boolean {
  const { ga, pixel } = idsMedicion();
  return Boolean(ga || pixel);
}

export function leerConsentimiento(): Consentimiento | null {
  try {
    const v = window.localStorage.getItem(CLAVE_CONSENTIMIENTO);
    return v === "aceptado" || v === "esencial" ? v : null;
  } catch {
    return null;
  }
}

export function guardarConsentimiento(valor: Consentimiento): void {
  try {
    window.localStorage.setItem(CLAVE_CONSENTIMIENTO, valor);
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent<Consentimiento>(EVENTO_CONSENTIMIENTO, { detail: valor }));
  } catch {}
}

export function aceptoMedicion(): boolean {
  return leerConsentimiento() === "aceptado";
}

export function abrirPreferencias(): void {
  try {
    window.dispatchEvent(new Event(EVENTO_PREFERENCIAS));
  } catch {}
}
