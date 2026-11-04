import "server-only";
import { createClient as crear } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { supabasePublicEnv } from "./env";

// Cliente anónimo sin cookies para lecturas públicas (catálogo, ficha).
// Devuelve null si el entorno no tiene Supabase (Production antes del P7).
export function clientePublico() {
  const env = supabasePublicEnv();
  if (!env) return null;
  return crear<Database>(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
