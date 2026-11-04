"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { enviarEnlace, type EstadoEntrar } from "./acciones";

export function FormularioEntrar({ siguiente }: { siguiente: string }) {
  const [estado, accion, enviando] = useActionState<EstadoEntrar, FormData>(enviarEnlace, null);

  if (estado?.ok) {
    return (
      <div className="rounded-2xl bg-card p-6 shadow-card" role="status">
        <MailCheck className="size-8 text-primary" aria-hidden />
        <h2 className="mt-3 font-display text-xl font-extrabold text-primary">Revisa tu correo</h2>
        <p className="mt-2 text-muted-foreground">
          Enviamos un enlace a <strong className="text-foreground">{estado.email}</strong>. Ábrelo en este celular para
          entrar. Si no llega en un par de minutos, revisa la carpeta de spam.
        </p>
      </div>
    );
  }

  return (
    <form action={accion} className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card" noValidate>
      <input type="hidden" name="siguiente" value={siguiente} />
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">Tu correo</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="nombre@correo.com"
          className="rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <label className="flex items-start gap-3 text-sm leading-snug">
        <input type="checkbox" name="autorizo" required className="mt-0.5 size-5 shrink-0 accent-[#174C3C]" />
        <span>
          Autorizo a Salvori a tratar mis datos personales para gestionar mis reservas, según la{" "}
          <Link href="/privacidad" className="font-semibold text-primary underline underline-offset-4" target="_blank">
            política de tratamiento de datos
          </Link>{" "}
          (Ley 1581 de 2012).
        </span>
      </label>
      {estado && !estado.ok && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive" role="alert">
          {estado.mensaje}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="rounded-full bg-primary py-3 font-display font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Enviarme el enlace"}
      </button>
      <p className="text-center text-xs text-muted-foreground">Sin contraseñas: te llega un enlace por correo.</p>
    </form>
  );
}
