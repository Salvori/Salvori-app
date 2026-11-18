"use client";

import dynamic from "next/dynamic";
import { useActionState, useState, useTransition } from "react";
import { MapPin, Search } from "lucide-react";
import { CENTRO_POPAYAN, type Punto } from "@/lib/ofertas";
import { buscarDireccion, guardarDireccion, type EstadoPerfil } from "./acciones";

const MapaDireccion = dynamic(() => import("@/components/mapa-direccion"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-muted" />,
});

const campo = "rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function FormularioDireccion({
  inicial,
  siguiente,
}: {
  inicial: { direccion: string; lat: number; lng: number } | null;
  siguiente?: string;
}) {
  const [estado, accion, guardando] = useActionState<EstadoPerfil, FormData>(guardarDireccion, null);
  const [direccion, setDireccion] = useState(inicial?.direccion ?? "");
  const [punto, setPunto] = useState<Punto>(inicial ? { lat: inicial.lat, lng: inicial.lng } : CENTRO_POPAYAN);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [buscando, iniciarBusqueda] = useTransition();

  function buscar() {
    iniciarBusqueda(async () => {
      const r = await buscarDireccion(direccion);
      if ("punto" in r) {
        setPunto(r.punto);
        setAviso({ tipo: "ok", texto: "La ubicamos. Si el pin no quedó en tu casa, arrástralo o toca el lugar correcto." });
      } else {
        setAviso({ tipo: "error", texto: r.error });
      }
    });
  }

  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="lat" value={punto.lat.toFixed(6)} />
      <input type="hidden" name="lng" value={punto.lng.toFixed(6)} />
      {siguiente && <input type="hidden" name="siguiente" value={siguiente} />}
      <label className="flex flex-col gap-1.5 font-semibold">
        Tu dirección en Popayán
        <input
          name="direccion"
          required
          maxLength={200}
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              buscar();
            }
          }}
          autoComplete="street-address"
          placeholder="Ej.: Calle 5 # 9-25, barrio Centro"
          className={campo}
        />
      </label>
      <button
        type="button"
        onClick={buscar}
        disabled={buscando || direccion.trim().length < 3}
        className="flex items-center justify-center gap-2 rounded-full border border-primary py-3 font-display font-bold text-primary disabled:opacity-50"
      >
        <Search className="size-4" aria-hidden /> {buscando ? "Buscando…" : "Ubicar en el mapa"}
      </button>
      {aviso && (
        <p className={`text-sm font-semibold ${aviso.tipo === "ok" ? "text-primary" : "text-mandarina-texto"}`} role={aviso.tipo === "ok" ? "status" : "alert"}>
          {aviso.texto}
        </p>
      )}
      <MapaDireccion punto={punto} onMover={setPunto} />
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="size-4" aria-hidden /> Solo tú ves tu dirección. Los negocios nunca la ven.
      </p>
      {estado?.error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive" role="alert">
          {estado.error}
        </p>
      )}
      {estado?.ok && (
        <p className="rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground" role="status">
          {estado.ok}
        </p>
      )}
      <button disabled={guardando} className="rounded-full bg-primary py-3 font-display text-lg font-bold text-primary-foreground disabled:opacity-50">
        {guardando ? "Guardando…" : "Guardar dirección"}
      </button>
    </form>
  );
}
