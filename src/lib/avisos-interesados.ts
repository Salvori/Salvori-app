import "server-only";
import { configSmtp, enviarCorreo } from "@/lib/correo";
import { correoInteresado, destinatarios, inicioVentana, topePorOferta, type InteresadoCandidato } from "@/lib/interesados";
import { clienteServicio } from "@/lib/supabase/admin";

type Db = NonNullable<ReturnType<typeof clienteServicio>>;
export type ResumenAvisos = { ofertas: number; enviados: number };

/** Cuántas horas atrás busca la ruta del cron ofertas publicadas sin aviso. */
const HORAS_PENDIENTES = 12;

async function avisarUna(db: Db, ofertaId: string, sitio: string): Promise<number | null> {
  const { data: o } = await db
    .from("ofertas")
    .select(
      "id, titulo, precio_final, precio_habitual, cupos_disponibles, recogida_desde, recogida_hasta, estado, es_prueba, negocio:negocios(nombre, lat, lng, activo, es_prueba)",
    )
    .eq("id", ofertaId)
    .maybeSingle();
  const n = o?.negocio;
  const ahora = Date.now();
  // Solo ofertas públicas y vigentes: nada de pruebas ni de negocios sin ubicación.
  if (!o || !n || o.estado !== "activa" || o.es_prueba || !n.activo || n.es_prueba) return null;
  if (n.lat == null || n.lng == null || Date.parse(o.recogida_hasta) <= ahora) return null;

  // Quien inserta primero la avisa (la Server Action al publicar o el cron): sin duplicados.
  const { error: yaAvisada } = await db.from("ofertas_avisadas").insert({ oferta_id: o.id });
  if (yaAvisada) return null;

  const limite = inicioVentana(ahora);
  const { data: candidatos, error } = await db
    .from("interesados")
    .select("id, correo, lat, lng, radio_km, token_baja, ultimo_envio")
    .or(`ultimo_envio.is.null,ultimo_envio.lt."${limite}"`)
    .limit(5000);
  if (error) {
    console.error("[interesados] No se pudieron leer los interesados:", error.message);
    return 0;
  }

  let enviados = 0;
  for (const d of destinatarios({ lat: n.lat, lng: n.lng }, (candidatos ?? []) as InteresadoCandidato[], ahora, topePorOferta())) {
    // Reserva el turno del interesado antes de enviar: si otro proceso lo tomó, se salta.
    const { data: tomado } = await db
      .from("interesados")
      .update({ ultimo_envio: new Date().toISOString() })
      .eq("id", d.id)
      .or(`ultimo_envio.is.null,ultimo_envio.lt."${limite}"`)
      .select("id");
    if (!tomado?.length) continue;

    const { baja, ...correo } = correoInteresado({
      ofertaId: o.id,
      titulo: o.titulo,
      negocio: n.nombre,
      precioFinal: o.precio_final,
      precioHabitual: o.precio_habitual,
      cupos: o.cupos_disponibles,
      recogidaDesde: o.recogida_desde,
      recogidaHasta: o.recogida_hasta,
      km: d.km,
      token: d.token_baja,
      sitio,
    });
    const r = await enviarCorreo({ para: d.correo, ...correo, cabeceras: { "List-Unsubscribe": `<${baja}>` } });
    if (r.enviado) enviados++;
    // Si el envío falló, le devuelve el turno para la próxima oferta.
    else if (r.motivo === "error") await db.from("interesados").update({ ultimo_envio: d.ultimo_envio }).eq("id", d.id);
  }
  await db.from("ofertas_avisadas").update({ enviados }).eq("oferta_id", o.id);
  return enviados;
}

/**
 * Avisa por correo a los interesados cercanos de cada oferta recién publicada.
 * Nunca lanza. Sin SMTP o sin service_role no marca nada, para que el cron lo intente después.
 */
export async function avisarInteresados(ofertaIds: string[], origen: string): Promise<ResumenAvisos> {
  const resumen: ResumenAvisos = { ofertas: 0, enviados: 0 };
  try {
    const db = clienteServicio();
    if (!db) {
      console.warn("[interesados] Sin avisar: falta SUPABASE_SERVICE_ROLE_KEY en el servidor.");
      return resumen;
    }
    if (!configSmtp()) {
      console.warn("[interesados] Sin avisar: faltan las variables SMTP_*.");
      return resumen;
    }
    const sitio = (process.env.NEXT_PUBLIC_SITE_URL || origen).replace(/\/+$/, "");
    for (const id of ofertaIds) {
      const enviados = await avisarUna(db, id, sitio);
      if (enviados === null) continue;
      resumen.ofertas++;
      resumen.enviados += enviados;
    }
  } catch (e) {
    console.error("[interesados] Falló el aviso:", e instanceof Error ? e.message : e);
  }
  return resumen;
}

/** Para el cron: ofertas activas de las últimas horas (incluidas las programadas) que aún no se avisaron. */
export async function avisarOfertasPendientes(origen: string): Promise<ResumenAvisos> {
  const db = clienteServicio();
  if (!db) return avisarInteresados([], origen);
  const desde = new Date(Date.now() - HORAS_PENDIENTES * 3_600_000).toISOString();
  const { data: ofertas, error } = await db
    .from("ofertas")
    .select("id")
    .eq("estado", "activa")
    .eq("es_prueba", false)
    .gt("recogida_hasta", new Date().toISOString())
    .gte("creado_en", desde)
    .order("creado_en")
    .limit(100);
  if (error || !ofertas?.length) return { ofertas: 0, enviados: 0 };
  const ids = ofertas.map((o) => o.id);
  const { data: avisadas } = await db.from("ofertas_avisadas").select("oferta_id").in("oferta_id", ids);
  const hechas = new Set((avisadas ?? []).map((a) => a.oferta_id));
  return avisarInteresados(
    ids.filter((id) => !hechas.has(id)),
    origen,
  );
}
