"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MI_NEGOCIO, useDemo } from "../almacen";
import { useSonido } from "../ui";

// Avisa al negocio cuando entra una reserva nueva: sonido, vibración y aviso arriba.
export function VigiaReservas() {
  const { pedidos, negocios } = useDemo();
  const { sonar } = useSonido();
  const conocidos = useRef<Set<string> | null>(null);
  const [nueva, setNueva] = useState<{ id: string; texto: string } | null>(null);

  useEffect(() => {
    if (!negocios.length) return;
    const actuales = pedidos.filter((p) => p.negocioId === MI_NEGOCIO && p.estado === "por_confirmar");
    if (conocidos.current) {
      const llegada = actuales.find((p) => !conocidos.current!.has(p.id));
      if (llegada) {
         
        setNueva({ id: llegada.id, texto: `🔔 ¡Nueva reserva! ${llegada.cliente} reservó ${llegada.cantidad} combo${llegada.cantidad > 1 ? "s" : ""}.` });
        sonar();
      }
    }
    conocidos.current = new Set(actuales.map((p) => p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidos, negocios.length]);

  useEffect(() => {
    document.title = (() => {
      const n = pedidos.filter((p) => p.negocioId === MI_NEGOCIO && p.estado === "por_confirmar").length;
      return n ? `(${n}) Reservas nuevas · Salvori` : "Mi negocio · Salvori";
    })();
  }, [pedidos]);

  useEffect(() => {
    if (!nueva) return;
    const t = setTimeout(() => setNueva(null), 8000);
    return () => clearTimeout(t);
  }, [nueva]);

  if (!nueva) return null;
  return (
    <div className="fixed inset-x-0 top-10 z-30 mx-auto w-[calc(100%-2rem)] max-w-md" role="alert">
      <Link
        href="/demo/negocio/pedidos"
        onClick={() => setNueva(null)}
        className="block rounded-2xl bg-accent px-4 py-3 font-display font-bold text-accent-foreground shadow-card"
      >
        {nueva.texto} <span className="underline">Confirmar ahora</span>
      </Link>
    </div>
  );
}
