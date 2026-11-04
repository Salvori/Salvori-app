"use client";

import imageCompression from "browser-image-compression";
import { useActionState, useMemo, useState } from "react";
import { Camera, ChevronLeft, Clock, ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCOP } from "@/lib/formato";
import { CATEGORIA_LABEL, descuento } from "@/lib/ofertas";
import { publicarOferta, type EstadoPublicar } from "./acciones";

const campo = "rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";
const etiqueta = "flex flex-col gap-1.5 font-semibold";

function horaBogota(offsetMin = 0): string {
  const d = new Date(Date.now() + offsetMin * 60_000);
  return new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
}

export function FormularioPublicar({ negocioId, slug, negocioNombre }: { negocioId: string; slug: string; negocioNombre: string }) {
  const [estado, accion, enviando] = useActionState<EstadoPublicar, FormData>(publicarOferta, null);
  const [paso, setPaso] = useState(1);
  const [foto, setFoto] = useState<{ ruta: string; vista: string } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [f, setF] = useState({
    tipo: "comercial" as "comercial" | "lote",
    titulo: "",
    contenido: "",
    categoria: "panaderia_pasteleria",
    precioHabitual: "",
    precioFinal: "",
    cupos: "5",
    desde: horaBogota(),
    hasta: horaBogota(120),
    preparacion: "10",
    elaborado: horaBogota(-60),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }));

  const habitual = Number(f.precioHabitual) || 0;
  const final = Number(f.precioFinal) || 0;
  const pct = habitual > 0 && final > 0 && final < habitual ? descuento(final, habitual) : null;

  const paso2Listo = f.titulo.trim().length >= 3 && f.contenido.trim().length >= 5 && pct !== null && Number(f.cupos) >= 1;

  async function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setErrorFoto(null);
    setSubiendo(true);
    try {
      const comprimida = await imageCompression(archivo, {
        maxSizeMB: 0.4,
        maxWidthOrHeight: 1280,
        fileType: "image/webp",
        useWebWorker: true,
      });
      const ruta = `${negocioId}/${crypto.randomUUID()}.webp`;
      const { error } = await createClient().storage.from("ofertas").upload(ruta, comprimida, {
        contentType: "image/webp",
        upsert: false,
      });
      if (error) throw error;
      setFoto({ ruta, vista: URL.createObjectURL(comprimida) });
    } catch {
      setErrorFoto("No pudimos subir la foto. Intenta con otra o revisa tu conexión.");
    } finally {
      setSubiendo(false);
    }
  }

  const pasos = useMemo(() => ["Foto", "Qué es y precio", "Horario"], []);

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="negocioId" value={negocioId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="foto" value={foto?.ruta ?? ""} />
      {Object.entries(f).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      <ol className="grid grid-cols-3 gap-2 text-center text-xs font-bold" aria-label="Pasos">
        {pasos.map((p, i) => (
          <li
            key={p}
            aria-current={paso === i + 1 ? "step" : undefined}
            className={`rounded-full py-1.5 ${paso >= i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {i + 1}. {p}
          </li>
        ))}
      </ol>

      {paso === 1 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-extrabold text-primary">Toma una foto real</h2>
          <label className="relative grid aspect-[4/3] cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-card">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto.vista} alt="Foto de la oferta" className="absolute inset-0 size-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2 text-primary">
                {subiendo ? <ImagePlus className="size-10 animate-pulse" /> : <Camera className="size-10" aria-hidden />}
                <span className="font-display font-bold">{subiendo ? "Subiendo…" : "Tomar o elegir foto"}</span>
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={elegirFoto}
              className="sr-only"
              aria-label="Foto de la oferta"
              data-testid="foto"
            />
          </label>
          {errorFoto && (
            <p className="text-sm font-semibold text-destructive" role="alert">
              {errorFoto}
            </p>
          )}
          <button
            type="button"
            disabled={!foto || subiendo}
            onClick={() => setPaso(2)}
            className="rounded-full bg-primary py-3 font-display text-lg font-bold text-primary-foreground disabled:opacity-40"
          >
            Siguiente
          </button>
        </section>
      )}

      {paso === 2 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-extrabold text-primary">Qué es y cuánto cuesta</h2>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de oferta">
            {(
              [
                ["comercial", "Promoción o combo"],
                ["lote", "Producto del día"],
              ] as const
            ).map(([v, t]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={f.tipo === v}
                onClick={() => setF((x) => ({ ...x, tipo: v }))}
                className={`rounded-2xl border-2 px-3 py-3 text-sm font-bold ${f.tipo === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <label className={etiqueta}>
            Título
            <input value={f.titulo} onChange={set("titulo")} maxLength={80} placeholder="Ej.: Combo 6 panes de bono" className={campo} />
          </label>
          <label className={etiqueta}>
            Qué recibe exactamente
            <textarea value={f.contenido} onChange={set("contenido")} maxLength={500} rows={3} placeholder="Ej.: 6 panes de bono medianos horneados hoy" className={campo} />
          </label>
          <label className={etiqueta}>
            Categoría
            <select value={f.categoria} onChange={set("categoria")} className={campo}>
              {Object.entries(CATEGORIA_LABEL).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={etiqueta}>
              Precio habitual
              <input value={f.precioHabitual} onChange={set("precioHabitual")} inputMode="numeric" type="number" min={0} placeholder="9000" className={campo} />
            </label>
            <label className={etiqueta}>
              Precio Salvori
              <input value={f.precioFinal} onChange={set("precioFinal")} inputMode="numeric" type="number" min={0} placeholder="6000" className={campo} />
            </label>
          </div>
          <p className={`text-sm font-semibold ${pct !== null ? "text-primary" : "text-muted-foreground"}`} aria-live="polite">
            {pct !== null ? `Descuento: ${pct}% · el comprador ahorra ${formatCOP(habitual - final)}` : "El precio Salvori debe ser menor que el habitual."}
          </p>
          <label className={etiqueta}>
            Cupos disponibles
            <input value={f.cupos} onChange={set("cupos")} inputMode="numeric" type="number" min={1} max={200} className={campo} />
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setPaso(1)} className="flex items-center gap-1 rounded-full border px-4 py-3 font-bold">
              <ChevronLeft className="size-4" aria-hidden /> Atrás
            </button>
            <button
              type="button"
              disabled={!paso2Listo}
              onClick={() => setPaso(3)}
              className="flex-1 rounded-full bg-primary py-3 font-display text-lg font-bold text-primary-foreground disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </section>
      )}

      {paso === 3 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-extrabold text-primary">Cuándo se recoge</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className={etiqueta}>
              Desde
              <input type="time" value={f.desde} onChange={set("desde")} className={campo} />
            </label>
            <label className={etiqueta}>
              Hasta
              <input type="time" value={f.hasta} onChange={set("hasta")} className={campo} />
            </label>
          </div>
          {f.tipo === "comercial" ? (
            <label className={etiqueta}>
              Minutos de preparación después de confirmar
              <input type="number" min={0} max={240} value={f.preparacion} onChange={set("preparacion")} className={campo} />
            </label>
          ) : (
            <label className={etiqueta}>
              Elaborado hoy a las
              <input type="time" value={f.elaborado} onChange={set("elaborado")} className={campo} />
            </label>
          )}

          {/* Vista previa de la tarjeta */}
          <div className="overflow-hidden rounded-2xl bg-card shadow-card" aria-label="Vista previa">
            <div className="relative aspect-[4/3] bg-muted">
              {foto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={foto.vista} alt="" className="size-full object-cover" />
              )}
              {pct !== null && (
                <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-0.5 font-display text-sm font-extrabold text-accent-foreground">
                  -{pct}%
                </span>
              )}
            </div>
            <div className="p-4">
              <p className="font-display text-lg font-bold text-primary">{f.titulo || "Título"}</p>
              <p className="text-sm text-muted-foreground">{negocioNombre}</p>
              <p className="mt-2">
                <span className="font-display text-xl font-extrabold">{formatCOP(final)}</span>{" "}
                <span className="text-sm text-muted-foreground line-through">{formatCOP(habitual)}</span>
              </p>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="size-4" aria-hidden /> Recoge de {f.desde} a {f.hasta} · Quedan {f.cupos}
              </p>
            </div>
          </div>

          {estado?.error && (
            <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive" role="alert">
              {estado.error}
            </p>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={() => setPaso(2)} className="flex items-center gap-1 rounded-full border px-4 py-3 font-bold">
              <ChevronLeft className="size-4" aria-hidden /> Atrás
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex-1 rounded-full bg-accent py-3 font-display text-lg font-extrabold text-accent-foreground disabled:opacity-50"
            >
              {enviando ? "Publicando…" : "Publicar oferta"}
            </button>
          </div>
        </section>
      )}
    </form>
  );
}
