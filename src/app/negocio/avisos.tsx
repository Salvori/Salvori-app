"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BellRing } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Escucha los eventos del negocio (Realtime + RLS de eventos) y avisa de reservas nuevas:
// sonido, vibración, título de la pestaña y notificación del navegador si se permitió.
export function AvisosNegocio({ negocioId, pendientes }: { negocioId: string; pendientes: number }) {
  const router = useRouter();
  const audio = useRef<AudioContext | null>(null);
  const [sonidoListo, setSonidoListo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    document.title = pendientes > 0 ? `(${pendientes}) Reservas · Salvori` : "Reservas · Salvori";
  }, [pendientes]);

  useEffect(() => {
    const supabase = createClient();
    let activo = true;
    const canal = supabase.channel(`eventos-${negocioId}-${crypto.randomUUID()}`);

    const sonar = () => {
      const ctx = audio.current;
      if (!ctx) return;
      [880, 1175].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = f;
        g.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.16);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.18);
        o.stop(ctx.currentTime + i * 0.18 + 0.17);
      });
    };

    (async () => {
      await supabase.realtime.setAuth();
      if (!activo) return;
      canal
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "eventos", filter: `negocio_id=eq.${negocioId}` },
          (p) => {
            const tipo = (p.new as { tipo?: string }).tipo;
            if (tipo === "reserva_solicitada") {
              setAviso("¡Nueva reserva! Confírmala para que el comprador venga.");
              sonar();
              navigator.vibrate?.([200, 100, 200]);
              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                new Notification("Nueva reserva en Salvori", { body: "Entra a confirmarla." });
              }
            } else if (tipo === "reserva_cancelada") {
              setAviso("Un comprador canceló su reserva.");
            }
            router.refresh();
          },
        )
        .subscribe();
    })();

    const respaldo = window.setInterval(() => router.refresh(), 20_000);
    return () => {
      activo = false;
      window.clearInterval(respaldo);
      supabase.removeChannel(canal);
    };
  }, [negocioId, router]);

  const activarSonido = async () => {
    audio.current ??= new AudioContext();
    await audio.current.resume();
    setSonidoListo(true);
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {}
    }
  };

  return (
    <div className="mb-4 space-y-2">
      {!sonidoListo && (
        <button
          type="button"
          onClick={activarSonido}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-primary bg-card py-2.5 font-bold text-primary"
        >
          <BellRing className="size-4" aria-hidden /> Activar aviso sonoro de reservas
        </button>
      )}
      {aviso && (
        <p className="flex items-center justify-between gap-2 rounded-2xl bg-accent px-4 py-3 font-bold text-accent-foreground" role="alert">
          {aviso}
          <button type="button" onClick={() => setAviso(null)} className="text-sm underline">
            Ok
          </button>
        </p>
      )}
    </div>
  );
}
