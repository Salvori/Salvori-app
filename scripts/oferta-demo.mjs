// Oferta de demostración VISIBLE en staging, para probar el flujo desde el celular.
// Uso: npm run demo:crear   ·   npm run demo:borrar
// Solo staging. El negocio demo queda con negocio.prueba@salvori.test como miembro.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url?.includes("ekdpnsrigbpdnbwioozv") || !key) {
  console.error("Solo corre contra salvori-staging (revisa .env.local).");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const SLUG = "demo-staging";
const accion = process.argv[2];

async function borrar() {
  const { data: n } = await db.from("negocios").select("id").eq("slug", SLUG).maybeSingle();
  if (!n) return console.log("No había demo.");
  await db.from("eventos").delete().eq("negocio_id", n.id);
  await db.from("calificaciones").delete().eq("negocio_id", n.id);
  const { data: ofs } = await db.from("ofertas").select("id").eq("negocio_id", n.id);
  if (ofs?.length) await db.from("reservas").delete().in("oferta_id", ofs.map((o) => o.id));
  await db.from("ofertas").delete().eq("negocio_id", n.id);
  await db.from("negocio_miembros").delete().eq("negocio_id", n.id);
  await db.storage.from("ofertas").remove([`${n.id}/demo.png`]);
  await db.from("negocios").delete().eq("id", n.id);
  console.log("✓ Demo borrada.");
}

async function crear() {
  await borrar();
  const { data: n, error } = await db
    .from("negocios")
    .insert({ nombre: "Panadería Demo (staging)", slug: SLUG, categoria: "panaderia_pasteleria", direccion: "Parque Caldas, Popayán", lat: 2.4421, lng: -76.6062, horario: { "lun-dom": "06:00-20:00" } })
    .select("id")
    .single();
  if (error) throw error;

  const { data: lista } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  const dueno = lista?.users.find((u) => u.email === "negocio.prueba@salvori.test");
  if (dueno) await db.from("negocio_miembros").insert({ negocio_id: n.id, user_id: dueno.id });

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4+8/qPwAHrgLH0Qq4oAAAAABJRU5ErkJggg==", "base64");
  await db.storage.from("ofertas").upload(`${n.id}/demo.png`, png, { contentType: "image/png", upsert: true });

  const ahora = Date.now();
  const { error: e2 } = await db.from("ofertas").insert({
    negocio_id: n.id,
    tipo: "comercial",
    titulo: "Combo demo: 4 panes de bono",
    contenido: "4 panes de bono horneados hoy (oferta de demostración de staging).",
    categoria: "panaderia_pasteleria",
    foto_url: `${n.id}/demo.png`,
    precio_habitual: 8000,
    precio_final: 5000,
    cupos_total: 10,
    cupos_disponibles: 10,
    recogida_desde: new Date(ahora - 10 * 60 * 1000).toISOString(),
    recogida_hasta: new Date(ahora + 8 * 60 * 60 * 1000).toISOString(),
    tiempo_preparacion_min: 5,
    estado: "activa",
  });
  if (e2) throw e2;
  console.log("✓ Oferta demo publicada por 8 horas (Parque Caldas). Bórrala con npm run demo:borrar.");
}

if (accion === "crear") await crear();
else if (accion === "borrar") await borrar();
else console.log("Uso: node scripts/oferta-demo.mjs crear|borrar");
