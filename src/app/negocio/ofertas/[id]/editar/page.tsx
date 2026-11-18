import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera } from "@/components/cabecera";
import { contextoNegocio } from "../../../contexto";
import { NavegacionNegocio } from "../../../navegacion";
import { ofertaGuardada } from "../../../oferta-guardada";
import { FormularioPublicar } from "../../../publicar/formulario-publicar";

export const metadata: Metadata = { title: "Editar oferta" };

async function Contenido({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ n?: string }> }) {
  const [{ id }, { n }] = await Promise.all([params, searchParams]);
  const { negocio, negocios } = await contextoNegocio(n);
  const oferta = await ofertaGuardada(id, negocio.id);

  return (
    <>
      <NavegacionNegocio actual="/negocio/ofertas" negocio={negocio} negocios={negocios} />
      {!oferta ? (
        <p className="rounded-2xl bg-card p-6 text-center text-muted-foreground shadow-card">No encontramos esta oferta en tu negocio.</p>
      ) : !oferta.vigente ? (
        <div className="rounded-2xl bg-card p-6 text-center shadow-card">
          <p className="text-muted-foreground">Esta oferta ya cerró y no se puede editar.</p>
          <Link href={`/negocio/publicar?n=${negocio.slug}&desde=${id}`} className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground">
            Duplicarla
          </Link>
        </div>
      ) : (
        <>
          <h2 className="mb-4 font-display text-xl font-extrabold text-primary">Editar «{oferta.inicial.titulo}»</h2>
          <FormularioPublicar
            key={id}
            negocioId={negocio.id}
            slug={negocio.slug}
            negocioNombre={negocio.nombre}
            inicial={oferta.inicial}
            edicion={{ ofertaId: id, reservados: oferta.reservados }}
          />
        </>
      )}
    </>
  );
}

export default function EditarOferta(props: PageProps<"/negocio/ofertas/[id]/editar">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-16">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
          <Contenido params={props.params} searchParams={props.searchParams as Promise<{ n?: string }>} />
        </Suspense>
      </main>
    </div>
  );
}
