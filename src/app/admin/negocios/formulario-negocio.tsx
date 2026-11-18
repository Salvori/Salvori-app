"use client";

import dynamic from "next/dynamic";
import { useActionState, useState } from "react";
import { Navigation } from "lucide-react";
import { CATEGORIA_LABEL, CENTRO_POPAYAN } from "@/lib/ofertas";
import { slugify } from "@/lib/texto";
import { guardarNegocio, type EstadoAdmin } from "../acciones";

const SelectorMapa = dynamic(() => import("@/components/selector-mapa"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-muted" />,
});

const campo = "rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";
const etiqueta = "flex flex-col gap-1.5 font-semibold";

export type NegocioEditable = {
  id: string;
  nombre: string;
  slug: string;
  categoria: string;
  descripcion: string;
  direccion: string;
  lat: number;
  lng: number;
  horario: string;
  telefono: string;
  activo: boolean;
  esPrueba: boolean;
};

export function FormularioNegocio({ negocio }: { negocio?: NegocioEditable }) {
  const [estado, accion, enviando] = useActionState<EstadoAdmin, FormData>(guardarNegocio, null);
  const [nombre, setNombre] = useState(negocio?.nombre ?? "");
  // Texto en los campos (se puede escribir «-76.» a medias); el mapa usa el número.
  const [coord, setCoord] = useState({ lat: String(negocio?.lat ?? CENTRO_POPAYAN.lat), lng: String(negocio?.lng ?? CENTRO_POPAYAN.lng) });
  const setPunto = (p: { lat: number; lng: number }) => setCoord({ lat: p.lat.toFixed(6), lng: p.lng.toFixed(6) });
  const punto = { lat: Number(coord.lat) || CENTRO_POPAYAN.lat, lng: Number(coord.lng) || CENTRO_POPAYAN.lng };
  const [gps, setGps] = useState<"nada" | "buscando" | "lista" | "denegada">("nada");

  function usarUbicacion() {
    if (!navigator.geolocation) return setGps("denegada");
    setGps("buscando");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPunto({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGps("lista");
      },
      () => setGps("denegada"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <form action={accion} className="flex flex-col gap-4">
      {negocio && <input type="hidden" name="id" value={negocio.id} />}
      <label className={etiqueta}>
        Nombre del negocio
        <input name="nombre" required maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Panadería El Morro" className={campo} />
      </label>
      <p className="-mt-2 text-sm text-muted-foreground">
        Enlace: <span className="font-mono">/n/{negocio?.slug ?? (slugify(nombre) || "…")}</span>
        {negocio ? " (no cambia al editar)" : " (se crea solo con el nombre)"}
      </p>
      <label className={etiqueta}>
        Categoría
        <select name="categoria" defaultValue={negocio?.categoria ?? "panaderia_pasteleria"} className={campo}>
          {Object.entries(CATEGORIA_LABEL).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className={etiqueta}>
        Descripción corta
        <textarea name="descripcion" maxLength={300} rows={2} defaultValue={negocio?.descripcion ?? ""} className={campo} />
      </label>
      <label className={etiqueta}>
        Dirección
        <input name="direccion" required maxLength={160} defaultValue={negocio?.direccion ?? ""} placeholder="Ej.: Cra. 6 # 4-21, Centro" className={campo} />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 font-semibold">Ubicación en el mapa</legend>
        <button type="button" onClick={usarUbicacion} className="flex items-center justify-center gap-2 rounded-full border border-primary px-4 py-3 font-bold text-primary">
          <Navigation className="size-4" aria-hidden /> {gps === "buscando" ? "Buscando…" : "Usar mi ubicación actual"}
        </button>
        {gps === "denegada" && (
          <p className="text-sm text-destructive" role="alert">
            No pudimos leer tu ubicación. Toca el mapa o escribe las coordenadas.
          </p>
        )}
        <SelectorMapa key={`${punto.lat},${punto.lng}`} valor={punto} onElegir={setPunto} />
        <div className="grid grid-cols-2 gap-3">
          <label className={etiqueta}>
            Latitud
            <input name="lat" required inputMode="decimal" value={coord.lat} onChange={(e) => setCoord((v) => ({ ...v, lat: e.target.value }))} className={campo} />
          </label>
          <label className={etiqueta}>
            Longitud
            <input name="lng" required inputMode="decimal" value={coord.lng} onChange={(e) => setCoord((v) => ({ ...v, lng: e.target.value }))} className={campo} />
          </label>
        </div>
      </fieldset>

      <label className={etiqueta}>
        Horario de atención
        <textarea name="horario" rows={2} maxLength={500} defaultValue={negocio?.horario ?? ""} placeholder={"lun-sab: 07:00-19:00\ndom: 08:00-13:00"} className={campo} />
        <span className="text-sm font-normal text-muted-foreground">Una línea por tramo: días, dos puntos y horas.</span>
      </label>
      <label className={etiqueta}>
        WhatsApp del negocio
        <input name="telefono" inputMode="tel" maxLength={30} defaultValue={negocio?.telefono ?? ""} placeholder="300 123 4567" className={campo} />
      </label>
      <label className="flex items-center gap-3 font-semibold">
        <input type="checkbox" name="activo" defaultChecked={negocio?.activo ?? true} className="size-5 accent-[#174C3C]" />
        Activo (sus ofertas se pueden reservar)
      </label>
      <label className="flex items-center gap-3 font-semibold">
        <input type="checkbox" name="esPrueba" defaultChecked={negocio?.esPrueba ?? false} className="size-5 accent-[#174C3C]" />
        Negocio de prueba (no sale en el catálogo público)
      </label>

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
      <button disabled={enviando} className="rounded-full bg-primary py-3 font-display text-lg font-bold text-primary-foreground disabled:opacity-50">
        {enviando ? "Guardando…" : negocio ? "Guardar cambios" : "Crear negocio"}
      </button>
    </form>
  );
}
