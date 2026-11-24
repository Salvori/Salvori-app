// Base de datos local en memoria (PGlite, sin Docker) con todas las migraciones.
// Imita lo mínimo de Supabase: roles anon/authenticated/service_role/authenticator,
// auth.users y auth.uid(), storage, pg_cron (schedule sin efecto) y la publicación
// de Realtime. Sirve para probar triggers, RLS y funciones antes de tocar staging.
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRACIONES = join(process.cwd(), "supabase", "migrations");

const STUBS = `
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT; GRANT anon, authenticated, service_role TO authenticator;
CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA cron;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}'::jsonb);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth, storage, public TO anon, authenticated, service_role;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
CREATE TABLE storage.objects (id uuid DEFAULT gen_random_uuid(), bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION cron.schedule(a text, b text, c text) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
CREATE PUBLICATION supabase_realtime;
`;

export type BaseLocal = Awaited<ReturnType<typeof crearBaseLocal>>;

/**
 * Crea la base y aplica las migraciones en orden. `antesDe` corre justo antes de la
 * migración cuyo nombre empieza por esa clave (para sembrar datos «existentes»).
 */
export async function crearBaseLocal(antesDe?: { migracion: string; sembrar: (db: PGlite) => Promise<void> }) {
  const db = new PGlite();
  await db.exec(STUBS);
  for (const archivo of readdirSync(MIGRACIONES).filter((f) => f.endsWith(".sql")).sort()) {
    if (antesDe && archivo.startsWith(antesDe.migracion)) await antesDe.sembrar(db);
    const sql = readFileSync(join(MIGRACIONES, archivo), "utf8").replace(/CREATE EXTENSION IF NOT EXISTS pg_cron[^;]*;/g, "");
    await db.exec(sql);
  }

  /** Ejecuta como un usuario de la app (por PostgREST: session_user = authenticator). */
  async function como<T>(uid: string | "anon", fn: () => Promise<T>): Promise<T> {
    const rol = uid === "anon" ? "anon" : "authenticated";
    const sub = uid === "anon" ? "" : uid;
    await db.exec(`SET SESSION AUTHORIZATION authenticator; SET ROLE ${rol}; SELECT set_config('request.jwt.claim.sub', '${sub}', false);`);
    try {
      return await fn();
    } finally {
      // RESET SESSION AUTHORIZATION no vuelve a postgres en PGlite; esto sí.
      await db.exec(`RESET ROLE; SET SESSION AUTHORIZATION postgres; SELECT set_config('request.jwt.claim.sub', '', false);`);
    }
  }

  async function filas<T = Record<string, unknown>>(uid: string | "anon", sql: string, params: unknown[] = []) {
    return como(uid, async () => (await db.query<T>(sql, params)).rows);
  }

  async function usuario(rol: "comprador" | "negocio" | "admin") {
    const id = randomUUID();
    await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, [id, `t-${id.slice(0, 8)}@salvori.test`]);
    if (rol !== "comprador") await db.query(`INSERT INTO public.user_roles (user_id, role) VALUES ($1, $2)`, [id, rol]);
    return id;
  }

  async function negocio(miembro?: string) {
    const slug = `n-${randomUUID().slice(0, 8)}`;
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO public.negocios (nombre, slug, categoria, lat, lng) VALUES ($1, $1, 'otro', 2.44, -76.6) RETURNING id`,
      [slug],
    );
    if (miembro) await db.query(`INSERT INTO public.negocio_miembros (negocio_id, user_id) VALUES ($1, $2)`, [rows[0].id, miembro]);
    return rows[0].id;
  }

  return { db, como, filas, usuario, negocio };
}

/** Mensaje de error de una promesa, o null si se cumplió. */
export async function errorDe(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
