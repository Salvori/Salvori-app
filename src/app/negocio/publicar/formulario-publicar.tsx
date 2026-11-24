"use client";

import imageCompression from "browser-image-compression";
import { useActionState, useMemo, useState } from "react";
import { Camera, ChevronLeft, Clock, ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCOP } from "@/lib/formato";
import { etiquetaFormato, FORMATO_LABEL, FORMATOS, preciosLlevaPaga, type Formato } from "@/lib/esquema-oferta";
import { CATEGORIA_LABEL, descuento, textoDescuento } from "@/lib/ofertas";
import { editarOferta, publicarOferta, type EstadoPublicar } from "./acciones";

const campo = "rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";
const etiqueta = "flex flex-col gap-1.5 font-semibold";

function horaBogota(offsetMin = 0): string {
  const d = new Date(Date.now() + offsetMin * 60_000);
  return new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
}

/** Datos de una oferta anterior para publicarla de nuevo («Duplicar»). */
export type OfertaInicial = {
  foto: { ruta: string; vista: string };
  formato?: Formato;
  titulo: string;
  contenido: string;
  tamano?: string;
  categoria: string;
  precioHabitual: string;
  precioFinal: string;
  precioUnitario?: string;
  lleva?: string;
  paga?: string;
  cupos: string;
  desde?: string;
  hasta?: string;
  preparacion: string;
};

export function FormularioPublicar({
  negocioId,
  slug,
  negocioNombre,
  destino = "negocio",
  inicial,
  edicion,
}: {
  negocioId: string;
  slug: string;
  negocioNombre: string;
  destino?: "negocio" | "admin";
  inicial?: OfertaInicial;
  /** Editar una oferta vigente en vez de publicar una nueva. */
  edicion?: { ofertaId: string; reservados: number };
}) {
  const [estado, accion, enviando] = useActionState<EstadoPublicar, FormData>(edicion ? editarOferta : publicarOferta, null);
  const minimoCupos = Math.max(1, edicion?.reservados ?? 0);
  const [paso, setPaso] = useState(1);
  const [foto, setFoto] = useState<{ ruta: string; vista: string } | null>(inicial?.foto ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [f, setF] = useState({
    formato: (inicial?.formato ?? "combo") as Formato,
    titulo: inicial?.titulo ?? "",
    contenido: inicial?.contenido ?? "",
    tamano: inicial?.tamano ?? "",
    categoria: inicial?.categoria ?? "panaderia_pasteleria",
    precioHabitual: inicial?.precioHabitual ?? "",
    precioFinal: inicial?.precioFinal ?? "",
    precioUnitario: inicial?.precioUnitario ?? "",
    lleva: inicial?.lleva ?? "3",
    paga: inicial?.paga ?? "2",
    cupos: inicial?.cupos ?? "5",
    desde: inicial?.desde ?? horaBogota(),
    hasta: inicial?.hasta ?? horaBogota(120),
    preparacion: inicial?.preparacion ?? "10",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }));

  const llevaPaga = f.formato === "lleva_paga";
  const nLleva = Math.trunc(Number(f.lleva)) || 0;
  const nPaga = Math.trunc(Number(f.paga)) || 0;
  const unitario = Math.trunc(Number(f.precioUnitario)) || 0;
  const llevaPagaValido = nLleva >= 2 && nLleva <= 20 && nPaga >= 1 && nPaga < nLleva && unitario >= 100;
  const calculado = llevaPagaValido ? preciosLlevaPaga(unitario, nLleva, nPaga) : null;
  const habitual = llevaPaga ? (calculado?.precioHabitual ?? 0) : Number(f.precioHabitual) || 0;
  const final = llevaPaga ? (calculado?.precioFinal ?? 0) : Number(f.precioFinal) || 0;
  const unidad = llevaPaga
    ? { varias: "paquetes", reservada: "paquete reservado", reservadas: "paquetes reservados" }
    : { varias: "unidades", reservada: "unidad reservada", reservadas: "unidades reservadas" };
  const pct = habitual > 0 && final > 0 && final < habitual ? descuento(final, habitual) : null;

  const paso2Listo = f.titulo.trim().length >= 3 && f.contenido.trim().length >= 5 && pct !== null && Number(f.cupos) >= minimoCupos;

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
      <input type="hidden" name="destino" value={destino} />
      {edicion && <input type="hidden" name="ofertaId" value={edicion.ofertaId} />}
      <input type="hidden" name="foto" value={foto?.ruta ?? ""} />
      {Object.entries(f)
        .filter(([k]) => (llevaPaga ? !["precioHabitual", "precioFinal"].includes(k) : !["precioUnitario", "lleva", "paga"].includes(k)))
        .map(([k, v]) => (
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
          <h2 className="font-display text-xl font-extrabold text-primary">Tu promoción o combo</h2>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Etiqueta de la oferta">
            {FORMATOS.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={f.formato === v}
                onClick={() => setF((x) => ({ ...x, formato: v }))}
                className={`rounded-2xl border-2 px-3 py-3 text-sm font-bold ${f.formato === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
              >
                {FORMATO_LABEL[v]}
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
            Tamaño o gramaje (opcional)
            <input value={f.tamano} onChange={set("tamano")} maxLength={40} placeholder="Ej.: 500 g, personal, familiar 8 porciones" className={campo} />
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
          {llevaPaga ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <label className={etiqueta}>
                  Lleva
                  <input value={f.lleva} onChange={set("lleva")} inputMode="numeric" type="number" min={2} max={20} className={campo} />
                </label>
                <label className={etiqueta}>
                  Paga
                  <input value={f.paga} onChange={set("paga")} inputMode="numeric" type="number" min={1} max={19} className={campo} />
                </label>
                <label className={etiqueta}>
                  Precio por unidad
                  <input value={f.precioUnitario} onChange={set("precioUnitario")} inputMode="numeric" type="number" min={0} placeholder="3000" className={campo} />
                </label>
              </div>
              <p className={`text-sm font-semibold ${calculado ? "text-primary" : "text-muted-foreground"}`} aria-live="polite" data-testid="calculo-lleva-paga">
                {calculado
                  ? `${etiquetaFormato("lleva_paga", nLleva, nPaga)}: el paquete vale ${formatCOP(calculado.precioHabitual)} y se paga ${formatCOP(calculado.precioFinal)}.`
                  : "«Paga» debe ser menor que «lleva» (máximo 20) y el precio por unidad al menos $ 100."}
              </p>
            </>
          ) : (
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
          )}
          <p className={`text-sm font-semibold ${pct !== null ? "text-primary" : "text-muted-foreground"}`} aria-live="polite">
            {pct !== null
              ? `Descuento: ${pct}% · el comprador ahorra ${formatCOP(habitual - final)}${llevaPaga ? " por paquete" : ""}`
              : llevaPaga
                ? "Completa lleva, paga y el precio por unidad."
                : "El precio Salvori debe ser menor que el habitual."}
          </p>
          <label className={etiqueta}>
            {llevaPaga ? "Paquetes disponibles" : "Unidades disponibles"}
            <input value={f.cupos} onChange={set("cupos")} inputMode="numeric" type="number" min={minimoCupos} max={200} className={campo} />
          </label>
          {edicion && edicion.reservados > 0 && (
            <p className="-mt-2 text-sm text-muted-foreground">
              Ya hay {edicion.reservados} {edicion.reservados === 1 ? unidad.reservada : unidad.reservadas}: no puedes dejar menos. Las reservas hechas
              conservan su precio.
            </p>
          )}
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
          <label className={etiqueta}>
            Minutos de preparación después de confirmar
            <input type="number" min={0} max={240} value={f.preparacion} onChange={set("preparacion")} className={campo} />
          </label>

          {/* Vista previa de la tarjeta */}
          <div className="overflow-hidden rounded-2xl bg-card shadow-card" aria-label="Vista previa">
            <div className="relative aspect-[4/3] bg-muted">
              {foto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={foto.vista} alt="" className="size-full object-cover" />
              )}
              <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-primary-foreground">
                {etiquetaFormato(f.formato, nLleva, nPaga)}
              </span>
              {pct !== null && (
                <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-0.5 font-display text-sm font-extrabold text-accent-foreground">
                  {textoDescuento(final, habitual)}
                </span>
              )}
            </div>
            <div className="p-4">
              <p className="font-display text-lg font-bold text-primary">{f.titulo || "Título"}</p>
              {f.tamano.trim() && <p className="text-sm font-semibold">{f.tamano.trim()}</p>}
              <p className="text-sm text-muted-foreground">{negocioNombre}</p>
              <p className="mt-2">
                <span className="font-display text-xl font-extrabold">{formatCOP(final)}</span>{" "}
                <span className="text-sm text-muted-foreground line-through">{formatCOP(habitual)}</span>
              </p>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="size-4" aria-hidden /> Recoge de {f.desde} a {f.hasta} · {Math.max(0, Number(f.cupos) - (edicion?.reservados ?? 0))} {unidad.varias} disponibles
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
              {edicion ? (enviando ? "Guardando…" : "Guardar cambios") : enviando ? "Publicando…" : "Publicar oferta"}
            </button>
          </div>
        </section>
      )}
    </form>
  );
}
