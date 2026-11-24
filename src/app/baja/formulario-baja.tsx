"use client";

import Link from "next/link";
import { useActionState } from "react";
import { darDeBaja, type EstadoInteres } from "@/app/interesados/acciones";

export function FormularioBaja({ token }: { token: string }) {
  const [estado, accion, enviando] = useActionState<EstadoInteres, FormData>(darDeBaja, null);

  if (estado?.ok) {
    return (
      <div className="rounded-2xl bg-card p-5 shadow-card" role="status">
        <p className="font-semibold">{estado.ok}</p>
        <Link href="/" className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 font-display font-bold text-primary-foreground">
          Ver combos cerca
        </Link>
      </div>
    );
  }

  return (
    <form action={accion} className="rounded-2xl bg-card p-5 shadow-card">
      <input type="hidden" name="token" value={token} />
      <p>¿Quieres dejar de recibir correos cuando haya combos cerca de ti?</p>
      {estado?.error && (
        <p className="mt-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive" role="alert">
          {estado.error}
        </p>
      )}
      <button disabled={enviando} className="mt-4 w-full rounded-full bg-primary py-3 font-display font-bold text-primary-foreground disabled:opacity-50">
        {enviando ? "Un momento…" : "Dejar de recibir avisos"}
      </button>
    </form>
  );
}
