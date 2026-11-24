// Planes y mensualidad de los negocios: textos y cálculos compartidos por el panel,
// el admin y la portada. La regla de verdad (límite, vencimiento con gracia) vive en
// la base de datos: validar_plan_oferta() y estado_planes().
import { formatCOP } from "@/lib/formato";

export type EstadoSuscripcion = "prueba" | "activa" | "vencida" | "suspendida";

export type EstadoPlan = {
  negocio_id: string;
  negocio_nombre: string;
  negocio_slug: string;
  negocio_es_prueba: boolean;
  plan_id: string | null;
  plan_nombre: string | null;
  precio_mensual: number | null;
  max_ofertas_activas: number | null;
  estado: EstadoSuscripcion | null;
  vence_en: string | null;
  bloquea_en: string | null;
  ofertas_activas: number;
};

/** Días de gracia tras vence_en antes de bloquear publicaciones (igual que en la migración). */
export const DIAS_GRACIA = 3;
/** Aviso en el panel cuando falten estos días o menos. */
export const DIAS_AVISO = 3;
export const METODOS_MENSUALIDAD = ["efectivo", "nequi", "transferencia", "otro"] as const;
export const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  nequi: "Nequi",
  transferencia: "Transferencia",
  otro: "Otro",
};
export const ESTADO_LABEL: Record<EstadoSuscripcion, string> = {
  prueba: "Prueba gratis",
  activa: "Al día",
  vencida: "Vencida",
  suspendida: "Suspendida",
};

const DIA_MS = 24 * 60 * 60 * 1000;

/** Días que faltan hasta `fecha` (redondeado hacia arriba; 0 o negativo si ya pasó). */
export function diasHasta(fecha: string, ahora: number): number {
  return Math.ceil((new Date(fecha).getTime() - ahora) / DIA_MS);
}

const fechaCorta = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" });
/** «23 dic» en hora de Colombia. */
export function formatFecha(fecha: string): string {
  return fechaCorta.format(new Date(fecha)).replace(".", "");
}

export function textoOfertasActivas(activas: number, max: number | null): string {
  if (max === null) return `${activas} ${activas === 1 ? "oferta activa" : "ofertas activas"} · sin límite`;
  return `${activas} de ${max} ofertas activas`;
}

/**
 * Lo que el negocio ve en «Tu plan»: una línea de estado y, si toca, un aviso.
 * `puedePublicar` replica la regla de la base de datos solo para el texto.
 */
export function resumenPlan(p: Pick<EstadoPlan, "estado" | "vence_en" | "bloquea_en">, ahora: number) {
  if (!p.estado || !p.vence_en || !p.bloquea_en) {
    return { linea: "Sin plan asignado", aviso: "Escríbele al equipo Salvori para activar tu plan.", puedePublicar: false };
  }
  const dias = diasHasta(p.vence_en, ahora);
  if (p.estado === "suspendida") {
    return { linea: "Cuenta suspendida", aviso: "Escríbele al equipo Salvori para reactivarla.", puedePublicar: false };
  }
  if (p.estado === "vencida" || dias <= 0) {
    const bloqueada = new Date(p.bloquea_en).getTime() <= ahora;
    return bloqueada
      ? {
          linea: `Venció el ${formatFecha(p.vence_en)}`,
          aviso: "Ya no puedes publicar ofertas nuevas. Paga la mensualidad a Salvori para seguir.",
          puedePublicar: false,
        }
      : {
          linea: `Venció el ${formatFecha(p.vence_en)}`,
          aviso: `Puedes publicar hasta el ${formatFecha(p.bloquea_en)}. Paga la mensualidad a Salvori para no parar.`,
          puedePublicar: true,
        };
  }
  const linea =
    p.estado === "prueba"
      ? `Prueba gratis: ${dias === 1 ? "te queda 1 día" : `te quedan ${dias} días`}`
      : `Vigente hasta el ${formatFecha(p.vence_en)}`;
  const aviso =
    dias <= DIAS_AVISO
      ? p.estado === "prueba"
        ? `Tu prueba termina el ${formatFecha(p.vence_en)}. Para seguir publicando, paga la mensualidad a Salvori.`
        : `Tu plan vence el ${formatFecha(p.vence_en)}. Paga la mensualidad a Salvori para no dejar de publicar.`
      : null;
  return { linea, aviso, puedePublicar: true };
}

/** Si el error viene del límite del plan o del vencimiento, su mensaje (ya en español). */
export function mensajePlan(error: { message?: string; hint?: string } | null | undefined): string | null {
  if (error?.hint === "plan_salvori" && error.message) return error.message;
  return null;
}

/** Línea de precios de la portada. Sin datos, el texto acordado del lanzamiento. */
export const TEXTO_PLANES_FIJO = "15 días gratis. Después, desde $ 50.000 al mes.";
export function textoPlanes(planes: Array<{ precio_mensual: number; dias_prueba: number | null }>): string {
  const prueba = planes.map((p) => p.dias_prueba).filter((d): d is number => d !== null);
  const precios = planes.map((p) => p.precio_mensual).filter((v) => v > 0);
  if (!prueba.length || !precios.length) return TEXTO_PLANES_FIJO;
  return `${Math.max(...prueba)} días gratis. Después, desde ${formatCOP(Math.min(...precios))} al mes.`;
}
