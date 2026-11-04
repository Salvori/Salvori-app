import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Cabecera } from "@/components/cabecera";
import { rutaSegura, usuarioActual } from "@/lib/sesion";
import { FormularioEntrar } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

async function Contenido({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const siguiente = rutaSegura(next);
  if (await usuarioActual()) redirect(siguiente);

  return (
    <>
      {error && (
        <p className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive" role="alert">
          El enlace no es válido o ya venció. Pide uno nuevo.
        </p>
      )}
      <FormularioEntrar siguiente={siguiente} />
    </>
  );
}

export default function Entrar(props: PageProps<"/entrar">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-12 pt-4">
        <h1 className="font-display text-3xl font-extrabold text-primary">Entra con tu correo</h1>
        <p className="mb-6 mt-2 text-muted-foreground">Te enviamos un enlace para reservar y seguir tus reservas.</p>
        <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-muted" />}>
          <Contenido searchParams={props.searchParams as Promise<{ next?: string; error?: string }>} />
        </Suspense>
      </main>
    </div>
  );
}
