import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { avisarOfertasPendientes } from "@/lib/avisos-interesados";

// Avisa a los interesados de las ofertas publicadas sin pasar por la Server Action
// (sobre todo las programadas por pg_cron). Protegida con CRON_SECRET:
//   Authorization: Bearer <CRON_SECRET>   (así lo envía Vercel Cron)
// Ver docs/NOTIFICACIONES.md para programarla.

function autorizado(req: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const recibido = Buffer.from(req.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${secreto}`);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

async function ejecutar(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    console.warn("[interesados] La ruta del cron está apagada: falta CRON_SECRET.");
    return Response.json({ error: "Falta configurar CRON_SECRET." }, { status: 503 });
  }
  if (!autorizado(req)) return Response.json({ error: "No autorizado." }, { status: 401 });
  const resumen = await avisarOfertasPendientes(req.nextUrl.origin);
  return Response.json(resumen);
}

export const GET = ejecutar;
export const POST = ejecutar;
