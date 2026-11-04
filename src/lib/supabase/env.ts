// Variables públicas de Supabase. Production todavía no tiene proyecto
// (salvori-prod se crea antes del P7), así que pueden faltar: quien las use
// debe tolerar `null` en vez de romper la página.
export function supabasePublicEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function requireSupabasePublicEnv(): { url: string; anonKey: string } {
  const env = supabasePublicEnv();
  if (!env) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa .env.local o las variables de Vercel.",
    );
  }
  return env;
}
