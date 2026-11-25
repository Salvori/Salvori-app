"use client";

import { useEffect } from "react";
import { medirUnaVez, type DatosEvento, type EventoMedicion } from "@/lib/medicion";

/** Mide un evento al montar, una sola vez por `clave` en la pestaña. No pinta nada. */
export function MedirEvento({ clave, evento, datos }: { clave: string; evento: EventoMedicion; datos: DatosEvento }) {
  const json = JSON.stringify(datos);
  useEffect(() => {
    medirUnaVez(clave, evento, JSON.parse(json) as DatosEvento);
  }, [clave, evento, json]);
  return null;
}
