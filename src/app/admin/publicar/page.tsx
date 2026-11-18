import type { Metadata } from "next";
import Link from "next/link";
import { FormularioPublicar } from "@/app/negocio/publicar/formulario-publicar";
import { negociosOperables } from "@/lib/roles";
import { requerirAdmin } from "../contexto";
import { NavegacionAdmin } from "../navegacion";

export const metadata: Metadata = { title: "Publicar por un negocio" };

export default async function AdminPublicar(props: PageProps<"/admin/publicar">) {
  const usuario = await requerirAdmin();
  const { n, publicada } = (await props.searchParams) as { n?: string; publicada?: string };
  const negocios = await negociosOperables(true, usuario.id);
  const negocio = negocios.find((x) => x.slug === n);

  return (
    <>
      <NavegacionAdmin actual="/admin/publicar" />
      {publicada && negocio && (
        <p className="mb-4 rounded-2xl bg-secondary px-4 py-3 font-semibold text-secondary-foreground" role="status">
          ¡Oferta publicada a nombre de {negocio.nombre}!{" "}
          <Link href={`/negocio/ofertas?n=${negocio.slug}`} className="underline underline-offset-4">
            Ver sus ofertas
          </Link>
        </p>
      )}
      {negocios.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-muted-foreground shadow-card">
          Primero crea un negocio en la pestaña Negocios.
        </p>
      ) : (
        <>
          <form action="/admin/publicar" className="mb-5 flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-card">
            <label htmlFor="negocio-publicar" className="font-semibold">
              ¿A nombre de qué negocio publicas?
            </label>
            <div className="flex gap-2">
              <select id="negocio-publicar" name="n" defaultValue={negocio?.slug ?? ""} required className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-3">
                <option value="" disabled>
                  Elige un negocio
                </option>
                {negocios.map((x) => (
                  <option key={x.id} value={x.slug}>
                    {x.nombre}
                    {x.es_prueba ? " (prueba)" : ""}
                  </option>
                ))}
              </select>
              <button className="rounded-full bg-primary px-5 font-bold text-primary-foreground">Elegir</button>
            </div>
          </form>
          {negocio ? (
            <FormularioPublicar key={`${negocio.id}-${publicada ?? ""}`} negocioId={negocio.id} slug={negocio.slug} negocioNombre={negocio.nombre} destino="admin" />
          ) : (
            <p className="text-center text-muted-foreground">Elige el negocio para empezar: foto, promoción y horario.</p>
          )}
        </>
      )}
    </>
  );
}
