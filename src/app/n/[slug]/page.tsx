import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Clock, MapPin, Star } from "lucide-react";
import { Cabecera } from "@/components/cabecera";
import { LogoNegocio } from "@/components/logo-negocio";
import { MapaNegocioDinamico } from "@/components/mapa-negocio-dinamico";
import { TarjetaOferta } from "@/components/tarjeta-oferta";
import type { OfertaTarjeta } from "@/lib/catalogo";
import { CATEGORIA_LABEL, faltanCoordenadas, urlFoto } from "@/lib/ofertas";
import { clientePublico } from "@/lib/supabase/publico";
import { horarioATexto } from "@/lib/texto";
import { MarcarOrigen } from "./marcar-origen";

export const metadata: Metadata = { title: "Negocio" };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function Ficha({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection();
  const db = clientePublico();
  if (!db || !SLUG.test(slug)) notFound();

  // RLS: solo negocios activos y que no son de prueba.
  const { data: n } = await db
    .from("negocios")
    .select("id, nombre, slug, categoria, descripcion, direccion, lat, lng, horario, foto_portada, logo_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!n) notFound();

  const [{ data: filas }, { data: resumen }] = await Promise.all([
    db
      .from("ofertas")
      .select("id, titulo, categoria, formato, tamano, lleva, paga, foto_url, precio_habitual, precio_final, cupos_disponibles, recogida_desde, recogida_hasta, estado")
      .eq("negocio_id", n.id)
      .in("estado", ["activa", "agotada"])
      .gte("recogida_hasta", new Date().toISOString())
      .order("recogida_hasta"),
    db.rpc("resumen_calificaciones", { negocio_ids: [n.id] }),
  ]);
  const cal = resumen?.[0] ? { promedio: Number(resumen[0].promedio), total: resumen[0].total } : null;
  const negocio = { id: n.id, nombre: n.nombre, slug: n.slug, lat: n.lat, lng: n.lng, logo_url: n.logo_url };
  const ofertas: OfertaTarjeta[] = (filas ?? []).map((o) => ({ ...o, negocio, calificacion: cal }));
  const portada = urlFoto(n.foto_portada);
  const horario = horarioATexto(n.horario);

  return (
    <article>
      <MarcarOrigen slug={n.slug} />
      <div className="relative">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-primary">
          {portada ? (
            <Image src={portada} alt={`Portada de ${n.nombre}`} fill priority sizes="(min-width: 768px) 720px, 100vw" className="object-cover" />
          ) : (
            <div className="grid size-full place-items-center">
              <LogoNegocio nombre={n.nombre} logo={n.logo_url} tamano="lg" className="size-28 border-4 border-background text-5xl" />
            </div>
          )}
        </div>
        {portada && (
          <LogoNegocio nombre={n.nombre} logo={n.logo_url} tamano="lg" className="absolute -bottom-8 left-5 border-4 border-background" />
        )}
      </div>

      <header className={portada ? "mt-10" : "mt-5"}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{CATEGORIA_LABEL[n.categoria] ?? n.categoria}</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight text-primary">{n.nombre}</h1>
        <p className="mt-1 flex items-center gap-1.5">
          {cal ? (
            <>
              <Star className="size-4 fill-accent text-accent" aria-hidden />
              <span className="font-semibold">{cal.promedio.toFixed(1).replace(".", ",")}</span>
              <span className="text-muted-foreground">({cal.total} {cal.total === 1 ? "calificación" : "calificaciones"})</span>
            </>
          ) : (
            <span className="text-sm font-semibold text-primary">Nuevo en Salvori</span>
          )}
        </p>
        {n.descripcion && <p className="mt-3 text-muted-foreground">{n.descripcion}</p>}
      </header>

      <section className="mt-5 rounded-2xl bg-card p-5 shadow-card" aria-label="Dónde y cuándo">
        <ul className="space-y-2 text-sm">
          {n.direccion && (
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              {n.direccion}
            </li>
          )}
          {horario && (
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span className="whitespace-pre-line">{horario}</span>
            </li>
          )}
        </ul>
        {!faltanCoordenadas(n) && (
          <div className="mt-4">
            <MapaNegocioDinamico lat={n.lat} lng={n.lng} nombre={n.nombre} direccion={n.direccion} />
          </div>
        )}
      </section>

      <section className="mt-8" aria-labelledby="titulo-ofertas-negocio">
        <h2 id="titulo-ofertas-negocio" className="font-display text-xl font-extrabold text-primary">
          Ofertas de hoy
        </h2>
        {ofertas.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-card p-6 text-center text-muted-foreground shadow-card">
            {n.nombre} no tiene ofertas activas en este momento. Vuelve más tarde.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {ofertas.map((o, i) => (
              <TarjetaOferta key={o.id} oferta={o} km={0} prioridad={i === 0 && !portada} sinDistancia />
            ))}
          </div>
        )}
      </section>
    </article>
  );
}

export default function PaginaNegocio(props: PageProps<"/n/[slug]">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 pt-2">
        <Suspense fallback={<div className="aspect-[16/9] animate-pulse rounded-2xl bg-muted" />}>
          <Ficha params={props.params} />
        </Suspense>
      </main>
    </div>
  );
}
