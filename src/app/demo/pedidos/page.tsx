"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatCOP } from "@/lib/formato";
import { useDemo, type Pedido } from "../almacen";
import { ESTADO_CLIENTE } from "../estados";
import { CabeceraCliente, Cargando, ImagenCombo, NavCliente } from "../ui";

function Fila({ p }: { p: Pedido }) {
  const { combos, negocios } = useDemo();
  const c = combos.find((x) => x.id === p.comboId);
  const n = negocios.find((x) => x.id === p.negocioId);
  const fecha = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(p.creadoEn));
  return (
    <li>
      <Link href={`/demo/pedidos/${p.id}`} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card" data-pedido={p.numero}>
        <div className="size-16 shrink-0 overflow-hidden rounded-xl">{c && <ImagenCombo combo={c} />}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            Pedido {p.numero} · {fecha}
          </p>
          <p className="truncate font-display font-bold text-primary">{c?.titulo ?? "Combo"}</p>
          <p className="truncate text-sm text-muted-foreground">
            {n?.nombre} · {p.cantidad} × {formatCOP(p.precioUnitario)}
          </p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO_CLIENTE[p.estado].clase}`}>{ESTADO_CLIENTE[p.estado].texto}</span>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

export default function MisPedidos() {
  const { pedidos, negocios } = useDemo();
  const mios = pedidos.filter((p) => p.esMio);
  const activos = mios.filter((p) => p.estado === "por_confirmar" || p.estado === "confirmado");
  const anteriores = mios.filter((p) => !activos.includes(p));
  const ahorro = mios.filter((p) => p.estado === "entregado").reduce((s, p) => s + (p.precioHabitual - p.precioUnitario) * p.cantidad, 0);

  return (
    <>
      <CabeceraCliente />
      <main className="mx-auto w-full max-w-xl px-4">
        <h1 className="font-display text-3xl font-extrabold text-primary">Mis pedidos</h1>
        {!negocios.length ? (
          <Cargando />
        ) : (
          <>
            <p className="mt-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
              Llevas ahorrado <strong className="font-display text-xl">{formatCOP(ahorro)}</strong> con Salvori.
            </p>
            <h2 className="mt-6 font-display text-lg font-bold text-primary">En curso</h2>
            {activos.length ? (
              <ul className="mt-2 space-y-3">{activos.map((p) => <Fila key={p.id} p={p} />)}</ul>
            ) : (
              <div className="mt-2 rounded-2xl bg-card p-5 text-center shadow-card">
                <p className="text-muted-foreground">No tienes pedidos en curso.</p>
                <Link href="/demo#combos" className="mt-3 inline-block rounded-full bg-accent px-5 py-2.5 font-display font-bold text-accent-foreground">
                  Reservar un combo
                </Link>
              </div>
            )}
            <h2 className="mt-6 font-display text-lg font-bold text-primary">Historial</h2>
            {anteriores.length ? (
              <ul className="mt-2 space-y-3">{anteriores.map((p) => <Fila key={p.id} p={p} />)}</ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Aquí verás tus pedidos anteriores.</p>
            )}
          </>
        )}
      </main>
      <NavCliente />
    </>
  );
}
