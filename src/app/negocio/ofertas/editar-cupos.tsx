"use client";

import { useActionState } from "react";
import { editarCupos, type EstadoGestion } from "../acciones";

// Solo se muestra en ofertas activas sin reservas; la base de datos vuelve a verificarlo.
export function EditarCupos({ ofertaId, cupos }: { ofertaId: string; cupos: number }) {
  const [estado, accion, enviando] = useActionState<EstadoGestion, FormData>(editarCupos, null);
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-semibold text-primary underline underline-offset-4">Cambiar cupos</summary>
      <form action={accion} className="mt-2 flex items-end gap-2">
        <input type="hidden" name="ofertaId" value={ofertaId} />
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Cupos
          <input
            type="number"
            name="cupos"
            min={1}
            max={200}
            required
            inputMode="numeric"
            defaultValue={cupos}
            className="w-24 rounded-xl border bg-background px-3 py-2.5 text-base"
          />
        </label>
        <button disabled={enviando} className="rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {enviando ? "Guardando…" : "Guardar"}
        </button>
      </form>
      {estado?.error && (
        <p className="mt-1 text-sm font-semibold text-destructive" role="alert">
          {estado.error}
        </p>
      )}
      {estado?.ok && (
        <p className="mt-1 text-sm font-semibold text-primary" role="status">
          {estado.ok}
        </p>
      )}
    </details>
  );
}
