import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChefHat, Clock, MapPin, Star, Store } from "lucide-react";
import { Cabecera } from "@/components/cabecera";
import { LogoNegocio } from "@/components/logo-negocio";
import { etiquetaFormato } from "@/lib/esquema-oferta";
import { COOKIE_ORIGEN, origenValido } from "@/lib/origen";
import { formatCOP, formatHora } from "@/lib/formato";
import { CATEGORIA_LABEL, descuento, textoDisponibles, textoVentana, urlFoto } from "@/lib/ofertas";
import { usuarioActual } from "@/lib/sesion";
import { clientePublico } from "@/lib/supabase/publico";
import { FormularioReserva } from "./formulario-reserva";

export const metadata: Metadata = { title: "Oferta" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function textoHorario(horario: unknown): string | null {
  if (!horario || typeof horario !== "object") return null;
  const partes = Object.entries(horario as Record<string, unknown>).map(([d, h]) => `${d}: ${String(h)}`);
  return partes.length ? partes.join(" · ") : null;
}

async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();
  const db = clientePublico();
  if (!db || !UUID.test(id)) notFound();

  const { data: o } = await db
    .from("ofertas")
    .select(
      "id, tipo, formato, tamano, lleva, paga, titulo, contenido, categoria, foto_url, precio_habitual, precio_final, cupos_disponibles, recogida_desde, recogida_hasta, tiempo_preparacion_min, elaborado_en, estado, negocio:negocios(id, nombre, slug, logo_url, direccion, horario)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!o || !o.negocio) notFound();

  const origen = origenValido((await cookies()).get(COOKIE_ORIGEN)?.value);
  const [usuario, calificaciones] = await Promise.all([
    usuarioActual(),
    db.rpc("calificaciones_negocio", { negocio_id: o.negocio.id }).then((r) => r.data ?? []),
    db.rpc("registrar_vista", { oferta_id: o.id, origen }).then(() => null),
  ]);

  const foto = urlFoto(o.foto_url);
  const agotada = o.estado === "agotada" || o.cupos_disponibles <= 0;
  const promedio = calificaciones.length
    ? calificaciones.reduce((s, c) => s + (c.calidad + c.aseo + c.atencion) / 3, 0) / calificaciones.length
    : null;
  const horario = textoHorario(o.negocio.horario);

  return (
    <article>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted md:aspect-[16/9]">
        {foto && <Image src={foto} alt={o.titulo} fill priority sizes="(min-width: 768px) 720px, 100vw" className="object-cover" />}
        <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
          {etiquetaFormato(o.formato, o.lleva, o.paga)}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 font-display font-extrabold text-accent-foreground">
          -{descuento(o.precio_final, o.precio_habitual)}%
        </span>
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {CATEGORIA_LABEL[o.categoria] ?? o.categoria}
      </p>
      <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight text-primary">{o.titulo}</h1>
      {o.tamano && <p className="mt-1 font-semibold text-foreground/80">Tamaño: {o.tamano}</p>}
      <p className="mt-3 flex flex-wrap items-center gap-2 text-muted-foreground">
        <Link href={`/n/${o.negocio.slug}`} className="flex items-center gap-2 font-semibold text-foreground hover:text-primary">
          <LogoNegocio nombre={o.negocio.nombre} logo={o.negocio.logo_url} tamano="md" />
          {o.negocio.nombre}
        </Link>
        {promedio !== null ? (
          <span className="ml-2 flex items-center gap-1 font-semibold text-foreground">
            <Star className="size-4 fill-accent text-accent" aria-hidden />
            {promedio.toFixed(1).replace(".", ",")}
            <span className="font-normal text-muted-foreground">({calificaciones.length})</span>
          </span>
        ) : (
          <span className="ml-2 text-xs font-semibold text-primary">Nuevo en Salvori</span>
        )}
      </p>

      <div className="mt-4 flex items-baseline gap-3">
        <span className="font-display text-3xl font-extrabold">{formatCOP(o.precio_final)}</span>
        <span className="text-muted-foreground line-through">{formatCOP(o.precio_habitual)}</span>
      </div>
      <p className="mt-1 font-semibold text-mandarina-texto">{agotada ? "Agotada" : textoDisponibles(o.cupos_disponibles, o.formato)}</p>

      <section className="mt-5 rounded-2xl bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold text-primary">Qué recibes</h2>
        <p className="mt-1 whitespace-pre-line">{o.contenido}</p>
        {o.formato === "lleva_paga" && o.lleva && o.paga && (
          <p className="mt-2 rounded-xl bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">
            Cada paquete trae {o.lleva} unidades y pagas {o.paga}: {formatCOP(Math.round(o.precio_final / o.paga))} por unidad.
          </p>
        )}
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" aria-hidden />
            {textoVentana(o.recogida_desde, o.recogida_hasta)}
          </li>
          {o.tipo === "lote" && o.elaborado_en ? (
            <li className="flex items-center gap-2">
              <ChefHat className="size-4 shrink-0" aria-hidden />
              Elaborado hoy a las {formatHora(o.elaborado_en)}
            </li>
          ) : o.tiempo_preparacion_min ? (
            <li className="flex items-center gap-2">
              <ChefHat className="size-4 shrink-0" aria-hidden />
              Listo en {o.tiempo_preparacion_min} min después de confirmar
            </li>
          ) : null}
          {o.negocio.direccion && (
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" aria-hidden />
              {o.negocio.direccion}
            </li>
          )}
          {horario && (
            <li className="flex items-center gap-2">
              <Store className="size-4 shrink-0" aria-hidden />
              Horario: {horario}
            </li>
          )}
          <li>
            <Link href={`/n/${o.negocio.slug}`} className="font-semibold text-primary underline underline-offset-4">
              Ver más de {o.negocio.nombre}
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-5 rounded-2xl bg-card p-5 shadow-card">
        {agotada ? (
          <p className="text-center font-display font-bold text-muted-foreground">Esta oferta se agotó.</p>
        ) : (
          <FormularioReserva
            ofertaId={o.id}
            precioFinal={o.precio_final}
            precioHabitual={o.precio_habitual}
            cupos={o.cupos_disponibles}
            porPaquetes={o.formato === "lleva_paga"}
            conSesion={Boolean(usuario)}
          />
        )}
      </section>

      {calificaciones.length > 0 && (
        <section className="mt-5">
          <h2 className="font-display text-lg font-bold text-primary">Lo que dicen los compradores</h2>
          <ul className="mt-3 space-y-3">
            {calificaciones.slice(0, 5).map((c, i) => (
              <li key={i} className="rounded-2xl bg-card p-4 text-sm shadow-card">
                <p className="font-semibold">
                  Calidad {c.calidad} · Aseo {c.aseo} · Atención {c.atencion}
                </p>
                {c.comentario && <p className="mt-1 text-muted-foreground">{c.comentario}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

export default function PaginaOferta(props: PageProps<"/oferta/[id]">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-16 pt-2">
        <Suspense fallback={<div className="aspect-[4/3] animate-pulse rounded-2xl bg-muted" />}>
          <Ficha params={props.params} />
        </Suspense>
      </main>
    </div>
  );
}
