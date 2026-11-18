import type { Metadata } from "next";
import Link from "next/link";
import { requerirAdmin } from "../../contexto";
import { NavegacionAdmin } from "../../navegacion";
import { FormularioNegocio } from "../formulario-negocio";

export const metadata: Metadata = { title: "Nuevo negocio" };

export default async function NuevoNegocio() {
  await requerirAdmin();
  return (
    <>
      <NavegacionAdmin actual="/admin" />
      <Link href="/admin" className="text-sm font-semibold text-primary underline underline-offset-4">
        ← Negocios
      </Link>
      <h2 className="mb-4 mt-2 font-display text-xl font-extrabold text-primary">Nuevo negocio</h2>
      <FormularioNegocio />
    </>
  );
}
