"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ChefHat, Clock, MapPin, Minus, Plus, Star } from "lucide-react";
import { formatCOP } from "@/lib/formato";
import { descuento } from "@/lib/ofertas";
import { cierraEn, hora, useDemo, vigente } from "../../almacen";
import { Cargando, ImagenCombo, NavCliente } from "../../ui";

export default function FichaCombo() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { combos, negocios } = useDemo();
  const [cantidad, setCantidad] = useState(1);
  const c = combos.find((x) => x.id === id);
  const n = negocios.find((x) => x.id === c?.negocioId);

  if (!negocios.length) return <Cargando />;
  if (!c || !n)
    return (
      <main className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-muted-foreground">Este combo ya no está disponible.</p>
        <Link href="/demo" className="mt-4 inline-block font-bold text-primary underline">
          Ver otros combos
        </Link>
      </main>
    );

  const disponible = vigente(c) && c.cuposDisponibles > 0;
  const max = Math.min(c.cuposDisponibles, 5);

  return (
    <>
      <main className="mx-auto w-full max-w-xl px-4 pb-32 pt-3">
        <button type="button" onClick={() => router.back()} className="mb-3 flex items-center gap-1 text-sm font-semibold text-primary">
          <ArrowLeft className="size-4" aria-hidden /> Volver
        </button>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
          <ImagenCombo combo={c} />
          <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 font-display font-extrabold text-accent-foreground">
            -{descuento(c.precioFinal, c.precioHabitual)}%
          </span>
        </div>

        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          {n.nombre}
          <span className="flex items-center gap-0.5 text-foreground">
            <Star className="size-4 fill-accent text-accent" aria-hidden /> {n.calificacion.toFixed(1).replace(".", ",")}
            <span className="font-normal text-muted-foreground">({n.resenas} reseñas)</span>
          </span>
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight text-primary">{c.titulo}</h1>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="font-display text-3xl font-extrabold">{formatCOP(c.precioFinal)}</span>
          <span className="text-muted-foreground line-through">{formatCOP(c.precioHabitual)}</span>
        </div>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
          <Clock className="size-4" aria-hidden /> {cierraEn(c.hasta)} · quedan {c.cuposDisponibles}
        </p>

        <section className="mt-5 rounded-2xl bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold text-primary">¿Qué incluye?</h2>
          <p className="mt-1">{c.contenido}</p>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <ChefHat className="size-4" aria-hidden /> Preparado hoy
          </p>
        </section>

        <section className="mt-4 rounded-2xl bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold text-primary">Dónde recoger</h2>
          <p className="mt-1 font-semibold">{n.nombre}</p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" aria-hidden /> {n.direccion} · {n.minutos} min caminando
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-4" aria-hidden /> Recoge hoy entre {hora(c.desde)} y {hora(c.hasta)}
          </p>
        </section>
      </main>

      {/* Barra fija para reservar */}
      <div className="fixed inset-x-0 bottom-[60px] z-10 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Quitar uno" onClick={() => setCantidad((v) => Math.max(1, v - 1))} disabled={cantidad <= 1} className="grid size-10 place-items-center rounded-full border disabled:opacity-40">
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="w-5 text-center font-display text-xl font-extrabold" aria-live="polite">
              {cantidad}
            </span>
            <button type="button" aria-label="Agregar uno" onClick={() => setCantidad((v) => Math.min(max, v + 1))} disabled={cantidad >= max} className="grid size-10 place-items-center rounded-full border disabled:opacity-40">
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
          {disponible ? (
            <Link
              href={`/demo/reservar/${c.id}?cantidad=${cantidad}`}
              className="flex-1 rounded-full bg-accent py-3 text-center font-display text-lg font-extrabold text-accent-foreground"
            >
              Reservar · {formatCOP(c.precioFinal * cantidad)}
            </Link>
          ) : (
            <span className="flex-1 rounded-full bg-muted py-3 text-center font-display font-bold text-muted-foreground">No disponible</span>
          )}
        </div>
      </div>
      <NavCliente />
    </>
  );
}
