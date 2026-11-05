"use client";

import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Camera, Clock } from "lucide-react";
import { formatCOP } from "@/lib/formato";
import { descuento } from "@/lib/ofertas";
import { CATEGORIAS, demo, type Categoria } from "../../../almacen";
import { ImagenCombo, NavNegocio } from "../../../ui";

const campo = "w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";

function horaLocal(offsetMin: number) {
  return new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(Date.now() + offsetMin * 60_000));
}

/** Hoy a las HH:mm (Bogotá) → ISO; si la hora de fin es menor que la de inicio, pasa al día siguiente. */
function aIso(hhmm: string, despuesDe?: string): string {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const d = new Date(`${hoy}T${hhmm}:00-05:00`);
  if (despuesDe && d <= new Date(despuesDe)) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

export default function NuevoCombo() {
  const router = useRouter();
  const [categoria, setCategoria] = useState<Categoria>("panaderia");
  const [foto, setFoto] = useState<string | undefined>();
  const [cargandoFoto, setCargandoFoto] = useState(false);
  const [f, setF] = useState({ titulo: "", contenido: "", cupos: "5", precio: "", valor: "", desde: horaLocal(0), hasta: horaLocal(120) });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((v) => ({ ...v, [k]: e.target.value }));

  const precio = Number(f.precio) || 0;
  const valor = Number(f.valor) || 0;
  const pct = precio > 0 && valor > precio ? descuento(precio, valor) : null;

  async function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setCargandoFoto(true);
    try {
      const comprimida = await imageCompression(archivo, { maxSizeMB: 0.15, maxWidthOrHeight: 800, fileType: "image/jpeg" });
      setFoto(await imageCompression.getDataUrlFromFile(comprimida));
    } catch {
      setError("No pudimos leer la foto. Prueba con otra.");
    } finally {
      setCargandoFoto(false);
    }
  }

  const publicar = () => {
    if (f.titulo.trim().length < 3) return setError("Escribe el nombre del combo.");
    if (f.contenido.trim().length < 5) return setError("Cuenta exactamente qué incluye el combo.");
    if (!pct) return setError("El precio Salvori debe ser menor que el valor real.");
    if (!(Number(f.cupos) > 0)) return setError("Indica cuántos combos tienes hoy.");
    const desde = aIso(f.desde);
    const hasta = aIso(f.hasta, desde);
    demo.publicar({
      titulo: f.titulo.trim(),
      contenido: f.contenido.trim(),
      categoria,
      emoji: CATEGORIAS[categoria].emoji,
      foto,
      precioHabitual: valor,
      precioFinal: precio,
      cuposTotal: Number(f.cupos),
      desde,
      hasta,
    });
    router.push("/demo/negocio/combos?publicado=1");
  };

  const vista = { titulo: f.titulo || "Tu combo", emoji: CATEGORIAS[categoria].emoji, foto, categoria };

  return (
    <>
      <main className="mx-auto w-full max-w-xl px-4 pb-8 pt-4">
        <button type="button" onClick={() => router.back()} className="mb-2 flex items-center gap-1 text-sm font-semibold text-primary">
          <ArrowLeft className="size-4" aria-hidden /> Volver
        </button>
        <h1 className="font-display text-2xl font-extrabold text-primary">Subir un combo</h1>
        <p className="text-sm text-muted-foreground">Tan rápido como un estado de WhatsApp: foto, qué incluye, precio y horario.</p>

        <div className="mt-4 space-y-5">
          <label className="relative block aspect-[16/10] cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-card">
            {foto ? (
              <ImagenCombo combo={vista} />
            ) : (
              <span className="flex size-full flex-col items-center justify-center gap-2 text-primary">
                <Camera className="size-9" aria-hidden />
                <span className="font-display font-bold">{cargandoFoto ? "Cargando foto…" : "Tomar o elegir foto"}</span>
                <span className="text-xs text-muted-foreground">Opcional en la demo</span>
              </span>
            )}
            <input type="file" accept="image/*" capture="environment" onChange={elegirFoto} className="sr-only" aria-label="Foto del combo" />
          </label>

          <fieldset>
            <legend className="mb-2 font-semibold">Tipo de producto</legend>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(CATEGORIAS) as Categoria[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={categoria === k}
                  onClick={() => setCategoria(k)}
                  className={`rounded-2xl border-2 px-2 py-2.5 text-xs font-bold ${categoria === k ? "border-primary bg-secondary text-primary" : "border-border bg-card"}`}
                >
                  <span className="block text-2xl" aria-hidden>
                    {CATEGORIAS[k].emoji}
                  </span>
                  {CATEGORIAS[k].texto}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block space-y-1.5">
            <span className="font-semibold">Nombre del combo</span>
            <input value={f.titulo} onChange={set("titulo")} maxLength={60} placeholder="Ej.: Combo 4 pandebonos + café" className={campo} />
          </label>
          <label className="block space-y-1.5">
            <span className="font-semibold">¿Qué incluye exactamente?</span>
            <textarea value={f.contenido} onChange={set("contenido")} maxLength={200} rows={2} placeholder="Ej.: 4 pandebonos de hoy y un café americano" className={campo} />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-1.5">
              <span className="text-sm font-semibold">Cantidad</span>
              <input value={f.cupos} onChange={set("cupos")} type="number" inputMode="numeric" min={1} className={campo} />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-semibold">Precio Salvori</span>
              <input value={f.precio} onChange={set("precio")} type="number" inputMode="numeric" min={0} placeholder="6000" className={campo} />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-semibold">Valor real</span>
              <input value={f.valor} onChange={set("valor")} type="number" inputMode="numeric" min={0} placeholder="10000" className={campo} />
            </label>
          </div>
          <p className={`text-sm font-semibold ${pct ? "text-primary" : "text-muted-foreground"}`} aria-live="polite">
            {pct ? `Descuento de ${pct}%: el cliente ahorra ${formatCOP(valor - precio)}` : "El precio Salvori debe ser menor que el valor real."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1.5">
              <span className="text-sm font-semibold">Recoger desde</span>
              <input type="time" value={f.desde} onChange={set("desde")} className={campo} />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-semibold">Hasta</span>
              <input type="time" value={f.hasta} onChange={set("hasta")} className={campo} />
            </label>
          </div>

          <div className="overflow-hidden rounded-2xl bg-card shadow-card" aria-label="Así lo verán los clientes">
            <p className="px-4 pt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Así lo verán los clientes</p>
            <div className="mt-2 aspect-[16/9]">
              <ImagenCombo combo={vista} />
            </div>
            <div className="p-4">
              <p className="font-display text-lg font-bold text-primary">{vista.titulo}</p>
              <p>
                <strong className="font-display text-xl">{formatCOP(precio)}</strong> <span className="text-sm text-muted-foreground line-through">{formatCOP(valor)}</span>
                {pct && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-extrabold">-{pct}%</span>}
              </p>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="size-4" aria-hidden /> Recoge de {f.desde} a {f.hasta} · quedan {f.cupos}
              </p>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive" role="alert">
              {error}
            </p>
          )}
          <button type="button" onClick={publicar} className="w-full rounded-full bg-accent py-4 font-display text-lg font-extrabold text-accent-foreground shadow-card">
            Publicar combo
          </button>
        </div>
      </main>
      <NavNegocio />
    </>
  );
}
