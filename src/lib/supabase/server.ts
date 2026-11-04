import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { requireSupabasePublicEnv } from "./env";

// Cliente para Server Components, Server Actions y Route Handlers.
// Usa la sesión del usuario (cookies) y respeta RLS. Crear uno por petición.
export async function createClient() {
  const { url, anonKey } = requireSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // En un Server Component no se pueden escribir cookies; el proxy
          // (src/proxy.ts) ya refresca la sesión en cada petición.
        }
      },
    },
  });
}
