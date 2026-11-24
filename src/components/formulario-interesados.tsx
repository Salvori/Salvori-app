"use client";

import dynamic from "next/dynamic";
import { useActionState, useState } from "react";
import { BellRing, Crosshair, Home, Map as IconoMapa } from "lucide-react";
import { inscribirInteresado, type EstadoInteres } from "@/app/interesados/acciones";
import { RADIOS_INTERES } from "@/lib/interesados";
import { CENTRO_POPAYAN, type Punto } from "@/lib/ofertas";

const MapaDireccion = dynamic(() => import("@/components/mapa-direccion"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-muted" />,
});

type Origen = "direccion" | "navegador" | "mapa";

const campo = "rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";
const opcion = (activa: boolean) =>
  `flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
    activa ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
  }`;

/** «Avísame cuando haya combos cerca»: correo, autorización de datos, ubicación y radio. */
export function FormularioInteresados({
  correoInicial = "",
  direccion,
}: {
  correoInicial?: string;
  direccion: { direccion: string; lat: number; lng: number } | null;
}) {
  const [estado, accion, enviando] = useActionState<EstadoInteres, FormData>(inscribirInteresado, null);
  const [origen, setOrigen] = useState<Origen | null>(direccion ? "direccion" : null);
  const [punto, setPunto] = useState<Punto | null>(direccion ? { lat: direccion.lat, lng: direccion.lng } : null);
  const [radio, setRadio] = useState<number>(2);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ubicando, setUbicando] = useState(false);

  function elegir(o: Origen) {
    setAviso(null);
    setOrigen(o);
    if (o === "direccion" && direccion) setPunto({ lat: direccion.lat, lng: direccion.lng });
    if (o === "mapa") setPunto((p) => p ?? CENTRO_POPAYAN);
    if (o === "navegador") {
      setPunto(null);
      if (!("geolocation" in navigator)) {
        setAviso("Tu navegador no comparte la ubicación. Elige el punto en el mapa.");
        return;
      }
      setUbicando(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUbicando(false);
          setPunto({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setAviso("Listo, usamos tu ubicación actual.");
        },
        () => {
          setUbicando(false);
          setAviso("No pudimos obtener tu ubicación. Elige el punto en el mapa.");
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
      );
    }
  }

  if (estado?.ok) {
    return (
      <p className="rounded-2xl bg-secondary px-4 py-3 font-semibold text-secondary-foreground" role="status">
        {estado.ok}
      </p>
    );
  }

  return (
    <form action={accion} className="flex flex-col gap-4" aria-label="Avísame cuando haya combos cerca">
      {punto && (
        <>
          <input type="hidden" name="lat" value={punto.lat.toFixed(6)} />
          <input type="hidden" name="lng" value={punto.lng.toFixed(6)} />
        </>
      )}
      {origen && <input type="hidden" name="origen" value={origen} />}
      <input type="hidden" name="radio" value={radio} />

      <label className="flex flex-col gap-1.5 font-semibold">
        Tu correo
        <input name="correo" type="email" required maxLength={254} defaultValue={correoInicial} autoComplete="email" placeholder="tucorreo@ejemplo.com" className={campo} />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 font-semibold">¿Desde dónde?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {direccion && (
            <button type="button" className={opcion(origen === "direccion")} aria-pressed={origen === "direccion"} onClick={() => elegir("direccion")}>
              <Home className="size-4" aria-hidden /> Mi dirección
            </button>
          )}
          <button type="button" className={opcion(origen === "navegador")} aria-pressed={origen === "navegador"} onClick={() => elegir("navegador")}>
            <Crosshair className="size-4" aria-hidden /> {ubicando ? "Ubicando…" : "Mi ubicación"}
          </button>
          <button type="button" className={opcion(origen === "mapa")} aria-pressed={origen === "mapa"} onClick={() => elegir("mapa")}>
            <IconoMapa className="size-4" aria-hidden /> Punto en el mapa
          </button>
        </div>
        {origen === "direccion" && direccion && <p className="text-sm text-muted-foreground">Desde {direccion.direccion}.</p>}
        {aviso && (
          <p className="text-sm font-semibold text-primary" role="status">
            {aviso}
          </p>
        )}
        {origen === "mapa" && punto && (
          <>
            <p className="text-sm text-muted-foreground">Toca el mapa o arrastra el pin hasta el lugar.</p>
            <MapaDireccion punto={punto} onMover={setPunto} />
          </>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 font-semibold">¿A qué distancia?</legend>
        <div className="grid grid-cols-3 gap-2">
          {RADIOS_INTERES.map((r) => (
            <button key={r} type="button" className={opcion(radio === r)} aria-pressed={radio === r} onClick={() => setRadio(r)}>
              {r} km
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="autoriza" required className="mt-0.5 size-5 shrink-0 accent-primary" />
        <span>
          Autorizo a Salvori a tratar mi correo y mi ubicación para avisarme de combos cercanos, según la{" "}
          <a href="/privacidad" className="font-semibold underline underline-offset-4">
            política de tratamiento de datos
          </a>{" "}
          (Ley 1581 de 2012). Puedo darme de baja desde cualquier correo.
        </span>
      </label>

      {estado?.error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive" role="alert">
          {estado.error}
        </p>
      )}
      <button
        disabled={enviando || !punto || !origen}
        className="flex items-center justify-center gap-2 rounded-full bg-accent py-3 font-display text-lg font-extrabold text-accent-foreground disabled:opacity-50"
      >
        <BellRing className="size-5" aria-hidden /> {enviando ? "Guardando…" : "Avísame"}
      </button>
      {!punto && <p className="-mt-2 text-center text-xs text-muted-foreground">Elige desde dónde te avisamos.</p>}
    </form>
  );
}
