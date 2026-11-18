"use client";

import { useActionState } from "react";
import { vincularUsuario, type EstadoAdmin } from "../../acciones";

export function VincularUsuario({ negocioId }: { negocioId: string }) {
  const [estado, accion, enviando] = useActionState<EstadoAdmin, FormData>(vincularUsuario, null);
  return (
    <form action={accion} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="negocioId" value={negocioId} />
      <label className="flex flex-col gap-1.5 font-semibold">
        Correo de quien opera el negocio
        <input
          type="email"
          name="email"
          required
          autoComplete="off"
          placeholder="correo@ejemplo.com"
          className="rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <button disabled={enviando} className="rounded-full border border-primary py-3 font-display font-bold text-primary disabled:opacity-50">
        {enviando ? "Vinculando…" : "Vincular como negocio"}
      </button>
      {estado?.error && (
        <p className="text-sm font-semibold text-destructive" role="alert">
          {estado.error}
        </p>
      )}
      {estado?.ok && (
        <p className="text-sm font-semibold text-primary" role="status">
          {estado.ok}
        </p>
      )}
    </form>
  );
}
