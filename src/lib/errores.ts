// Traduce los errores de las funciones de Supabase a mensajes amables.
type ErrorRpc = { message?: string; code?: string } | null | undefined;

const REGLAS: Array<[RegExp, string]> = [
  [/suficientes cupos/i, "Ya no quedan cupos suficientes. Prueba con menos unidades o elige otra oferta."],
  [/fuera del horario/i, "Esta oferta ya no está en horario de recogida."],
  [/no está activa|no está disponible/i, "Esta oferta ya no está disponible."],
  [/inicia sesión/i, "Entra con tu correo para continuar."],
  [/cantidad debe ser mayor/i, "Elige al menos una unidad."],
  [/máximo permitido/i, "Las observaciones son demasiado largas."],
  [/solo el comprador puede cancelar/i, "Solo puedes cancelar tus reservas mientras esperan confirmación."],
  [/cambio de estado no está permitido/i, "Esta reserva ya cambió de estado. Actualiza la página."],
  [/horario de recogida ya terminó/i, "El horario de recogida ya terminó."],
];

export function mensajeAmigable(error: ErrorRpc): string {
  const texto = error?.message ?? "";
  for (const [patron, mensaje] of REGLAS) if (patron.test(texto)) return mensaje;
  if (error?.code === "42501") return "No tienes permiso para hacer esto.";
  return "No pudimos completar la acción. Intenta de nuevo en unos segundos.";
}
