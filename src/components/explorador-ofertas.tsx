"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { House, List, Map as MapaIcono, MapPin, Navigation } from "lucide-react";
import { TarjetaOferta } from "@/components/tarjeta-oferta";
import type { OfertaTarjeta } from "@/lib/catalogo";
import { CENTRO_POPAYAN, RADIOS_KM, distanciaKm, ordenarCercanas, type Punto, type RadioKm } from "@/lib/ofertas";

const MapaOfertas = dynamic(() => import("@/components/mapa-ofertas"), {
  ssr: false,
  loading: () => <div className="h-[28rem] w-full animate-pulse rounded-2xl bg-muted" />,
});

type Estado = "centro" | "buscando" | "gps" | "manual" | "denegada" | "direccion";
type Direccion = { direccion: string; lat: number; lng: number };
const CLAVE = "salvori-ubicacion";

function leerGuardada(): { punto: Punto; estado: Estado; radio: RadioKm } | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? "null");
    if (v && typeof v.lat === "number" && typeof v.lng === "number") {
      return { punto: { lat: v.lat, lng: v.lng }, estado: v.estado === "gps" ? "gps" : "manual", radio: RADIOS_KM.includes(v.radio) ? v.radio : 3 };
    }
  } catch {}
  return null;
}

export function ExploradorOfertas({
  ofertas,
  direccion = null,
  pedirDireccion = false,
}: {
  ofertas: OfertaTarjeta[];
  /** Dirección guardada del comprador: origen de las distancias si existe. */
  direccion?: Direccion | null;
  /** Hay sesión pero aún no guardó su dirección. */
  pedirDireccion?: boolean;
}) {
  const desdeDireccion = direccion ? { lat: direccion.lat, lng: direccion.lng } : null;
  const [punto, setPunto] = useState<Punto>(desdeDireccion ?? CENTRO_POPAYAN);
  const [estado, setEstado] = useState<Estado>(desdeDireccion ? "direccion" : "centro");
  const [radio, setRadio] = useState<RadioKm>(3);
  const [vista, setVista] = useState<"lista" | "mapa">("lista");

  // La portada conserva su estado entre navegaciones (Next guarda la ruta anterior):
  // cuando cambia la dirección guardada, vuelve a tomarla como origen.
  const dLat = direccion?.lat;
  const dLng = direccion?.lng;
  useEffect(() => {
    const g = leerGuardada();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (g) setRadio(g.radio);
    if (dLat !== undefined && dLng !== undefined) {
      setPunto({ lat: dLat, lng: dLng });
      setEstado("direccion");
    } else if (g) {
      // Sin dirección guardada: la última ubicación elegida en este dispositivo.
      setPunto(g.punto);
      setEstado(g.estado);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [dLat, dLng]);

  useEffect(() => {
    if (estado !== "gps" && estado !== "manual") return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ ...punto, estado, radio }));
    } catch {}
  }, [punto, estado, radio]);

  const usarUbicacion = () => {
    if (!navigator.geolocation) return setEstado("denegada");
    setEstado("buscando");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPunto({ lat: p.coords.latitude, lng: p.coords.longitude });
        setEstado("gps");
      },
      () => setEstado("denegada"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const cercanas = useMemo(
    () =>
      ordenarCercanas(
        ofertas.map((o) => ({ ...o, km: distanciaKm(punto, o.negocio) })).filter((o) => o.km <= radio),
      ),
    [ofertas, punto, radio],
  );

  const aviso = {
    direccion: `Distancias en línea recta desde tu dirección: ${direccion?.direccion ?? ""}.`,
    gps: "Mostrando ofertas según tu ubicación actual.",
    manual: "Mostrando ofertas alrededor del punto que elegiste.",
    denegada: "No pudimos acceder a tu ubicación. Mostrando el centro de Popayán.",
    buscando: "Buscando tu ubicación…",
    centro: "Mostrando el centro de Popayán.",
  }[estado];

  return (
    <>
      <div className="mx-auto max-w-5xl px-5 pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={usarUbicacion}
            disabled={estado === "buscando"}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-display font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            <Navigation className="size-4" aria-hidden />
            {estado === "buscando" ? "Buscando…" : estado === "gps" ? "Actualizar ubicación" : "Usar mi ubicación"}
          </button>
          {direccion && estado !== "direccion" && (
            <button
              type="button"
              onClick={() => {
                setPunto({ lat: direccion.lat, lng: direccion.lng });
                setEstado("direccion");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card px-5 py-2.5 font-display font-bold text-primary transition-colors hover:bg-secondary"
            >
              <House className="size-4" aria-hidden />
              Usar mi dirección
            </button>
          )}
          <div className="flex rounded-full border bg-card p-1" role="group" aria-label="Vista">
            {(
              [
                ["lista", "Lista", List],
                ["mapa", "Mapa", MapaIcono],
              ] as const
            ).map(([v, texto, Icono]) => (
              <button
                key={v}
                type="button"
                onClick={() => setVista(v)}
                aria-pressed={vista === v}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  vista === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icono className="size-4" aria-hidden />
                {texto}
              </button>
            ))}
          </div>
          <div className="flex rounded-full border bg-card p-1" role="group" aria-label="Radio de búsqueda">
            {RADIOS_KM.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadio(r)}
                aria-pressed={radio === r}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  radio === r ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
          <MapPin className="size-4 shrink-0" aria-hidden />
          {aviso}
        </p>
        {pedirDireccion && (
          <p className="mt-3 rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
            <Link href="/perfil?next=/" className="font-semibold underline underline-offset-4">
              Guarda tu dirección
            </Link>{" "}
            para ver qué tan cerca de tu casa está cada combo.
          </p>
        )}
        {vista === "mapa" && (
          <div className="mt-4">
            <p className="mb-2 text-sm text-muted-foreground">Toca un pin para ver sus combos, o toca el mapa para buscar desde otro punto.</p>
            <MapaOfertas
              ofertas={cercanas}
              punto={punto}
              radio={radio}
              onElegir={(p) => {
                setPunto(p);
                setEstado("manual");
              }}
            />
          </div>
        )}
      </div>

      <section className="bg-primary py-12" aria-labelledby="titulo-ofertas">
        <div className="mx-auto max-w-5xl px-5">
          <h2 id="titulo-ofertas" className="font-display text-2xl font-extrabold text-primary-foreground md:text-3xl">
            {cercanas.length} {cercanas.length === 1 ? "oferta cerca" : "ofertas cerca"}
          </h2>
          {cercanas.length === 0 && (
            <p className="mt-4 text-primary-foreground/85">
              {ofertas.length === 0
                ? "Por ahora no hay ofertas publicadas. Vuelve pronto."
                : "No hay ofertas en este radio. Prueba ampliarlo."}
            </p>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cercanas.map((o, i) => (
              <TarjetaOferta key={o.id} oferta={o} km={o.km} prioridad={i === 0} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
