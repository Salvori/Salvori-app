import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Cliente con la service_role: se salta RLS. SOLO en el servidor (Server Actions),
// y solo después de verificar el rol de quien llama. Devuelve null si falta la clave.
export function clienteServicio() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) return null;
  return createClient<Database>(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}
