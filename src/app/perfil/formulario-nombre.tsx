"use client";

import { useActionState } from "react";
import { guardarNombre, type EstadoPerfil } from "./acciones";

export function FormularioNombre({ nombre }: { nombre: string }) {
  const [estado, accion, guardando] = useActionState<EstadoPerfil, FormData>(guardarNombre, null);
  return (
    <form action={accion} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1.5 font-semibold">
        Tu nombre
        <span className="text-sm font-normal text-muted-foreground">Con este nombre te entregan el pedido.</span>
        <div className="flex gap-2">
          <input
            name="nombre"
            required
            minLength={2}
            maxLength={60}
            defaultValue={nombre}
            autoComplete="given-name"
            className="min-w-0 flex-1 rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button disabled={guardando} className="rounded-full bg-primary px-5 font-bold text-primary-foreground disabled:opacity-50">
            {guardando ? "…" : "Guardar"}
          </button>
        </div>
      </label>
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
