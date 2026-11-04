// Ayudas de Playwright contra salvori-staging (usuarios de prueba y datos temporales).
import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const USUARIOS = {
  comprador: { email: "comprador.prueba@salvori.test", password: process.env.PRUEBA_PASSWORD_COMPRADOR ?? "" },
  negocio: { email: "negocio.prueba@salvori.test", password: process.env.PRUEBA_PASSWORD_NEGOCIO ?? "" },
};

export const hayStaging = Boolean(
  url.includes("ekdpnsrigbpdnbwioozv") && anonKey && serviceKey && USUARIOS.comprador.password && USUARIOS.negocio.password,
);

const sinSesion = { auth: { persistSession: false, autoRefreshToken: false } };
export const admin = (): SupabaseClient => createClient(url, serviceKey, sinSesion);

/** Cookies de sesión tal como las escribe @supabase/ssr, para inyectarlas en el navegador. */
export async function cookiesDeSesion(email: string, password: string, dominio: string) {
  const jar = new Map<string, string>();
  const db = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (lista) => lista.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return [...jar].map(([name, value]) => ({ name, value, domain: dominio, path: "/", httpOnly: false, secure: false, sameSite: "Lax" as const }));
}

export async function clienteComo(email: string, password: string) {
  const db = createClient(url, anonKey, sinSesion);
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return db;
}

// PNG de 1×1 color mandarina.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4+8/qPwAHrgLH0Qq4oAAAAABJRU5ErkJggg==",
  "base64",
);

/** Negocio público temporal (miembro: negocio.prueba) con una oferta activa. */
export async function crearOfertaTemporal() {
  const db = admin();
  const slug = `e2e-${randomUUID().slice(0, 8)}`;
  const { data: neg, error: e1 } = await db
    .from("negocios")
    .insert({ nombre: `Negocio E2E ${slug}`, slug, categoria: "panaderia_pasteleria", direccion: "Calle E2E", lat: 2.4425, lng: -76.6065 })
    .select("id")
    .single();
  if (e1) throw e1;

  const { data: lista } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  const dueno = lista?.users.find((u) => u.email === USUARIOS.negocio.email);
  if (!dueno) throw new Error("Falta el usuario negocio.prueba: corre npm run usuarios:prueba");
  await db.from("negocio_miembros").insert({ negocio_id: neg.id, user_id: dueno.id });

  const ruta = `${neg.id}/e2e.png`;
  await db.storage.from("ofertas").upload(ruta, PNG, { contentType: "image/png", upsert: true });

  const ahora = Date.now();
  const { data: oferta, error: e2 } = await db
    .from("ofertas")
    .insert({
      negocio_id: neg.id,
      tipo: "comercial",
      titulo: `Combo E2E ${slug}`,
      contenido: "3 panes de bono y un café",
      categoria: "panaderia_pasteleria",
      foto_url: ruta,
      precio_habitual: 9000,
      precio_final: 6000,
      cupos_total: 3,
      cupos_disponibles: 3,
      recogida_desde: new Date(ahora - 30 * 60 * 1000).toISOString(),
      recogida_hasta: new Date(ahora + 3 * 60 * 60 * 1000).toISOString(),
      tiempo_preparacion_min: 10,
      estado: "activa",
    })
    .select("id, titulo")
    .single();
  if (e2) throw e2;

  return {
    negocioId: neg.id as string,
    ofertaId: oferta.id as string,
    titulo: oferta.titulo as string,
    async borrar() {
      await db.from("eventos").delete().eq("negocio_id", neg.id);
      await db.from("calificaciones").delete().eq("negocio_id", neg.id);
      await db.from("reservas").delete().eq("oferta_id", oferta.id);
      await db.from("ofertas").delete().eq("negocio_id", neg.id);
      await db.from("negocio_miembros").delete().eq("negocio_id", neg.id);
      await db.from("negocios").delete().eq("id", neg.id);
      await db.storage.from("ofertas").remove([ruta]);
    },
  };
}
