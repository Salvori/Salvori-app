// Estados de la reserva en lenguaje claro para el comprador.
export type EstadoReserva =
  | "solicitada"
  | "confirmada"
  | "rechazada"
  | "cancelada"
  | "lista"
  | "entregada"
  | "no_recogida";

type Info = { titulo: string; tono: "espera" | "ok" | "listo" | "fin" | "mal" };

export const ESTADO_COMPRADOR: Record<EstadoReserva, Info> = {
  solicitada: { titulo: "Esperando confirmación del negocio", tono: "espera" },
  confirmada: { titulo: "Confirmada: ya puedes ir", tono: "ok" },
  lista: { titulo: "Lista para recoger", tono: "listo" },
  entregada: { titulo: "Entregada", tono: "fin" },
  rechazada: { titulo: "Rechazada", tono: "mal" },
  no_recogida: { titulo: "No recogida", tono: "mal" },
  cancelada: { titulo: "Cancelada", tono: "fin" },
};

export function textoEstado(estado: EstadoReserva, motivo?: string | null): string {
  const base = ESTADO_COMPRADOR[estado].titulo;
  return estado === "rechazada" && motivo ? `${base}: ${motivo}` : base;
}

/** El código solo se muestra desde «confirmada». */
export function muestraCodigo(estado: EstadoReserva): boolean {
  return estado === "confirmada" || estado === "lista";
}
