"use client";

import { useActionState } from "react";
import { CalendarClock } from "lucide-react";
import { DIAS_SEMANA } from "@/lib/programacion";
import { programarOferta, type EstadoGestion } from "../acciones";

// Convierte una oferta en plantilla: se publica sola los días elegidos, a la hora indicada.
export function ProgramarOferta({ ofertaId, horaInicial, diasIniciales }: { ofertaId: string; horaInicial: string; diasIniciales?: number[] }) {
  const [estado, accion, enviando] = useActionState<EstadoGestion, FormData>(programarOferta, null);
  const marcados = diasIniciales ?? [1, 2, 3, 4, 5];

  return (
    <details className="mt-2">
      <summary className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary underline underline-offset-4">
        <CalendarClock className="size-3.5" aria-hidden /> {diasIniciales ? "Cambiar días u hora" : "Programar"}
      </summary>
      <form action={accion} className="mt-3 flex flex-col gap-3 rounded-xl bg-secondary/60 p-3">
        <input type="hidden" name="ofertaId" value={ofertaId} />
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">¿Qué días se publica?</legend>
          <div className="grid grid-cols-7 gap-1">
            {DIAS_SEMANA.map((d) => (
              <label
                key={d.n}
                title={d.largo}
                className="grid cursor-pointer place-items-center rounded-full border bg-card py-2 text-sm font-bold has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
              >
                <input type="checkbox" name="dias" value={d.n} defaultChecked={marcados.includes(d.n)} aria-label={d.largo} className="sr-only" />
                {d.letra}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Hora de publicación
          <input type="time" name="hora" required defaultValue={horaInicial} className="rounded-xl border bg-background px-4 py-3 text-base" />
        </label>
        <p className="text-xs text-muted-foreground">
          Cada día elegido se publica una oferta igual, con la misma foto, precio, cupos y horario de recogida.
        </p>
        <button disabled={enviando} className="rounded-full bg-primary py-3 font-display font-bold text-primary-foreground disabled:opacity-50">
          {enviando ? "Guardando…" : "Guardar programación"}
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
    </details>
  );
}
