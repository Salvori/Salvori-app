import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIA_LABEL } from "@/lib/ofertas";
import { createClient } from "@/lib/supabase/server";
import { requerirAdmin } from "./contexto";
import { NavegacionAdmin } from "./navegacion";

export const metadata: Metadata = { title: "Negocios" };

export default async function AdminNegocios() {
  await requerirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("negocios")
    .select("id, nombre, slug, categoria, direccion, telefono_whatsapp, activo, es_prueba")
    .order("es_prueba")
    .order("nombre");
  if (error) throw new Error("No pudimos cargar los negocios.");
  const negocios = data ?? [];
  const { count: interesados } = await supabase.from("interesados").select("id", { count: "exact", head: true });

  return (
    <>
      <NavegacionAdmin actual="/admin" />
      <p className="mb-4 rounded-2xl bg-card p-4 shadow-card">
        <span className="font-display text-2xl font-extrabold text-primary">{interesados ?? "—"}</span>{" "}
        <span className="text-muted-foreground">interesados en «Avísame cuando haya combos cerca»</span>
      </p>
      <Link href="/admin/negocios/nuevo" className="mb-4 block rounded-full bg-accent py-3 text-center font-display text-lg font-extrabold text-accent-foreground">
        Nuevo negocio
      </Link>
      {negocios.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-muted-foreground shadow-card">Todavía no hay negocios. Crea el primero.</p>
      ) : (
        <ul className="space-y-3">
          {negocios.map((n) => (
            <li key={n.id} className={`rounded-2xl bg-card p-4 shadow-card ${n.activo ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-lg font-bold text-primary">{n.nombre}</p>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                  {!n.activo ? "Inactivo" : n.es_prueba ? "Prueba" : "Activo"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {CATEGORIA_LABEL[n.categoria] ?? n.categoria} · {n.direccion || "Sin dirección"}
                {n.telefono_whatsapp ? "" : " · Sin WhatsApp"}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-5 text-sm font-semibold text-primary">
                <Link href={`/admin/negocios/${n.id}`} className="inline-block py-2 underline underline-offset-4">
                  Editar y usuarios
                </Link>
                <Link href={`/admin/publicar?n=${n.slug}`} className="inline-block py-2 underline underline-offset-4">
                  Publicar por él
                </Link>
                <Link href={`/admin/reservas?n=${n.slug}`} className="inline-block py-2 underline underline-offset-4">
                  Reservas
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
