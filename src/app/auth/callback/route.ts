import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rutaSegura } from "@/lib/sesion";

// Vuelta del enlace mágico. Acepta token_hash (plantilla de Salvori, sirve en
// otro dispositivo) o code (flujo PKCE por defecto de Supabase).
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const siguiente = rutaSegura(url.searchParams.get("next"));
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = (url.searchParams.get("type") ?? "email") as EmailOtpType;
  const code = url.searchParams.get("code");

  const supabase = await createClient();
  let ok = false;
  if (tokenHash) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  if (!ok) {
    return NextResponse.redirect(new URL(`/entrar?error=enlace&next=${encodeURIComponent(siguiente)}`, url.origin));
  }

  // Guarda la autorización de datos si el usuario ya existía (los nuevos la traen en el registro).
  const almacen = await cookies();
  const guardada = almacen.get("salvori_autorizacion")?.value;
  const { data } = await supabase.auth.getUser();
  if (guardada && data.user && !data.user.user_metadata?.autorizacion_datos) {
    try {
      await supabase.auth.updateUser({ data: { autorizacion_datos: JSON.parse(guardada) } });
    } catch {}
  }
  almacen.delete("salvori_autorizacion");

  return NextResponse.redirect(new URL(siguiente, url.origin));
}
