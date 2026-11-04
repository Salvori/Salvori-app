import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera } from "@/components/cabecera";
import { contextoNegocio } from "../contexto";
import { NavegacionNegocio } from "../navegacion";
import { FormularioPublicar } from "./formulario-publicar";

export const metadata: Metadata = { title: "Publicar oferta" };

async function Contenido({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const { n } = await searchParams;
  const { negocio, negocios } = await contextoNegocio(n);
  return (
    <>
      <NavegacionNegocio actual="/negocio/publicar" negocio={negocio} negocios={negocios} />
      <FormularioPublicar key={negocio.id} negocioId={negocio.id} slug={negocio.slug} negocioNombre={negocio.nombre} />
    </>
  );
}

export default function Publicar(props: PageProps<"/negocio/publicar">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-16">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
          <Contenido searchParams={props.searchParams as Promise<{ n?: string }>} />
        </Suspense>
      </main>
    </div>
  );
}
