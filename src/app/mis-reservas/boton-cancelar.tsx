"use client";

import { useActionState } from "react";
import { cancelarReserva, type EstadoCancelar } from "./acciones";

export function BotonCancelar({ reservaId }: { reservaId: string }) {
  const [estado, accion, enviando] = useActionState<EstadoCancelar, FormData>(cancelarReserva, null);
  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (!confirm("¿Cancelar esta reserva?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="reservaId" value={reservaId} />
      <button
        type="submit"
        disabled={enviando}
        className="rounded-full border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive disabled:opacity-60"
      >
        {enviando ? "Cancelando…" : "Cancelar reserva"}
      </button>
      {estado?.error && (
        <p className="mt-2 text-sm font-semibold text-destructive" role="alert">
          {estado.error}
        </p>
      )}
    </form>
  );
}
