import { z } from "zod";
import { esc, p, plantilla } from "./correo-reserva";
import { formatCOP } from "./formato";
import { descuento, distanciaKm, formatDistancia, textoVentana, type Punto } from "./ofertas";

// «Avísame cuando haya combos cerca»: reglas puras (sin Supabase ni SMTP) para poder probarlas.

export const RADIOS_INTERES = [1, 2, 5] as const;
export const ORIGENES_UBICACION = ["direccion", "navegador", "mapa"] as const;
/** Como máximo un correo por interesado en esta ventana. */
export const HORAS_ENTRE_AVISOS = 6;
const TOPE_POR_DEFECTO = 50;

export const esquemaInteresado = z.object({
  correo: z.string().trim().toLowerCase().max(254, "El correo es muy largo.").pipe(z.email("Escribe un correo válido.")),
  autoriza: z.literal("on", { error: "Debes autorizar el tratamiento de tus datos para recibir avisos." }),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  origen: z.enum(ORIGENES_UBICACION, { error: "Elige desde dónde te avisamos." }),
  radio: z.coerce
    .number()
    .refine((r): r is (typeof RADIOS_INTERES)[number] => (RADIOS_INTERES as readonly number[]).includes(r), "Elige 1, 2 o 5 km."),
});

/** Tope de correos por publicación (INTERESADOS_TOPE_POR_OFERTA), para no pasar el límite diario del proveedor. */
export function topePorOferta(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.INTERESADOS_TOPE_POR_OFERTA);
  return Number.isInteger(n) && n >= 0 ? n : TOPE_POR_DEFECTO;
}

export type InteresadoCandidato = {
  id: string;
  correo: string;
  lat: number;
  lng: number;
  radio_km: number;
  token_baja: string;
  ultimo_envio: string | null;
};

/** Límite de la ventana: quien recibió un aviso después de esta fecha no recibe otro. */
export function inicioVentana(ahora: number): string {
  return new Date(ahora - HORAS_ENTRE_AVISOS * 3_600_000).toISOString();
}

/** Interesados dentro de su radio, sin aviso en las últimas 6 horas, los más cercanos primero y hasta el tope. */
export function destinatarios<T extends InteresadoCandidato>(
  negocio: Punto,
  candidatos: T[],
  ahora: number,
  tope: number,
): Array<T & { km: number }> {
  const limite = ahora - HORAS_ENTRE_AVISOS * 3_600_000;
  return candidatos
    .filter((i) => !i.ultimo_envio || Date.parse(i.ultimo_envio) <= limite)
    .map((i) => ({ ...i, km: distanciaKm(negocio, { lat: i.lat, lng: i.lng }) }))
    .filter((i) => i.km <= i.radio_km)
    .sort((a, b) => a.km - b.km)
    .slice(0, Math.max(0, tope));
}

export type DatosCorreoInteresado = {
  ofertaId: string;
  titulo: string;
  negocio: string;
  precioFinal: number;
  precioHabitual: number;
  cupos: number;
  recogidaDesde: string;
  recogidaHasta: string;
  km: number;
  token: string;
  /** Origen del sitio, sin barra final. */
  sitio: string;
};

export function enlaceBaja(sitio: string, token: string): string {
  return `${sitio}/baja?t=${encodeURIComponent(token)}`;
}

export function correoInteresado(d: DatosCorreoInteresado): { asunto: string; texto: string; html: string; baja: string } {
  const url = `${d.sitio}/oferta/${d.ofertaId}?utm_source=salvori&utm_medium=correo&utm_campaign=interesados`;
  const baja = enlaceBaja(d.sitio, d.token);
  const ahorro = formatCOP(d.precioHabitual - d.precioFinal);
  const dist = formatDistancia(d.km);
  const precios = `${formatCOP(d.precioFinal)} (antes ${formatCOP(d.precioHabitual)}, −${descuento(d.precioFinal, d.precioHabitual)} %)`;
  return {
    asunto: `Combo cerca: ${d.titulo} en ${d.negocio} (a ${dist})`,
    baja,
    texto: [
      `Hay un combo a ${dist} de ti en Salvori.`,
      ``,
      `${d.titulo} · ${d.negocio}`,
      `${precios}. Ahorras ${ahorro}.`,
      `${textoVentana(d.recogidaDesde, d.recogidaHasta)}. Quedan ${d.cupos}.`,
      ``,
      `Resérvalo aquí: ${url}`,
      ``,
      `Recibes este correo porque pediste que te avisáramos de combos cerca. Para no recibir más: ${baja}`,
    ].join("\n"),
    html: plantilla(
      `Hay un combo a ${dist} de ti`,
      [
        p(`<strong>${esc(d.titulo)}</strong> · ${esc(d.negocio)}`),
        p(`${precios}. <strong>Ahorras ${ahorro}.</strong>`),
        p(`${textoVentana(d.recogidaDesde, d.recogidaHasta)}. Quedan ${d.cupos}.`),
      ].join("\n"),
      { texto: "Ver el combo", url },
      `<br>Recibes este correo porque pediste que te avisáramos de combos cerca. <a href="${esc(baja)}" style="color:#5b615b;">Dejar de recibir avisos</a>.`,
    ),
  };
}
