"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Clock, MapPin } from "lucide-react";
import { formatCOP } from "@/lib/formato";
import { demo, hora, useDemo } from "../../almacen";
import { ESTADO_CLIENTE } from "../../estados";
import { Aviso, Cargando, ImagenCombo, NavCliente, useSonido } from "../../ui";

export default function DetallePedido() {
  const { id } = useParams<{ id: string }>();
  const { pedidos, combos, negocios } = useDemo();
  const p = pedidos.find((x) => x.id === id);
  const c = combos.find((x) => x.id === p?.comboId);
  const n = negocios.find((x) => x.id === p?.negocioId);
  const [aviso, setAviso] = useState<string | null>(null);
  const { sonar } = useSonido();
  const previo = useRef(p?.estado);

  // Aviso cuando el negocio confirma o rechaza (aunque sea desde otra pestaña).
  useEffect(() => {
    if (!p) return;
    if (previo.current === "por_confirmar" && p.estado === "confirmado") {
       
      setAviso("¡El negocio confirmó tu reserva! Ya puedes ir a recogerla.");
      sonar();
    } else if (previo.current === "por_confirmar" && p.estado === "rechazado") {
      setAviso("El negocio no pudo atender tu reserva.");
    } else if (previo.current === "confirmado" && p.estado === "entregado") {
      setAviso("¡Listo! Disfruta tu combo.");
    }
    previo.current = p.estado;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.estado]);

  if (!negocios.length) return <Cargando />;
  if (!p || !c || !n)
    return (
      <main className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-muted-foreground">No encontramos este pedido.</p>
        <Link href="/demo/pedidos" className="mt-4 inline-block font-bold text-primary underline">
          Ver mis pedidos
        </Link>
      </main>
    );

  const pasos = [
    { t: "Reservaste", h: p.creadoEn, hecho: true },
    { t: "El negocio confirmó", h: p.confirmadoEn, hecho: ["confirmado", "entregado"].includes(p.estado) },
    { t: "Recogiste tu combo", h: p.entregadoEn, hecho: p.estado === "entregado" },
  ];

  return (
    <>
      <Aviso texto={aviso} onCerrar={() => setAviso(null)} />
      <main className="mx-auto w-full max-w-xl px-4 pb-6 pt-4">
        <Link href="/demo/pedidos" className="text-sm font-semibold text-primary">
          ← Mis pedidos
        </Link>
        <p className="mt-3 text-sm text-muted-foreground">Pedido {p.numero}</p>
        <h1 className="font-display text-2xl font-extrabold text-primary">{c.titulo}</h1>
        <span className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-bold ${ESTADO_CLIENTE[p.estado].clase}`} data-testid="estado">
          {ESTADO_CLIENTE[p.estado].texto}
        </span>

        {p.estado === "confirmado" && p.codigo && (
          <section className="mt-4 rounded-2xl bg-primary px-4 py-6 text-center text-primary-foreground shadow-card">
            <p>Muestra este código en el local</p>
            <p className="mt-2 font-mono text-5xl font-extrabold tracking-[0.25em]" data-testid="codigo">
              {p.codigo}
            </p>
            <p className="mt-2 text-sm opacity-90">
              Recoge entre {p.franja} · paga {formatCOP(p.precioUnitario * p.cantidad)} en {p.pago === "nequi" ? "Nequi" : "efectivo"}
            </p>
          </section>
        )}
        {p.estado === "por_confirmar" && (
          <p className="mt-4 rounded-2xl bg-card p-4 shadow-card">
            ⏳ Le avisamos a <strong>{n.nombre}</strong>. Cuando confirme, aquí aparece tu código para recoger. No vayas todavía.
          </p>
        )}
        {p.estado === "entregado" && (
          <p className="mt-4 rounded-2xl bg-secondary p-4 font-semibold text-secondary-foreground">
            🎉 Ahorraste {formatCOP((p.precioHabitual - p.precioUnitario) * p.cantidad)} en este pedido.
          </p>
        )}
        {p.estado === "rechazado" && p.motivo && <p className="mt-4 rounded-2xl bg-card p-4 shadow-card">Motivo: {p.motivo}</p>}

        <ol className="mt-5 space-y-3 rounded-2xl bg-card p-5 shadow-card" aria-label="Seguimiento">
          {pasos.map((s) => (
            <li key={s.t} className="flex items-center gap-3">
              <span className={`grid size-7 place-items-center rounded-full ${s.hecho ? "bg-primary text-primary-foreground" : "border-2 border-border"}`}>
                {s.hecho && <Check className="size-4" aria-hidden />}
              </span>
              <span className={s.hecho ? "font-semibold" : "text-muted-foreground"}>{s.t}</span>
              {s.hecho && s.h && <span className="ml-auto text-sm text-muted-foreground">{hora(s.h)}</span>}
            </li>
          ))}
        </ol>

        <section className="mt-4 flex gap-3 rounded-2xl bg-card p-4 shadow-card">
          <div className="size-16 shrink-0 overflow-hidden rounded-xl">
            <ImagenCombo combo={c} />
          </div>
          <div className="text-sm">
            <p className="font-semibold">{n.nombre}</p>
            <p className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden /> {n.direccion}
            </p>
            <p className="flex items-center gap-1 text-muted-foreground">
              <Clock className="size-3.5" aria-hidden /> Recoge entre {p.franja}
            </p>
            <p className="mt-1">
              {p.cantidad} × {formatCOP(p.precioUnitario)} = <strong>{formatCOP(p.cantidad * p.precioUnitario)}</strong>
            </p>
          </div>
        </section>

        {p.estado === "por_confirmar" && (
          <button
            type="button"
            onClick={() => confirm("¿Cancelar esta reserva?") && demo.cancelar(p.id)}
            className="mt-5 w-full rounded-full border border-destructive/40 py-3 font-bold text-destructive"
          >
            Cancelar reserva
          </button>
        )}
      </main>
      <NavCliente />
    </>
  );
}
