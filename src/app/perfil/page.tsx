import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Cabecera } from "@/components/cabecera";
import { FormularioInteresados } from "@/components/formulario-interesados";
import { borrarMiInscripcion } from "@/app/interesados/acciones";
import { direccionGuardada } from "@/lib/direccion";
import { formatCOP } from "@/lib/formato";
import { rutaSegura, usuarioActual } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { borrarDireccion } from "./acciones";
import { FormularioDireccion } from "./formulario-direccion";
import { FormularioNombre } from "./formulario-nombre";

export const metadata: Metadata = { title: "Mi perfil" };

async function Perfil({ searchParams }: { searchParams: Promise<{ primera?: string; next?: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar?next=/perfil");
  const { primera, next } = await searchParams;
  const siguiente = next ? rutaSegura(next) : undefined;

  const supabase = await createClient();
  const [{ data: datos }, { data: ahorro }, { count: compras }, direccion, { data: interes }, { data: puntaje }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("ahorro_comprador", { uid: usuario.id }),
    supabase.from("reservas").select("id", { count: "exact", head: true }).eq("comprador_id", usuario.id).eq("estado", "entregada"),
    direccionGuardada(usuario.id),
    // Si la tabla aún no existe en este entorno, se muestra el formulario vacío.
    supabase.from("interesados").select("correo, radio_km, origen_ubicacion").eq("user_id", usuario.id).maybeSingle(),
    supabase.rpc("puntaje_comprador", { uid: usuario.id }),
  ]);
  const cumplimiento = puntaje?.[0];
  const nombre = (datos.user?.user_metadata?.nombre as string | undefined) ?? "";

  return (
    <>
      {primera && (
        <div className="mb-5 rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground" role="status">
          <p className="font-semibold">¡Bienvenido a Salvori! ¿Desde dónde vas a buscar?</p>
          <p className="text-sm">Con tu dirección te mostramos qué tan cerca está cada negocio.</p>
          {siguiente && (
            <Link href={siguiente} className="mt-1 inline-block text-sm font-semibold underline underline-offset-4">
              Ahora no
            </Link>
          )}
        </div>
      )}
      <section className="mb-6 rounded-2xl bg-primary p-6 text-center text-primary-foreground" aria-label="Tu ahorro">
        <p className="text-sm">Has ahorrado</p>
        <p className="font-display text-4xl font-extrabold">{formatCOP(Number(ahorro ?? 0))}</p>
        <p className="mt-1 text-sm text-primary-foreground/85">
          {compras ?? 0} {compras === 1 ? "compra recogida" : "compras recogidas"}
        </p>
      </section>

      <section className="mb-6 rounded-2xl bg-card p-5 shadow-card" aria-labelledby="titulo-cumplimiento">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="titulo-cumplimiento" className="font-display text-lg font-bold text-primary">
            Tu puntaje de cumplimiento
          </h2>
          <p className="font-display text-2xl font-extrabold text-primary">
            {cumplimiento?.cerradas ? `${Number(cumplimiento.puntaje).toFixed(1).replace(".", ",")}/5` : "Nuevo"}
          </p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Sale de tus últimas 10 reservas: recogida = 5, cancelada después de confirmada = 3, no recogida = 1. Los
          negocios lo ven antes de aceptar.
          {cumplimiento?.cerradas && Number(cumplimiento.puntaje) < 3 && cumplimiento.cerradas >= 3
            ? " Mientras esté por debajo de 3, solo puedes tener una reserva activa a la vez."
            : ""}
        </p>
      </section>

      <section className="mb-6 rounded-2xl bg-card p-5 shadow-card">
        <FormularioNombre nombre={nombre} />
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-card" aria-labelledby="titulo-direccion">
        <h2 id="titulo-direccion" className="mb-3 font-display text-lg font-bold text-primary">
          Mi dirección
        </h2>
        <FormularioDireccion inicial={direccion} siguiente={siguiente} />
        {direccion && (
          <form action={borrarDireccion} className="mt-3 text-center">
            <button className="text-sm text-muted-foreground underline underline-offset-4">Borrar mi dirección</button>
          </form>
        )}
      </section>

      <section className="mt-6 rounded-2xl bg-card p-5 shadow-card" aria-labelledby="titulo-avisame">
        <h2 id="titulo-avisame" className="mb-1 font-display text-lg font-bold text-primary">
          Avísame cuando haya combos cerca
        </h2>
        {interes ? (
          <>
            <p className="text-sm" role="status">
              Te avisamos a <strong className="break-all">{interes.correo}</strong> de combos a menos de {interes.radio_km} km
              {interes.origen_ubicacion === "direccion" ? " de tu dirección" : " del punto que elegiste"}. Máximo un correo cada 6 horas.
            </p>
            <form action={borrarMiInscripcion} className="mt-3">
              <button className="text-sm text-muted-foreground underline underline-offset-4">Dejar de recibir avisos</button>
            </form>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">Te escribimos cuando un negocio publique un combo cerca de ti.</p>
            <FormularioInteresados correoInicial={usuario.email ?? ""} direccion={direccion} />
          </>
        )}
      </section>
    </>
  );
}

export default function PaginaPerfil(props: PageProps<"/perfil">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-16 pt-2">
        <h1 className="mb-5 font-display text-3xl font-extrabold text-primary">Mi perfil</h1>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" />}>
          <Perfil searchParams={props.searchParams as Promise<{ primera?: string; next?: string }>} />
        </Suspense>
      </main>
    </div>
  );
}
