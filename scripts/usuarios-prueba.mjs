// Crea (o actualiza) los 3 usuarios de prueba de STAGING:
// comprador, negocio (miembro de La Fonda Payanesa) y admin.
// Uso: npm run usuarios:prueba   (lee .env.local)
// Las contraseñas vienen de variables de entorno y nunca se commitean.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STAGING_REF = "ekdpnsrigbpdnbwioozv";
const LA_FONDA = "5a1a0000-0000-4000-8000-000000000001";

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  process.exit(1);
}
if (!url.includes(STAGING_REF)) {
  console.error("Este script solo corre contra salvori-staging.");
  process.exit(1);
}

const usuarios = [
  { rol: "comprador", email: "comprador.prueba@salvori.test", nombre: "Comprador de prueba", env: "PRUEBA_PASSWORD_COMPRADOR" },
  { rol: "negocio", email: "negocio.prueba@salvori.test", nombre: "Negocio de prueba", env: "PRUEBA_PASSWORD_NEGOCIO" },
  { rol: "admin", email: "admin.prueba@salvori.test", nombre: "Admin de prueba", env: "PRUEBA_PASSWORD_ADMIN" },
];

const faltan = usuarios.filter((u) => !process.env[u.env]).map((u) => u.env);
if (faltan.length) {
  console.error(`Faltan en .env.local: ${faltan.join(", ")}`);
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function buscarPorCorreo(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email === email);
    if (u || data.users.length < 200) return u ?? null;
  }
}

for (const u of usuarios) {
  const password = process.env[u.env];
  let user = await buscarPorCorreo(u.email);
  if (user) {
    const { error } = await db.auth.admin.updateUserById(user.id, { password, user_metadata: { nombre: u.nombre } });
    if (error) throw error;
  } else {
    const { data, error } = await db.auth.admin.createUser({
      email: u.email,
      password,
      email_confirm: true,
      user_metadata: { nombre: u.nombre },
    });
    if (error) throw error;
    user = data.user;
  }

  if (u.rol !== "comprador") {
    const { error } = await db.from("user_roles").upsert({ user_id: user.id, role: u.rol }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (error) throw error;
  }
  if (u.rol === "negocio") {
    const { error } = await db.from("negocio_miembros").upsert({ negocio_id: LA_FONDA, user_id: user.id }, { onConflict: "negocio_id,user_id", ignoreDuplicates: true });
    if (error) throw error;
  }
  console.log(`✓ ${u.rol}: ${u.email}`);
}
