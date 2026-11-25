"use client";

import { useActionState } from "react";
import { medir, type DatosEvento } from "@/lib/medicion";
import { cancelarReserva, type EstadoCancelar } from "./acciones";

/** `confirmada`: ya tenía código; cancelar ahora baja el puntaje de cumplimiento (vale 3). */
export function BotonCancelar({
  reservaId,
  confirmada = false,
  medicion,
}: {
  reservaId: string;
  confirmada?: boolean;
  /** Datos del evento «reserva_cancelada» (sin datos personales). */
  medicion?: DatosEvento;
}) {
  // La acción devuelve null si canceló: ahí se mide, una vez, cuando la UI recibe el resultado.
  const [estado, accion, enviando] = useActionState<EstadoCancelar, FormData>(async (previo, form) => {
    const r = await cancelarReserva(previo, form);
    if (r === null) medir("reserva_cancelada", medicion);
    return r;
  }, null);
  return (
    <form
      action={accion}
      onSubmit={(e) => {
        const pregunta = confirmada
          ? "El negocio ya confirmó tu reserva. Si cancelas ahora, tu puntaje de cumplimiento baja. ¿Cancelar de todas formas?"
          : "¿Cancelar esta reserva?";
        if (!confirm(pregunta)) e.preventDefault();
      }}
    >
      <input type="hidden" name="reservaId" value={reservaId} />
      <button
        type="submit"
        disabled={enviando}
        className={
          confirmada
            ? "px-1 py-2 text-sm font-semibold text-destructive underline underline-offset-4 disabled:opacity-60"
            : "rounded-full border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive disabled:opacity-60"
        }
      >
        {enviando ? "Cancelando…" : confirmada ? "No puedo ir, cancelar" : "Cancelar reserva"}
      </button>
      {estado?.error && (
        <p className="mt-2 text-sm font-semibold text-destructive" role="alert">
          {estado.error}
        </p>
      )}
    </form>
  );
}
