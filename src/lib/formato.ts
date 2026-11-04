// Formatos de Colombia: COP sin decimales («$ 12.000») y horas en 24 h.
const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatCOP(valor: number): string {
  // Intl usa espacio duro entre «$» y la cifra; lo dejamos como espacio normal.
  return cop.format(valor).replace(/ /g, " ");
}

const hora = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Bogota",
});

export function formatHora(fecha: Date | string): string {
  return hora.format(typeof fecha === "string" ? new Date(fecha) : fecha);
}
