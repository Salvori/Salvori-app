import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera } from "@/components/cabecera";
import { formatHora } from "@/lib/formato";
import { urlFoto } from "@/lib/ofertas";
import { createClient } from "@/lib/supabase/server";
import { instanteActual } from "@/lib/tiempo";
import { contextoNegocio } from "../contexto";
import { NavegacionNegocio } from "../navegacion";
import { FormularioPublicar, type OfertaInicial } from "./formulario-publicar";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** «Duplicar»: la oferta anterior del mismo negocio como punto de partida (RLS: solo las propias). */
async function ofertaInicial(id: string | undefined, negocioId: string): Promise<OfertaInicial | undefined> {
  if (!id || !UUID.test(id)) return undefined;
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("ofertas")
    .select("titulo, contenido, categoria, foto_url, precio_habitual, precio_final, cupos_total, recogida_desde, recogida_hasta, tiempo_preparacion_min")
    .eq("id", id)
    .eq("negocio_id", negocioId)
    .maybeSingle();
  const vista = urlFoto(o?.foto_url);
  if (!o || !vista) return undefined;
  // Misma franja horaria si todavía no terminó hoy; si no, la de siempre (ahora a 2 horas).
  const finHoy = new Date(o.recogida_hasta).getTime() > instanteActual();
  return {
    foto: { ruta: o.foto_url, vista },
    titulo: o.titulo,
    contenido: o.contenido,
    categoria: o.categoria,
    precioHabitual: String(o.precio_habitual),
    precioFinal: String(o.precio_final),
    cupos: String(o.cupos_total),
    ...(finHoy ? { desde: formatHora(o.recogida_desde), hasta: formatHora(o.recogida_hasta) } : {}),
    preparacion: String(o.tiempo_preparacion_min ?? 10),
  };
}

export const metadata: Metadata = { title: "Publicar oferta" };

async function Contenido({ searchParams }: { searchParams: Promise<{ n?: string; desde?: string }> }) {
  const { n, desde } = await searchParams;
  const { negocio, negocios } = await contextoNegocio(n);
  const inicial = await ofertaInicial(desde, negocio.id);
  return (
    <>
      <NavegacionNegocio actual="/negocio/publicar" negocio={negocio} negocios={negocios} />
      {inicial && (
        <p className="mb-4 rounded-2xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground" role="status">
          Copia de «{inicial.titulo}»: revisa la foto, el precio y el horario, y publícala.
        </p>
      )}
      <FormularioPublicar
        key={`${negocio.id}-${desde ?? ""}`}
        negocioId={negocio.id}
        slug={negocio.slug}
        negocioNombre={negocio.nombre}
        inicial={inicial}
      />
    </>
  );
}

export default function Publicar(props: PageProps<"/negocio/publicar">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-16">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
          <Contenido searchParams={props.searchParams as Promise<{ n?: string; desde?: string }>} />
        </Suspense>
      </main>
    </div>
  );
}
