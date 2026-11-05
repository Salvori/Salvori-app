"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { formatCOP } from "@/lib/formato";
import { cierraEn, MI_NEGOCIO, useDemo, vigente } from "../almacen";
import { Cargando, ImagenCombo, NavNegocio } from "../ui";
import { TarjetaPedido } from "./tarjeta-pedido";

export default function InicioNegocio() {
  const { negocios, combos, pedidos } = useDemo();
  const negocio = negocios.find((n) => n.id === MI_NEGOCIO);
  if (!negocio) return <Cargando />;

  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const deHoy = pedidos.filter((p) => p.negocioId === MI_NEGOCIO && new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(p.creadoEn)) === hoy);
  const porConfirmar = deHoy.filter((p) => p.estado === "por_confirmar");
  const porEntregar = deHoy.filter((p) => p.estado === "confirmado");
  const entregados = deHoy.filter((p) => p.estado === "entregado");
  const ventas = entregados.reduce((s, p) => s + p.precioUnitario * p.cantidad, 0);
  const vendidos = deHoy.filter((p) => ["confirmado", "entregado"].includes(p.estado)).reduce((s, p) => s + p.cantidad, 0);
  const activos = combos.filter((c) => c.negocioId === MI_NEGOCIO && vigente(c));

  return (
    <>
      <main className="mx-auto w-full max-w-xl px-4 pt-4">
        <p className="text-sm text-muted-foreground">Panel del negocio</p>
        <h1 className="font-display text-2xl font-extrabold text-primary">Hola, {negocio.nombre} 👋</h1>

        <section className="mt-4 rounded-2xl bg-primary p-4 text-primary-foreground shadow-card">
          <p className="font-display font-bold">Resumen de hoy</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="font-display text-2xl font-extrabold">{vendidos}</p>
              <p className="text-xs opacity-90">combos vendidos</p>
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold">{formatCOP(ventas)}</p>
              <p className="text-xs opacity-90">vendido hoy</p>
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold">{porEntregar.length}</p>
              <p className="text-xs opacity-90">por entregar</p>
            </div>
          </div>
          <p className="mt-3 text-sm opacity-90">
            Tus clientes ya recogieron {entregados.length} de {entregados.length + porEntregar.length} pedidos confirmados.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="font-display text-lg font-bold text-primary">Lo que te falta por hacer</h2>
          {porConfirmar.length + porEntregar.length === 0 ? (
            <p className="mt-2 rounded-2xl bg-card p-4 text-center text-muted-foreground shadow-card">Todo al día. Cuando alguien reserve, te avisamos aquí.</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {[...porConfirmar, ...porEntregar].map((p) => (
                <TarjetaPedido key={p.id} p={p} />
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-primary">Tus combos activos hoy</h2>
            <Link href="/demo/negocio/combos" className="text-sm font-bold text-primary underline underline-offset-4">
              Ver todos
            </Link>
          </div>
          <ul className="mt-2 space-y-3">
            {activos.map((c) => (
              <li key={c.id} className="flex gap-3 rounded-2xl bg-card p-3 shadow-card">
                <div className="size-16 shrink-0 overflow-hidden rounded-xl">
                  <ImagenCombo combo={c} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold text-primary">{c.titulo}</p>
                  <p className="text-sm">
                    {formatCOP(c.precioFinal)} <span className="text-muted-foreground line-through">{formatCOP(c.precioHabitual)}</span>
                  </p>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full bg-primary" style={{ width: `${(c.cuposDisponibles / Math.max(1, c.cuposTotal)) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Quedan {c.cuposDisponibles} de {c.cuposTotal} · {cierraEn(c.hasta)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <Link
            href="/demo/negocio/combos/nuevo"
            className="mt-4 flex items-center justify-center gap-2 rounded-full bg-accent py-3.5 font-display text-lg font-extrabold text-accent-foreground shadow-card"
          >
            <Plus className="size-5" aria-hidden /> Subir un combo nuevo
          </Link>
        </section>
      </main>
      <NavNegocio />
    </>
  );
}
