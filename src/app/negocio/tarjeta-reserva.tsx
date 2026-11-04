"use client";

import { useActionState, useState } from "react";
import { formatCOP, formatHora } from "@/lib/formato";
import { gestionarReserva, type EstadoGestion } from "./acciones";

export type ReservaBandeja = {
  id: string;
  titulo: string;
  nombre_comprador: string;
  cantidad: number;
  precio_unitario: number;
  estado: string;
  codigo: string | null;
  observaciones: string;
  metodo_pago: string | null;
  solicitada_en: string;
  recogida_desde: string;
  recogida_hasta: string;
  motivo_rechazo: string | null;
};

const ETIQUETA: Record<string, string> = {
  solicitada: "Nueva: confirma o rechaza",
  confirmada: "Confirmada: el comprador viene en camino",
  lista: "Lista para entregar",
  entregada: "Entregada",
  rechazada: "Rechazada",
  cancelada: "Cancelada por el comprador",
  no_recogida: "No recogida",
};

const btn = "rounded-full px-4 py-3 font-display font-bold disabled:opacity-50";

export function TarjetaReserva({ r, ahora }: { r: ReservaBandeja; ahora: number }) {
  const [estado, accion, enviando] = useActionState<EstadoGestion, FormData>(gestionarReserva, null);
  const [modo, setModo] = useState<"nada" | "rechazar" | "entregar">("nada");
  const minutos = Math.floor((ahora - new Date(r.solicitada_en).getTime()) / 60000);
  const demorada = r.estado === "solicitada" && minutos >= 15;
  const vencida = ahora > new Date(r.recogida_hasta).getTime();
  const activa = ["solicitada", "confirmada", "lista"].includes(r.estado);

  return (
    <li
      data-estado={r.estado}
      className={`rounded-2xl bg-card p-5 shadow-card ${r.estado === "solicitada" ? "ring-2 ring-accent" : ""} ${demorada ? "ring-destructive" : ""} ${activa ? "" : "opacity-70"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            r.estado === "solicitada" ? "bg-accent text-accent-foreground" : activa ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {ETIQUETA[r.estado] ?? r.estado}
        </span>
        <span className={`text-xs ${demorada ? "font-bold text-destructive" : "text-muted-foreground"}`}>
          {minutos < 1 ? "hace un momento" : `hace ${minutos} min`}
        </span>
      </div>
      <p className="mt-3 font-display text-lg font-bold text-primary">
        {r.cantidad} × {r.titulo}
      </p>
      <p className="text-sm">
        <strong>{r.nombre_comprador}</strong> · {formatCOP(r.precio_unitario * r.cantidad)} · recoge de {formatHora(r.recogida_desde)} a{" "}
        {formatHora(r.recogida_hasta)}
      </p>
      {r.observaciones && <p className="mt-1 rounded-xl bg-muted px-3 py-2 text-sm">«{r.observaciones}»</p>}
      {r.estado === "rechazada" && r.motivo_rechazo && <p className="mt-1 text-sm text-muted-foreground">Motivo: {r.motivo_rechazo}</p>}
      {r.estado === "entregada" && r.metodo_pago && <p className="mt-1 text-sm text-muted-foreground">Pagó con {r.metodo_pago}</p>}

      {activa && (
        <form action={accion} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="reservaId" value={r.id} />

          {r.estado === "solicitada" && modo === "nada" && (
            <div className="grid grid-cols-2 gap-2">
              <button name="estado" value="confirmada" disabled={enviando} className={`${btn} bg-primary text-primary-foreground`}>
                Confirmar
              </button>
              <button type="button" onClick={() => setModo("rechazar")} className={`${btn} border border-destructive/40 text-destructive`}>
                Rechazar
              </button>
            </div>
          )}

          {modo === "rechazar" && (
            <>
              <input name="motivo" required placeholder="Motivo (ej.: se acabó el producto)" className="rounded-xl border bg-background px-4 py-3" />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setModo("nada")} className={`${btn} border`}>
                  Volver
                </button>
                <button name="estado" value="rechazada" disabled={enviando} className={`${btn} bg-destructive text-white`}>
                  Rechazar
                </button>
              </div>
            </>
          )}

          {(r.estado === "confirmada" || r.estado === "lista") && modo === "nada" && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setModo("entregar")} className={`${btn} bg-primary text-primary-foreground`}>
                Entregar
              </button>
              {r.estado === "confirmada" ? (
                <button name="estado" value="lista" disabled={enviando} className={`${btn} border border-primary text-primary`}>
                  Está lista
                </button>
              ) : vencida ? (
                <button name="estado" value="no_recogida" disabled={enviando} className={`${btn} border`}>
                  No la recogió
                </button>
              ) : (
                <span />
              )}
              {r.estado === "confirmada" && vencida && (
                <button name="estado" value="no_recogida" disabled={enviando} className={`${btn} col-span-2 border`}>
                  No la recogió
                </button>
              )}
            </div>
          )}

          {modo === "entregar" && (
            <>
              <label className="flex flex-col gap-1.5 font-semibold">
                Código del comprador
                <input
                  name="codigo"
                  required
                  maxLength={6}
                  autoComplete="off"
                  autoCapitalize="characters"
                  placeholder="ABC123"
                  className="rounded-xl border bg-background px-4 py-3 font-mono text-2xl uppercase tracking-[0.3em]"
                />
              </label>
              <fieldset className="grid grid-cols-2 gap-2">
                <legend className="mb-1.5 font-semibold">¿Cómo pagó?</legend>
                {["efectivo", "nequi", "transferencia", "tarjeta"].map((m, i) => (
                  <label key={m} className="flex items-center gap-2 rounded-xl border px-3 py-2.5 capitalize has-[:checked]:border-primary has-[:checked]:bg-secondary">
                    <input type="radio" name="metodo" value={m} defaultChecked={i === 0} className="accent-[#174C3C]" />
                    {m}
                  </label>
                ))}
              </fieldset>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setModo("nada")} className={`${btn} border`}>
                  Volver
                </button>
                <button name="estado" value="entregada" disabled={enviando} className={`${btn} bg-accent text-accent-foreground`}>
                  Confirmar entrega
                </button>
              </div>
            </>
          )}

          {estado?.error && (
            <p className="text-sm font-semibold text-destructive" role="alert">
              {estado.error}
            </p>
          )}
        </form>
      )}
      {estado?.ok && (
        <p className="mt-3 text-sm font-semibold text-primary" role="status">
          {estado.ok}
        </p>
      )}
    </li>
  );
}
