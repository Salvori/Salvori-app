import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublicEnv } from "./env";

// Refresca la sesión de Supabase en cada petición y reescribe las cookies.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = supabasePublicEnv();
  if (!env) return response; // Sin Supabase configurado (p. ej. Production antes del P7).

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // No poner código entre createServerClient y getClaims(): getClaims valida
  // el JWT y dispara el refresco de la sesión si hace falta.
  await supabase.auth.getClaims();

  return response;
}
