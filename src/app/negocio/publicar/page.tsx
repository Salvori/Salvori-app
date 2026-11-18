import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera } from "@/components/cabecera";
import { contextoNegocio } from "../contexto";
import { NavegacionNegocio } from "../navegacion";
import { ofertaGuardada } from "../oferta-guardada";
import { FormularioPublicar } from "./formulario-publicar";

export const metadata: Metadata = { title: "Publicar oferta" };

async function Contenido({ searchParams }: { searchParams: Promise<{ n?: string; desde?: string }> }) {
  const { n, desde } = await searchParams;
  const { negocio, negocios } = await contextoNegocio(n);
  const inicial = (await ofertaGuardada(desde, negocio.id))?.inicial;
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
