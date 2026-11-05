"use client";

import { useState } from "react";
import { formatCOP } from "@/lib/formato";
import { instanteActual } from "@/lib/tiempo";
import { demo, hora, useDemo, type Pedido } from "../almacen";
import { ESTADO_NEGOCIO } from "../estados";

const btn = "rounded-full py-3 font-display font-bold";

export function TarjetaPedido({ p }: { p: Pedido }) {
  const { combos } = useDemo();
  const c = combos.find((x) => x.id === p.comboId);
  const [modo, setModo] = useState<"nada" | "rechazar" | "entregar">("nada");
  const [motivo, setMotivo] = useState("");
  const [cod, setCod] = useState("");
  const [error, setError] = useState<string | null>(null);
  const minutos = Math.max(0, Math.round((instanteActual() - new Date(p.creadoEn).getTime()) / 60000));

  const entregar = () => {
    if (cod.trim().length !== 6) return setError("Escribe el código de 6 caracteres que muestra el cliente.");
    if (!demo.entregar(p.id, cod)) return setError("El código no coincide. Pídeselo de nuevo al cliente.");
    setError(null);
    setModo("nada");
  };

  return (
    <li className={`rounded-2xl bg-card p-4 shadow-card ${p.estado === "por_confirmar" ? "ring-2 ring-accent" : ""}`} data-pedido={p.numero} data-estado={p.estado}>
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${ESTADO_NEGOCIO[p.estado].clase}`}>{ESTADO_NEGOCIO[p.estado].texto}</span>
        <span className="text-xs text-muted-foreground">{minutos < 1 ? "hace un momento" : `hace ${minutos} min`}</span>
      </div>
      <p className="mt-2 font-display text-lg font-bold text-primary">
        #{p.numero} · {p.cliente}
      </p>
      <p className="text-sm">
        {p.cantidad} × {c?.titulo ?? "Combo"} · <strong>{formatCOP(p.cantidad * p.precioUnitario)}</strong>
      </p>
      <p className="text-sm text-muted-foreground">
        Recoge {p.franja} · paga en {p.pago === "nequi" ? "Nequi" : "efectivo"}
      </p>
      {p.observaciones && <p className="mt-1 rounded-xl bg-muted px-3 py-2 text-sm">«{p.observaciones}»</p>}
      {p.estado === "entregado" && p.entregadoEn && <p className="mt-1 text-sm text-muted-foreground">Entregado a las {hora(p.entregadoEn)}</p>}
      {p.estado === "rechazado" && p.motivo && <p className="mt-1 text-sm text-muted-foreground">Motivo: {p.motivo}</p>}

      {p.estado === "por_confirmar" && modo === "nada" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => demo.confirmar(p.id)} className={`${btn} bg-primary text-primary-foreground`}>
            Confirmar
          </button>
          <button type="button" onClick={() => setModo("rechazar")} className={`${btn} border border-destructive/40 text-destructive`}>
            No puedo
          </button>
        </div>
      )}
      {modo === "rechazar" && (
        <div className="mt-3 space-y-2">
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (ej.: se acabó el producto)" className="w-full rounded-xl border bg-background px-4 py-3" />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setModo("nada")} className={`${btn} border`}>
              Volver
            </button>
            <button type="button" disabled={!motivo.trim()} onClick={() => demo.rechazar(p.id, motivo.trim())} className={`${btn} bg-destructive text-white disabled:opacity-50`}>
              Rechazar
            </button>
          </div>
        </div>
      )}

      {p.estado === "confirmado" && modo === "nada" && (
        <button type="button" onClick={() => setModo("entregar")} className={`${btn} mt-3 w-full bg-accent text-accent-foreground`}>
          Entregar pedido
        </button>
      )}
      {modo === "entregar" && (
        <div className="mt-3 space-y-2">
          <label className="flex flex-col gap-1.5 font-semibold">
            Código que te muestra el cliente
            <input
              value={cod}
              onChange={(e) => setCod(e.target.value.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="ABC123"
              className="rounded-xl border bg-background px-4 py-3 text-center font-mono text-2xl tracking-[0.3em]"
            />
          </label>
          {error && (
            <p className="text-sm font-semibold text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setModo("nada")} className={`${btn} border`}>
              Volver
            </button>
            <button type="button" onClick={entregar} className={`${btn} bg-primary text-primary-foreground`}>
              Lo entregué ✓
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
