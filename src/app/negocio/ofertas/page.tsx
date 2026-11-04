import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera } from "@/components/cabecera";
import { formatCOP } from "@/lib/formato";
import { textoVentana, urlFoto } from "@/lib/ofertas";
import { createClient } from "@/lib/supabase/server";
import { instanteActual } from "@/lib/tiempo";
import { cerrarOferta } from "../acciones";
import { contextoNegocio } from "../contexto";
import { NavegacionNegocio } from "../navegacion";

export const metadata: Metadata = { title: "Mis ofertas" };

const ESTADO: Record<string, string> = { activa: "Activa", agotada: "Agotada", cerrada: "Cerrada", borrador: "Borrador" };

async function Lista({ searchParams }: { searchParams: Promise<{ n?: string; publicada?: string }> }) {
  const { n, publicada } = await searchParams;
  const { negocio, negocios } = await contextoNegocio(n);
  const supabase = await createClient();
  const { data } = await supabase
    .from("ofertas")
    .select("id, titulo, foto_url, precio_habitual, precio_final, cupos_total, cupos_disponibles, recogida_desde, recogida_hasta, estado")
    .eq("negocio_id", negocio.id)
    .order("creado_en", { ascending: false })
    .limit(30);
  const ahora = instanteActual();
  const ofertas = (data ?? []).map((o) => ({
    ...o,
    vigente: ["activa", "agotada"].includes(o.estado) && new Date(o.recogida_hasta).getTime() > ahora,
  }));

  return (
    <>
      <NavegacionNegocio actual="/negocio/ofertas" negocio={negocio} negocios={negocios} />
      {publicada && (
        <p className="mb-4 rounded-2xl bg-secondary px-4 py-3 font-semibold text-secondary-foreground" role="status">
          ¡Oferta publicada! Ya la ven los compradores cercanos.
        </p>
      )}
      {ofertas.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 text-center shadow-card">
          <p className="text-muted-foreground">Todavía no has publicado ofertas.</p>
          <Link href={`/negocio/publicar?n=${negocio.slug}`} className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground">
            Publicar la primera
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {ofertas.map((o) => {
            const foto = urlFoto(o.foto_url);
            return (
              <li key={o.id} className={`flex gap-3 rounded-2xl bg-card p-3 shadow-card ${o.vigente ? "" : "opacity-60"}`}>
                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {foto && <Image src={foto} alt="" fill sizes="80px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold text-primary">{o.titulo}</p>
                  <p className="text-sm">
                    {formatCOP(o.precio_final)} <span className="text-muted-foreground line-through">{formatCOP(o.precio_habitual)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.vigente ? ESTADO[o.estado] : "Cerrada"} · {o.cupos_disponibles}/{o.cupos_total} cupos · {textoVentana(o.recogida_desde, o.recogida_hasta)}
                  </p>
                  {o.vigente && (
                    <form action={cerrarOferta} className="mt-1">
                      <input type="hidden" name="ofertaId" value={o.id} />
                      <button className="text-xs font-semibold text-destructive underline underline-offset-4">Cerrar oferta</button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function MisOfertas(props: PageProps<"/negocio/ofertas">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-16">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" />}>
          <Lista searchParams={props.searchParams as Promise<{ n?: string; publicada?: string }>} />
        </Suspense>
      </main>
    </div>
  );
}
