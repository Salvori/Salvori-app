import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera } from "@/components/cabecera";
import { FormularioBaja } from "./formulario-baja";

export const metadata: Metadata = { title: "Dejar de recibir avisos", robots: { index: false } };

// La baja pide un clic: los lectores de correo que abren enlaces solos no dan de baja a nadie.
async function Contenido({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return <FormularioBaja token={t ?? ""} />;
}

export default function PaginaBaja(props: PageProps<"/baja">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-16 pt-4">
        <h1 className="mb-3 font-display text-3xl font-extrabold text-primary">Avisos de combos cerca</h1>
        <Suspense fallback={<div className="h-24 animate-pulse rounded-2xl bg-muted" />}>
          <Contenido searchParams={props.searchParams as Promise<{ t?: string }>} />
        </Suspense>
      </main>
    </div>
  );
}
