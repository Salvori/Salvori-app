import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clienteServicio } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { horarioATexto } from "@/lib/texto";
import { desvincularUsuario } from "../../acciones";
import { requerirAdmin } from "../../contexto";
import { NavegacionAdmin } from "../../navegacion";
import { FormularioNegocio } from "../formulario-negocio";
import { VincularUsuario } from "./vincular-usuario";

export const metadata: Metadata = { title: "Editar negocio" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditarNegocio(props: PageProps<"/admin/negocios/[id]">) {
  await requerirAdmin();
  const { id } = await props.params;
  const { creado } = (await props.searchParams) as { creado?: string };
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data: n } = await supabase
    .from("negocios")
    .select("id, nombre, slug, categoria, descripcion, direccion, lat, lng, horario, telefono_whatsapp, activo, es_prueba")
    .eq("id", id)
    .maybeSingle();
  if (!n) notFound();

  // Correos de los operadores: solo en el servidor, con la service_role, y solo para el admin.
  const { data: miembros } = await supabase.from("negocio_miembros").select("user_id, creado_en").eq("negocio_id", id).order("creado_en");
  const servicio = clienteServicio();
  const operadores = await Promise.all(
    (miembros ?? []).map(async (m) => {
      const { data } = servicio ? await servicio.auth.admin.getUserById(m.user_id) : { data: null };
      return { userId: m.user_id, email: data?.user?.email ?? `Usuario ${m.user_id.slice(0, 8)}` };
    }),
  );

  return (
    <>
      <NavegacionAdmin actual="/admin" />
      <Link href="/admin" className="text-sm font-semibold text-primary underline underline-offset-4">
        ← Negocios
      </Link>
      <h2 className="mb-4 mt-2 font-display text-xl font-extrabold text-primary">{n.nombre}</h2>
      {creado && (
        <p className="mb-4 rounded-2xl bg-secondary px-4 py-3 font-semibold text-secondary-foreground" role="status">
          Negocio creado. Ahora vincula a quien lo va a operar.
        </p>
      )}

      <section className="mb-8 rounded-2xl bg-card p-5 shadow-card" aria-labelledby="titulo-operadores">
        <h3 id="titulo-operadores" className="font-display text-lg font-bold text-primary">
          Usuarios del negocio
        </h3>
        {operadores.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Nadie opera este negocio todavía.</p>
        ) : (
          <ul className="mt-2 divide-y">
            {operadores.map((o) => (
              <li key={o.userId} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">{o.email}</span>
                <form action={desvincularUsuario}>
                  <input type="hidden" name="negocioId" value={n.id} />
                  <input type="hidden" name="userId" value={o.userId} />
                  <button className="text-sm font-semibold text-destructive underline underline-offset-4">Quitar</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <VincularUsuario negocioId={n.id} />
      </section>

      <FormularioNegocio
        negocio={{
          id: n.id,
          nombre: n.nombre,
          slug: n.slug,
          categoria: n.categoria,
          descripcion: n.descripcion,
          direccion: n.direccion,
          lat: n.lat,
          lng: n.lng,
          horario: horarioATexto(n.horario),
          telefono: n.telefono_whatsapp ?? "",
          activo: n.activo,
          esPrueba: n.es_prueba,
        }}
      />
    </>
  );
}
