"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, Clock, MapPin, Star } from "lucide-react";
import { formatCOP } from "@/lib/formato";
import { descuento } from "@/lib/ofertas";
import { CATEGORIAS, cierraEn, useDemo, vigente, type Categoria } from "./almacen";
import { CabeceraCliente, Cargando, ImagenCombo, NavCliente } from "./ui";

const PASOS = [
  ["1", "Elige un combo", "cerca de ti"],
  ["2", "Resérvalo", "y el negocio lo confirma"],
  ["3", "Recógelo", "con tu código y paga allá"],
] as const;

export default function InicioCliente() {
  const { combos, negocios, pedidos } = useDemo();
  const [cat, setCat] = useState<Categoria | "todos">("todos");
  const negocio = (id: string) => negocios.find((n) => n.id === id);

  const lista = useMemo(
    () =>
      combos
        .filter((c) => vigente(c) && (cat === "todos" || c.categoria === cat))
        .sort((a, b) => (negocio(a.negocioId)?.minutos ?? 0) - (negocio(b.negocioId)?.minutos ?? 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [combos, negocios, cat],
  );
  const confirmado = pedidos.find((p) => p.esMio && p.estado === "confirmado");
  const esperando = pedidos.find((p) => p.esMio && p.estado === "por_confirmar");

  return (
    <>
      <CabeceraCliente />
      <main className="mx-auto w-full max-w-xl px-4">
        {(confirmado || esperando) && (
          <Link
            href={`/demo/pedidos/${(confirmado ?? esperando)!.id}`}
            className={`mb-4 block rounded-2xl px-4 py-3 font-semibold ${confirmado ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            {confirmado
              ? `✅ Tu pedido ${confirmado.numero} está confirmado. Toca para ver tu código.`
              : `⏳ Tu pedido ${esperando!.numero} espera confirmación del negocio.`}
          </Link>
        )}

        <section className="pb-6 pt-2">
          <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-primary">
            Lo bueno
            <br />
            se aprovecha.
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Reserva combos de panaderías, cafés y restaurantes cerca de ti, a mejor precio. Pagas al recogerlo.
          </p>
          <a
            href="#combos"
            className="mt-5 flex items-center justify-center gap-2 rounded-full bg-accent py-3.5 font-display text-lg font-extrabold text-accent-foreground shadow-card"
          >
            Reservar un combo <ArrowDown className="size-5" aria-hidden />
          </a>
          <ol className="mt-5 grid grid-cols-3 gap-2">
            {PASOS.map(([n, t, s]) => (
              <li key={n} className="rounded-2xl bg-card p-3 text-center shadow-card">
                <span className="mx-auto grid size-7 place-items-center rounded-full bg-primary font-display text-sm font-extrabold text-primary-foreground">
                  {n}
                </span>
                <p className="mt-1.5 font-display text-sm font-bold leading-tight text-primary">{t}</p>
                <p className="text-xs leading-tight text-muted-foreground">{s}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="combos" className="scroll-mt-4">
          <h2 className="font-display text-2xl font-extrabold text-primary">Combos disponibles cerca de ti</h2>
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Categorías">
            {(["todos", ...Object.keys(CATEGORIAS)] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setCat(k as Categoria | "todos")}
                aria-pressed={cat === k}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${cat === k ? "bg-primary text-primary-foreground" : "bg-card text-foreground shadow-card"}`}
              >
                {k === "todos" ? "Todos" : `${CATEGORIAS[k as Categoria].emoji} ${CATEGORIAS[k as Categoria].texto}`}
              </button>
            ))}
          </div>

          {negocios.length === 0 ? (
            <Cargando />
          ) : lista.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-card p-6 text-center text-muted-foreground shadow-card">No hay combos en esta categoría ahora. Prueba con otra.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {lista.map((c) => {
                const n = negocio(c.negocioId)!;
                const agotado = c.cuposDisponibles <= 0;
                return (
                  <li key={c.id} className="overflow-hidden rounded-2xl bg-card shadow-card" data-combo={c.id}>
                    <Link href={`/demo/combo/${c.id}`} className="relative block aspect-[16/10]">
                      <ImagenCombo combo={c} />
                      <span className="absolute left-3 top-3 rounded-full bg-card/95 px-2.5 py-1 text-xs font-bold">
                        {CATEGORIAS[c.categoria].emoji} {CATEGORIAS[c.categoria].texto}
                      </span>
                      <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-1 font-display text-sm font-extrabold text-accent-foreground">
                        -{descuento(c.precioFinal, c.precioHabitual)}%
                      </span>
                      <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                        <Clock className="size-3.5" aria-hidden /> {cierraEn(c.hasta)}
                      </span>
                    </Link>
                    <div className="p-4">
                      <h3 className="font-display text-lg font-bold leading-snug text-primary">{c.titulo}</h3>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                        {n.nombre}
                        <span className="flex items-center gap-0.5">
                          <MapPin className="size-3.5" aria-hidden /> {n.minutos} min caminando
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Star className="size-3.5 fill-accent text-accent" aria-hidden /> {n.calificacion.toFixed(1).replace(".", ",")}
                        </span>
                      </p>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground line-through">{formatCOP(c.precioHabitual)}</p>
                          <p className="font-display text-2xl font-extrabold leading-none">{formatCOP(c.precioFinal)}</p>
                          <p className="mt-1 text-sm font-bold text-mandarina-texto">{agotado ? "Agotado" : `Solo quedan ${c.cuposDisponibles}`}</p>
                        </div>
                        {agotado ? (
                          <span className="rounded-full bg-muted px-5 py-3 font-display font-bold text-muted-foreground">Agotado</span>
                        ) : (
                          <Link href={`/demo/combo/${c.id}`} className="rounded-full bg-primary px-5 py-3 font-display font-bold text-primary-foreground">
                            Reservar combo
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <NavCliente />
    </>
  );
}
