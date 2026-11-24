// Traduce los errores de las funciones de Supabase a mensajes amables.
type ErrorRpc = { message?: string; code?: string } | null | undefined;

const REGLAS: Array<[RegExp, string]> = [
  [/suficientes (cupos|unidades)/i, "Ya no quedan unidades suficientes. Prueba con menos unidades o elige otra oferta."],
  [/fuera del horario/i, "Esta oferta ya no está en horario de recogida."],
  [/no está activa|no está disponible/i, "Esta oferta ya no está disponible."],
  [/inicia sesión/i, "Entra con tu correo para continuar."],
  [/cantidad debe ser mayor/i, "Elige al menos una unidad."],
  [/máximo permitido/i, "Las observaciones son demasiado largas."],
  [/cambio de estado no está permitido/i, "Esta reserva ya cambió de estado. Actualiza la página."],
  [/horario de recogida ya terminó/i, "El horario de recogida ya terminó."],
  [/una reserva activa a la vez/i, "Por tu puntaje de cumplimiento solo puedes tener una reserva activa a la vez. Recoge o cancela la que tienes."],
  [/Indica por qué no pudiste cumplir/i, "Escribe por qué no pudiste cumplir."],
  [/Solo el comprador puede cancelar/i, "Solo puedes cancelar tus propias reservas."],
];

export function mensajeAmigable(error: ErrorRpc): string {
  const texto = error?.message ?? "";
  for (const [patron, mensaje] of REGLAS) if (patron.test(texto)) return mensaje;
  if (error?.code === "42501") return "No tienes permiso para hacer esto.";
  return "No pudimos completar la acción. Intenta de nuevo en unos segundos.";
}
