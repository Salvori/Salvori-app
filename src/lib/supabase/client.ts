import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicEnv } from "./env";

// Cliente para componentes de cliente ("use client").
export function createClient() {
  const { url, anonKey } = requireSupabasePublicEnv();
  return createBrowserClient(url, anonKey);
}
