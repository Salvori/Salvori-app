"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { calificarReserva, type EstadoCalificar } from "./acciones";

const ASPECTOS = [
  { nombre: "calidad", etiqueta: "Calidad" },
  { nombre: "aseo", etiqueta: "Aseo" },
  { nombre: "atencion", etiqueta: "Atención" },
] as const;

const PALABRAS = ["", "Muy mala", "Mala", "Regular", "Buena", "Excelente"];

function Estrellas({ nombre, etiqueta }: { nombre: string; etiqueta: string }) {
  const [valor, setValor] = useState(0);
  return (
    <fieldset className="flex items-center justify-between gap-3">
      <legend className="sr-only">{etiqueta}, de 1 a 5 estrellas</legend>
      <span className="flex flex-col leading-tight">
        <span aria-hidden className="text-sm font-semibold text-foreground">
          {etiqueta}
        </span>
        <span className="min-h-4 text-xs text-muted-foreground" aria-live="polite">
          {PALABRAS[valor]}
        </span>
      </span>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer p-1.5" title={`${n} de 5`}>
            <input
              type="radio"
              name={nombre}
              value={n}
              checked={valor === n}
              onChange={() => setValor(n)}
              className="peer sr-only"
              aria-label={`${etiqueta}: ${n} de 5`}
            />
            <Star
              aria-hidden
              className={`size-7 rounded-sm transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary ${
                n <= valor ? "fill-accent text-accent" : "fill-transparent text-muted-foreground/50"
              }`}
            />
          </label>
        ))}
      </span>
    </fieldset>
  );
}

export function Calificar({ reservaId, negocioId, negocio }: { reservaId: string; negocioId: string; negocio: string }) {
  const [estado, accion, enviando] = useActionState<EstadoCalificar, FormData>(calificarReserva, null);
  const [comentario, setComentario] = useState("");

  if (estado && "ok" in estado) {
    return (
      <p className="mt-4 rounded-2xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground" role="status">
        ¡Gracias por calificar! Tu opinión ayuda a otros compradores a elegir.
      </p>
    );
  }

  return (
    <form action={accion} className="mt-4 rounded-2xl border border-border bg-background p-4">
      <p className="font-display font-bold text-primary">¿Cómo te fue en {negocio}?</p>
      <p className="mb-3 text-xs text-muted-foreground">Solo se califica una vez. Tu nombre no se muestra.</p>
      <input type="hidden" name="reservaId" value={reservaId} />
      <input type="hidden" name="negocioId" value={negocioId} />
      <div className="space-y-1">
        {ASPECTOS.map((a) => (
          <Estrellas key={a.nombre} nombre={a.nombre} etiqueta={a.etiqueta} />
        ))}
      </div>
      <label className="mt-3 block text-sm font-semibold text-foreground">
        Comentario (opcional)
        <textarea
          name="comentario"
          maxLength={280}
          rows={2}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="¿Qué te gustó o qué mejorarías?"
          className="mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2 text-base font-normal"
        />
      </label>
      <p className="mt-1 text-right text-xs text-muted-foreground">{comentario.length}/280</p>
      {estado && "error" in estado && (
        <p className="mt-1 text-sm font-semibold text-destructive" role="alert">
          {estado.error}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="mt-3 w-full rounded-full bg-primary py-3 font-display font-bold text-primary-foreground disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Enviar calificación"}
      </button>
    </form>
  );
}
