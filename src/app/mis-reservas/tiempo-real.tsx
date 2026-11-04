"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Escucha los cambios de las reservas del comprador y refresca la página.
// Realtime respeta RLS: solo llegan las reservas propias.
// Respaldo: si hay reservas en curso, refresca cada 20 s por si el socket se cae.
export function TiempoReal({ compradorId, hayEnCurso }: { compradorId: string; hayEnCurso: boolean }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let activo = true;
    // Nombre único: en desarrollo React monta dos veces y un canal recién cerrado no se puede reutilizar.
    const canal = supabase.channel(`reservas-${compradorId}-${crypto.randomUUID()}`);

    (async () => {
      await supabase.realtime.setAuth(); // usa el token de la sesión (cookies), no el anónimo
      if (!activo) return;
      canal
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reservas", filter: `comprador_id=eq.${compradorId}` },
          () => router.refresh(),
        )
        .subscribe();
    })();

    const alVolver = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", alVolver);
    const respaldo = hayEnCurso ? window.setInterval(() => router.refresh(), 20_000) : undefined;

    return () => {
      activo = false;
      document.removeEventListener("visibilitychange", alVolver);
      if (respaldo) window.clearInterval(respaldo);
      supabase.removeChannel(canal);
    };
  }, [compradorId, hayEnCurso, router]);

  return null;
}
