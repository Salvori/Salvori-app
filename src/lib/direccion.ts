import "server-only";
import { createClient } from "@/lib/supabase/server";

export type DireccionComprador = { direccion: string; lat: number; lng: number };

/** Dirección guardada del usuario actual (RLS: solo la propia). Null si no hay o si falla. */
export async function direccionGuardada(userId: string): Promise<DireccionComprador | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("direcciones_comprador").select("direccion, lat, lng").eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  return data;
}
