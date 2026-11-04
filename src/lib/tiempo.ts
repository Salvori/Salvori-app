// Hora de la petición para componentes de servidor (se renderizan una vez por petición).
export function instanteActual(): number {
  return Date.now();
}

/** Fecha AAAA-MM-DD en hora de Colombia. */
export function fechaBogota(fecha: Date | string | number = instanteActual()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(fecha));
}
