import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Cabecera } from "@/components/cabecera";
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
  const [{ data: datos }, { data: ahorro }, { count: compras }, direccion] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("ahorro_comprador", { uid: usuario.id }),
    supabase.from("reservas").select("id", { count: "exact", head: true }).eq("comprador_id", usuario.id).eq("estado", "entregada"),
    direccionGuardada(usuario.id),
  ]);
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
