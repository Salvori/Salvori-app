// Ayudas de Playwright contra salvori-staging (usuarios de prueba y datos temporales).
import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const USUARIOS = {
  comprador: { email: "comprador.prueba@salvori.test", password: process.env.PRUEBA_PASSWORD_COMPRADOR ?? "" },
  negocio: { email: "negocio.prueba@salvori.test", password: process.env.PRUEBA_PASSWORD_NEGOCIO ?? "" },
  admin: { email: "admin.prueba@salvori.test", password: process.env.PRUEBA_PASSWORD_ADMIN ?? "" },
};

export const hayStaging = Boolean(
  url.includes("ekdpnsrigbpdnbwioozv") && anonKey && serviceKey && USUARIOS.comprador.password && USUARIOS.negocio.password,
);

export const hayAdmin = hayStaging && Boolean(USUARIOS.admin.password);

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
    borrar: () => borrarNegocio(neg.id),
  };
}

/** Borra un negocio temporal con todo lo que cuelga de él (también las fotos subidas). */
export async function borrarNegocio(negocioId: string) {
  const db = admin();
  const { data: ofertas } = await db.from("ofertas").select("id").eq("negocio_id", negocioId);
  const ids = (ofertas ?? []).map((o) => o.id as string);
  await db.from("eventos").delete().eq("negocio_id", negocioId);
  await db.from("calificaciones").delete().eq("negocio_id", negocioId);
  await db.from("oferta_programacion").delete().eq("negocio_id", negocioId);
  if (ids.length) await db.from("reservas").delete().in("oferta_id", ids);
  await db.from("ofertas").delete().eq("negocio_id", negocioId);
  await db.from("negocio_miembros").delete().eq("negocio_id", negocioId);
  await db.from("negocios").delete().eq("id", negocioId);
  const { data: fotos } = await db.storage.from("ofertas").list(negocioId);
  if (fotos?.length) await db.storage.from("ofertas").remove(fotos.map((f) => `${negocioId}/${f.name}`));
}

/** Los 3 pasos de publicar (foto → promoción y precio → horario). Sirve en /negocio/publicar y /admin/publicar. */
export async function publicarEnTresPasos(pagina: Page, titulo: string) {
  // Foto: una imagen generada con el propio navegador.
  const lienzo = await pagina.context().newPage();
  await lienzo.setContent('<div style="width:600px;height:450px;background:linear-gradient(135deg,#F57A35,#F8F5EA)"></div>');
  const foto = await lienzo.screenshot({ type: "png" });
  await lienzo.close();

  await pagina.getByTestId("foto").setInputFiles({ name: "combo.png", mimeType: "image/png", buffer: foto });
  await expect(pagina.getByAltText("Foto de la oferta")).toBeVisible({ timeout: 20_000 });
  await pagina.getByRole("button", { name: "Siguiente" }).click();

  // Carril solo comercial: no hay selector de tipo ni «producto del día».
  await expect(pagina.getByRole("radiogroup", { name: "Tipo de oferta" })).toHaveCount(0);
  await expect(pagina.getByText(/producto del día/i)).toHaveCount(0);
  await pagina.getByLabel("Título").fill(titulo);
  await pagina.getByLabel("Qué recibe exactamente").fill("2 empanadas de pipián y una gaseosa personal");
  await pagina.getByLabel("Precio habitual").fill("12000");
  await pagina.getByLabel("Precio Salvori").fill("8000");
  await expect(pagina.getByText("Descuento: 33%")).toBeVisible();
  await pagina.getByLabel("Cupos disponibles").fill("4");
  await pagina.getByRole("button", { name: "Siguiente" }).click();

  await expect(pagina.getByText(/elaborado/i)).toHaveCount(0);
  await expect(pagina.getByLabel("Vista previa")).toContainText(titulo);
  await pagina.getByRole("button", { name: "Publicar oferta" }).click();
}
