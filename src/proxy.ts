import type { NextRequest } from "next/server";
import { COOKIE_ORIGEN, DURACION_ORIGEN_S, slugDeRuta } from "@/lib/origen";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 llama «proxy» a lo que antes era middleware.
export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  // Quien llega por /n/<slug> queda con origen «negocio:<slug>» hasta reservar (7 días).
  // Los enlaces precargados (prefetch) no cuentan como visita.
  const h = request.headers;
  const precarga = h.has("next-router-prefetch") || /prefetch/i.test(`${h.get("purpose") ?? ""} ${h.get("sec-purpose") ?? ""}`);
  const slug = precarga ? null : slugDeRuta(request.nextUrl.pathname);
  if (slug) {
    response.cookies.set(COOKIE_ORIGEN, `negocio:${slug}`, {
      maxAge: DURACION_ORIGEN_S,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
    });
  }
  return response;
}

export const config = {
  matcher: [
    // Todo menos estáticos e imágenes.
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|brand/|.*\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
