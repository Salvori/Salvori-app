// Ayudas para las pruebas de base de datos contra salvori-staging.
// Cada prueba crea sus usuarios, negocios y ofertas con la service_role
// y los borra al final con limpiar().
import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const STAGING_REF = "ekdpnsrigbpdnbwioozv";

/** true solo si hay claves y apuntan a staging (nunca a producción). */
export const hayStaging = Boolean(url && anonKey && serviceKey && url.includes(STAGING_REF));

const sinSesion = { auth: { persistSession: false, autoRefreshToken: false } };

export const admin: SupabaseClient = hayStaging
  ? createClient(url, serviceKey, sinSesion)
  : (null as unknown as SupabaseClient);

type Rol = "comprador" | "negocio" | "admin";

export type Usuario = { id: string; email: string; db: SupabaseClient };

export class Escenario {
  private usuarios: string[] = [];
  private negocios: string[] = [];
  private ofertas: string[] = [];

  async usuario(rol: Rol, nombre = `Prueba ${rol}`): Promise<Usuario> {
    const email = `t-${randomUUID().slice(0, 8)}@salvori.test`;
    const password = randomBytes(18).toString("base64url");
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre },
    });
    if (error) throw error;
    const id = data.user.id;
    this.usuarios.push(id);

    // El trigger da «comprador» a todos; negocio y admin se agregan aquí.
    if (rol !== "comprador") {
      const { error: e } = await admin.from("user_roles").insert({ user_id: id, role: rol });
      if (e) throw e;
    }

    const db = createClient(url, anonKey, sinSesion);
    const { error: e2 } = await db.auth.signInWithPassword({ email, password });
    if (e2) throw e2;
    return { id, email, db };
  }

  async negocio(miembro?: Usuario): Promise<string> {
    const slug = `prueba-${randomUUID().slice(0, 8)}`;
    const { data, error } = await admin
      .from("negocios")
      .insert({ nombre: `Negocio ${slug}`, slug, categoria: "otro", lat: 2.4419, lng: -76.6063, es_prueba: true })
      .select("id")
      .single();
    if (error) throw error;
    this.negocios.push(data.id);
    if (miembro) {
      const { error: e } = await admin.from("negocio_miembros").insert({ negocio_id: data.id, user_id: miembro.id });
      if (e) throw e;
    }
    return data.id;
  }

  async oferta(
    negocioId: string,
    opciones: { cupos?: number; habitual?: number; final?: number } = {},
  ): Promise<string> {
    const cupos = opciones.cupos ?? 5;
    const ahora = Date.now();
    const { data, error } = await admin
      .from("ofertas")
      .insert({
        negocio_id: negocioId,
        tipo: "comercial",
        titulo: "Oferta de prueba",
        contenido: "Contenido exacto de prueba",
        categoria: "otro",
        foto_url: `${negocioId}/prueba.jpg`,
        precio_habitual: opciones.habitual ?? 10000,
        precio_final: opciones.final ?? 6000,
        cupos_total: cupos,
        cupos_disponibles: cupos,
        recogida_desde: new Date(ahora - 60 * 60 * 1000).toISOString(),
        recogida_hasta: new Date(ahora + 2 * 60 * 60 * 1000).toISOString(),
        estado: "activa",
        es_prueba: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    this.ofertas.push(data.id);
    return data.id;
  }

  async cupos(ofertaId: string): Promise<{ cupos_disponibles: number; estado: string }> {
    const { data, error } = await admin
      .from("ofertas")
      .select("cupos_disponibles, estado")
      .eq("id", ofertaId)
      .single();
    if (error) throw error;
    return data;
  }

  async limpiar() {
    const ofertas = this.ofertas;
    if (ofertas.length) {
      const { data: reservas } = await admin.from("reservas").select("id").in("oferta_id", ofertas);
      const ids = (reservas ?? []).map((r) => r.id);
      await admin.from("eventos").delete().in("oferta_id", ofertas);
      if (ids.length) await admin.from("calificaciones").delete().in("reserva_id", ids);
      await admin.from("reservas").delete().in("oferta_id", ofertas);
    }
    if (this.negocios.length) {
      await admin.from("oferta_programacion").delete().in("negocio_id", this.negocios);
      await admin.from("ofertas").delete().in("negocio_id", this.negocios);
      await admin.from("negocio_miembros").delete().in("negocio_id", this.negocios);
      await admin.from("negocios").delete().in("id", this.negocios);
    }
    for (const id of this.usuarios) await admin.auth.admin.deleteUser(id);
    this.usuarios = [];
    this.negocios = [];
    this.ofertas = [];
  }
}

export async function reservar(u: Usuario, ofertaId: string, cantidad = 1) {
  return u.db.rpc("solicitar_reserva", { oferta_id: ofertaId, cantidad });
}

export async function cambiarEstado(u: Usuario, reservaId: string, estado: string, datos: Record<string, unknown> = {}) {
  return u.db.rpc("cambiar_estado_reserva", { reserva_id: reservaId, nuevo_estado: estado, datos });
}
