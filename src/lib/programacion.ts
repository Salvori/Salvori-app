// Programación de ofertas: días ISO (1 = lunes … 7 = domingo) y hora local de Colombia.
export const DIAS_SEMANA = [
  { n: 1, corto: "lun", letra: "L", largo: "Lunes" },
  { n: 2, corto: "mar", letra: "M", largo: "Martes" },
  { n: 3, corto: "mié", letra: "X", largo: "Miércoles" },
  { n: 4, corto: "jue", letra: "J", largo: "Jueves" },
  { n: 5, corto: "vie", letra: "V", largo: "Viernes" },
  { n: 6, corto: "sáb", letra: "S", largo: "Sábado" },
  { n: 7, corto: "dom", letra: "D", largo: "Domingo" },
] as const;

export const HORA_24 = /^([01]\d|2[0-3]):[0-5]\d$/;

/** «lun, mié y vie», «todos los días». */
export function textoDias(dias: number[]): string {
  const orden = [...new Set(dias)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  if (orden.length === 7) return "todos los días";
  const nombres = orden.map((d) => DIAS_SEMANA[d - 1].corto);
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

const partesBogota = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Bogota",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Minutos desde la medianoche, en hora de Colombia. */
export function minutosBogota(fecha: Date | string | number): number {
  const [h, m] = partesBogota.format(new Date(fecha)).split(":").map(Number);
  return h * 60 + m;
}

export function minutosDeHora(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** «11:00:00» (Postgres) → «11:00». */
export function horaCorta(hora: string): string {
  return hora.slice(0, 5);
}

/**
 * La tarea programada copia la plantilla con su misma hora local de recogida.
 * Si la hora de publicación cae después del fin de esa ventana, nunca publicaría.
 */
export function horaDentroDeVentana(horaPublicacion: string, recogidaDesde: string, recogidaHasta: string): boolean {
  const duracion = Math.round((new Date(recogidaHasta).getTime() - new Date(recogidaDesde).getTime()) / 60000);
  return minutosDeHora(horaPublicacion) < minutosBogota(recogidaDesde) + duracion;
}
