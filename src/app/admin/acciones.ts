"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { rolesActuales } from "@/lib/roles";
import { clienteServicio } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { slugify, telefonoWhatsApp, textoAHorario } from "@/lib/texto";

export type EstadoAdmin = { ok?: string; error?: string } | null;

const CATEGORIAS = ["desayuno", "almuerzo", "panaderia_pasteleria", "cafe", "comida_rapida", "saludable", "postres", "bebidas", "otro"] as const;

async function esAdmin(): Promise<boolean> {
  const { usuario, roles } = await rolesActuales();
  return Boolean(usuario) && roles.includes("admin");
}

const esquemaNegocio = z.object({
  id: z.uuid().optional(),
  nombre: z.string().trim().min(2, "Escribe el nombre del negocio.").max(80),
  slug: z.string().trim().max(60).optional(),
  categoria: z.enum(CATEGORIAS),
  descripcion: z.string().trim().max(300).default(""),
  direccion: z.string().trim().min(3, "Escribe la dirección.").max(160),
  lat: z.coerce.number().min(-90, "Ubicación no válida.").max(90, "Ubicación no válida."),
  lng: z.coerce.number().min(-180, "Ubicación no válida.").max(180, "Ubicación no válida."),
  horario: z.string().max(500).default(""),
  telefono: z.string().trim().max(30).default(""),
  activo: z.boolean(),
  esPrueba: z.boolean(),
});

/** Crea o edita un negocio. Usa la sesión del admin: RLS (negocios_admin_gestion) también lo exige. */
export async function guardarNegocio(_p: EstadoAdmin, form: FormData): Promise<EstadoAdmin> {
  if (!(await esAdmin())) return { error: "Solo el equipo Salvori puede gestionar negocios." };

  const d = esquemaNegocio.safeParse({
    id: form.get("id") || undefined,
    nombre: form.get("nombre"),
    slug: form.get("slug") || undefined,
    categoria: form.get("categoria"),
    descripcion: form.get("descripcion") ?? "",
    direccion: form.get("direccion"),
    lat: form.get("lat"),
    lng: form.get("lng"),
    horario: form.get("horario") ?? "",
    telefono: form.get("telefono") ?? "",
    activo: form.get("activo") === "on",
    esPrueba: form.get("esPrueba") === "on",
  });
  if (!d.success) return { error: d.error.issues[0]?.message ?? "Revisa los datos." };

  let telefono: string | null = null;
  if (d.data.telefono) {
    telefono = telefonoWhatsApp(d.data.telefono);
    if (!telefono) return { error: "Revisa el WhatsApp: un celular de 10 dígitos o el número con indicativo." };
  }

  const fila = {
    nombre: d.data.nombre,
    categoria: d.data.categoria,
    descripcion: d.data.descripcion,
    direccion: d.data.direccion,
    lat: d.data.lat,
    lng: d.data.lng,
    horario: textoAHorario(d.data.horario),
    telefono_whatsapp: telefono,
    activo: d.data.activo,
    es_prueba: d.data.esPrueba,
  };
  const supabase = await createClient();

  if (d.data.id) {
    // El slug no cambia al editar: ya puede estar en enlaces compartidos (/n/<slug>).
    const { error } = await supabase.from("negocios").update(fila).eq("id", d.data.id);
    if (error) return { error: "No pudimos guardar el negocio. Intenta de nuevo." };
    revalidatePath("/admin");
    revalidatePath(`/admin/negocios/${d.data.id}`);
    return { ok: "Cambios guardados." };
  }

  const base = slugify(d.data.slug || d.data.nombre);
  if (!base) return { error: "El nombre debe tener letras o números." };
  const { data: usados } = await supabase.from("negocios").select("slug").like("slug", `${base}%`);
  const ocupados = new Set((usados ?? []).map((n) => n.slug));
  let slug = base;
  for (let i = 2; ocupados.has(slug); i++) slug = `${base}-${i}`;

  const { data: creado, error } = await supabase.from("negocios").insert({ ...fila, slug }).select("id").single();
  if (error || !creado) return { error: "No pudimos crear el negocio. Intenta de nuevo." };
  revalidatePath("/admin");
  redirect(`/admin/negocios/${creado.id}?creado=1`);
}

const esquemaVincular = z.object({ negocioId: z.uuid(), email: z.string().trim().toLowerCase().pipe(z.email("Escribe un correo válido.")) });

/**
 * Vincula un correo como operador (rol negocio) de un negocio.
 * user_roles solo se escribe con la service_role, por eso primero se valida que quien llama sea admin.
 */
export async function vincularUsuario(_p: EstadoAdmin, form: FormData): Promise<EstadoAdmin> {
  if (!(await esAdmin())) return { error: "Solo el equipo Salvori puede vincular usuarios." };
  const d = esquemaVincular.safeParse({ negocioId: form.get("negocioId"), email: form.get("email") });
  if (!d.success) return { error: d.error.issues[0]?.message ?? "Revisa los datos." };

  const db = clienteServicio();
  if (!db) return { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor: no se pueden vincular usuarios." };

  let userId: string | null = null;
  let creado = false;
  for (let page = 1; page <= 25 && !userId; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return { error: "No pudimos consultar los usuarios. Intenta de nuevo." };
    userId = data.users.find((u) => u.email?.toLowerCase() === d.data.email)?.id ?? null;
    if (data.users.length < 200) break;
  }
  if (!userId) {
    // Aún no ha entrado a Salvori: se crea la cuenta y entra después con el enlace mágico.
    const { data, error } = await db.auth.admin.createUser({ email: d.data.email, email_confirm: true });
    if (error || !data.user) return { error: "No pudimos crear la cuenta de ese correo." };
    userId = data.user.id;
    creado = true;
  }

  const { error: e1 } = await db.from("user_roles").upsert({ user_id: userId, role: "negocio" }, { onConflict: "user_id,role", ignoreDuplicates: true });
  const { error: e2 } = await db
    .from("negocio_miembros")
    .upsert({ negocio_id: d.data.negocioId, user_id: userId }, { onConflict: "negocio_id,user_id", ignoreDuplicates: true });
  if (e1 || e2) return { error: "No pudimos vincular el usuario. Intenta de nuevo." };

  revalidatePath(`/admin/negocios/${d.data.negocioId}`);
  return {
    ok: creado
      ? `${d.data.email} quedó vinculado. Aún no tenía cuenta: se creó y entra con el enlace que le llega a ese correo.`
      : `${d.data.email} quedó vinculado y ya puede usar el panel del negocio.`,
  };
}

const esquemaDesvincular = z.object({ negocioId: z.uuid(), userId: z.uuid() });

export async function desvincularUsuario(form: FormData) {
  if (!(await esAdmin())) return;
  const d = esquemaDesvincular.safeParse({ negocioId: form.get("negocioId"), userId: form.get("userId") });
  if (!d.success) return;

  const supabase = await createClient();
  await supabase.from("negocio_miembros").delete().eq("negocio_id", d.data.negocioId).eq("user_id", d.data.userId);

  // Si ya no opera ningún negocio, se le quita el rol (solo con la service_role).
  const { count } = await supabase.from("negocio_miembros").select("negocio_id", { count: "exact", head: true }).eq("user_id", d.data.userId);
  if (count === 0) await clienteServicio()?.from("user_roles").delete().eq("user_id", d.data.userId).eq("role", "negocio");

  revalidatePath(`/admin/negocios/${d.data.negocioId}`);
}
