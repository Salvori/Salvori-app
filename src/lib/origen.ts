// Origen de la visita («negocio:<slug>» cuando llega por la ficha pública del negocio).
// El proxy lo guarda en una cookie 7 días; la ficha de la oferta y la reserva lo leen.
export const COOKIE_ORIGEN = "salvori_origen";
export const DURACION_ORIGEN_S = 7 * 24 * 60 * 60;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Slug de /n/<slug> (o null si la ruta no es la ficha de un negocio). */
export function slugDeRuta(pathname: string): string | null {
  const m = /^\/n\/([^/]+)\/?$/.exec(pathname);
  if (!m) return null;
  const slug = decodeURIComponent(m[1]).toLowerCase();
  return SLUG.test(slug) && slug.length <= 60 ? slug : null;
}

/** Valor válido de la cookie o «directo». */
export function origenValido(valor: string | null | undefined): string {
  if (!valor) return "directo";
  const m = /^negocio:(.+)$/.exec(valor);
  return m && SLUG.test(m[1]) && m[1].length <= 60 ? valor : "directo";
}
