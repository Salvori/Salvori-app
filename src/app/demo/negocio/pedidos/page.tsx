"use client";

import { useState } from "react";
import { MI_NEGOCIO, useDemo, type EstadoPedido } from "../../almacen";
import { Cargando, NavNegocio } from "../../ui";
import { TarjetaPedido } from "../tarjeta-pedido";

const FILTROS: Array<{ id: string; texto: string; estados: EstadoPedido[] }> = [
  { id: "confirmar", texto: "Por confirmar", estados: ["por_confirmar"] },
  { id: "entregar", texto: "Por entregar", estados: ["confirmado"] },
  { id: "listos", texto: "Entregados", estados: ["entregado"] },
  { id: "otros", texto: "Cancelados", estados: ["rechazado", "cancelado"] },
];

export default function PedidosNegocio() {
  const { pedidos, negocios } = useDemo();
  const mios = pedidos.filter((p) => p.negocioId === MI_NEGOCIO);
  const [filtro, setFiltro] = useState<string | null>(null);
  const porDefecto = FILTROS.find((f) => mios.some((p) => f.estados.includes(p.estado)))?.id ?? "confirmar";
  const activo = FILTROS.find((f) => f.id === (filtro ?? porDefecto))!;
  const lista = mios.filter((p) => activo.estados.includes(p.estado));

  return (
    <>
      <main className="mx-auto w-full max-w-xl px-4 pt-4">
        <h1 className="font-display text-2xl font-extrabold text-primary">Pedidos de hoy</h1>
        {!negocios.length ? (
          <Cargando />
        ) : (
          <>
            <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Estado de los pedidos">
              {FILTROS.map((f) => {
                const n = mios.filter((p) => f.estados.includes(p.estado)).length;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={activo.id === f.id}
                    onClick={() => setFiltro(f.id)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${activo.id === f.id ? "bg-primary text-primary-foreground" : "bg-card shadow-card"}`}
                  >
                    {f.texto} <span className={`ml-1 rounded-full px-1.5 ${f.id === "confirmar" && n ? "bg-accent text-accent-foreground" : ""}`}>{n}</span>
                  </button>
                );
              })}
            </div>
            {lista.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-card p-5 text-center text-muted-foreground shadow-card">No hay pedidos en «{activo.texto.toLowerCase()}».</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {lista.map((p) => (
                  <TarjetaPedido key={p.id} p={p} />
                ))}
              </ul>
            )}
          </>
        )}
      </main>
      <NavNegocio />
    </>
  );
}
