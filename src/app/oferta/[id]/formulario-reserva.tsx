"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { formatCOP } from "@/lib/formato";
import { reservarOferta, type EstadoReserva } from "./acciones";

type Props = {
  ofertaId: string;
  precioFinal: number;
  precioHabitual: number;
  cupos: number;
  conSesion: boolean;
};

export function FormularioReserva({ ofertaId, precioFinal, precioHabitual, cupos, conSesion }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoReserva, FormData>(reservarOferta, null);
  const [cantidad, setCantidad] = useState(1);
  const [origen, setOrigen] = useState("directo");
  const maximo = Math.min(cupos, 20);

  useEffect(() => {
    try {
      const o = sessionStorage.getItem("salvori-origen");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (o) setOrigen(o);
    } catch {}
  }, []);

  if (!conSesion) {
    return (
      <Link
        href={`/entrar?next=${encodeURIComponent(`/oferta/${ofertaId}`)}`}
        className="block rounded-full bg-primary py-3 text-center font-display text-lg font-bold text-primary-foreground"
      >
        Entrar para reservar
      </Link>
    );
  }

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="ofertaId" value={ofertaId} />
      <input type="hidden" name="cantidad" value={cantidad} />
      <input type="hidden" name="origen" value={origen} />
      <div className="flex items-center justify-between">
        <span className="font-semibold">Cantidad</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Quitar una unidad"
            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            disabled={cantidad <= 1}
            className="grid size-10 place-items-center rounded-full border bg-card disabled:opacity-40"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="w-6 text-center font-display text-xl font-extrabold" aria-live="polite">
            {cantidad}
          </span>
          <button
            type="button"
            aria-label="Agregar una unidad"
            onClick={() => setCantidad((c) => Math.min(maximo, c + 1))}
            disabled={cantidad >= maximo}
            className="grid size-10 place-items-center rounded-full border bg-card disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">Observaciones (opcional)</span>
        <textarea
          name="observaciones"
          maxLength={500}
          rows={2}
          placeholder="Por ejemplo: llego 10 minutos tarde"
          className="rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      {estado?.error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive" role="alert">
          {estado.error}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="rounded-full bg-primary py-3 font-display text-lg font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {enviando ? "Reservando…" : `Reservar · ${formatCOP(precioFinal * cantidad)}`}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        Ahorras {formatCOP((precioHabitual - precioFinal) * cantidad)}. Pagas en el local al recoger, cuando el negocio
        confirme.
      </p>
    </form>
  );
}
