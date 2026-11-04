"use client";

import { useActionState } from "react";
import { entrarConContrasena, type EstadoContrasena } from "./contrasena";

export function FormularioContrasena({ siguiente }: { siguiente: string }) {
  const [estado, accion, enviando] = useActionState<EstadoContrasena, FormData>(entrarConContrasena, null);
  return (
    <details className="mt-6 rounded-2xl border border-dashed border-primary/30 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-primary">Entrar con contraseña (demo)</summary>
      <form action={accion} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="siguiente" value={siguiente} />
        <input
          type="email"
          name="email"
          aria-label="Correo"
          placeholder="correo de prueba"
          autoComplete="username"
          className="rounded-xl border bg-background px-4 py-3"
        />
        <input
          type="password"
          name="password"
          aria-label="Contraseña"
          placeholder="contraseña"
          autoComplete="current-password"
          className="rounded-xl border bg-background px-4 py-3"
        />
        {estado?.error && (
          <p className="text-sm font-semibold text-destructive" role="alert">
            {estado.error}
          </p>
        )}
        <button
          type="submit"
          disabled={enviando}
          className="rounded-full border border-primary py-2.5 font-display font-bold text-primary disabled:opacity-60"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </details>
  );
}
