"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Minus, Plus } from "lucide-react";
import { formatCOP } from "@/lib/formato";
import { CATEGORIAS, cierraEn, demo, MI_NEGOCIO, useDemo, vigente } from "../../almacen";
import { Cargando, ImagenCombo, NavNegocio } from "../../ui";

function Lista() {
  const { combos, negocios } = useDemo();
  const publicado = useSearchParams().get("publicado");
  const mios = combos.filter((c) => c.negocioId === MI_NEGOCIO);
  if (!negocios.length) return <Cargando />;

  return (
    <>
      {publicado && (
        <p className="mt-3 rounded-2xl bg-secondary px-4 py-3 font-semibold text-secondary-foreground" role="status">
          ✅ ¡Combo publicado! Ya lo ven los clientes cercanos.
        </p>
      )}
      <ul className="mt-4 space-y-3">
        {mios.map((c) => {
          const enVenta = vigente(c);
          return (
            <li key={c.id} className={`rounded-2xl bg-card p-3 shadow-card ${enVenta ? "" : "opacity-70"}`} data-combo={c.titulo}>
              <div className="flex gap-3">
                <div className="size-20 shrink-0 overflow-hidden rounded-xl">
                  <ImagenCombo combo={c} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold leading-snug text-primary">{c.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORIAS[c.categoria].emoji} {CATEGORIAS[c.categoria].texto} · {enVenta ? cierraEn(c.hasta) : c.activo ? "Cerrado" : "Pausado"}
                  </p>
                  <p className="text-sm">
                    <strong>{formatCOP(c.precioFinal)}</strong> <span className="text-muted-foreground line-through">{formatCOP(c.precioHabitual)}</span>
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border px-2 py-1">
                  <button type="button" aria-label="Menos cupos" onClick={() => demo.ajustarCupos(c.id, -1)} className="grid size-8 place-items-center rounded-full bg-muted">
                    <Minus className="size-4" aria-hidden />
                  </button>
                  <span className="min-w-14 text-center text-sm">
                    <strong className="font-display text-lg">{c.cuposDisponibles}</strong> cupos
                  </span>
                  <button type="button" aria-label="Más cupos" onClick={() => demo.ajustarCupos(c.id, 1)} className="grid size-8 place-items-center rounded-full bg-muted">
                    <Plus className="size-4" aria-hidden />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => demo.alternarActivo(c.id)}
                  className={`ml-auto rounded-full px-4 py-2 text-sm font-bold ${c.activo ? "border border-primary/40 text-primary" : "bg-primary text-primary-foreground"}`}
                >
                  {c.activo ? "Pausar hoy" : "Activar hoy"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function MisCombos() {
  return (
    <>
      <main className="mx-auto w-full max-w-xl px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-primary">Mis combos</h1>
            <p className="text-sm text-muted-foreground">Ajusta cupos o pausa lo que ya no tengas.</p>
          </div>
          <Link href="/demo/negocio/combos/nuevo" className="flex items-center gap-1 rounded-full bg-accent px-4 py-2.5 font-display font-extrabold text-accent-foreground">
            <Plus className="size-4" aria-hidden /> Nuevo
          </Link>
        </div>
        <Suspense fallback={<Cargando />}>
          <Lista />
        </Suspense>
      </main>
      <NavNegocio />
    </>
  );
}
