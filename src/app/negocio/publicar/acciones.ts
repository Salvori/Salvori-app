"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { avisarInteresados } from "@/lib/avisos-interesados";
import { esquemaOferta, ventanaDeHoy } from "@/lib/esquema-oferta";
import { mensajeAmigable } from "@/lib/errores";
import { createClient } from "@/lib/supabase/server";
import { origenActual, usuarioActual } from "@/lib/sesion";

export type EstadoPublicar = { error: string } | null;

export async function publicarOferta(_p: EstadoPublicar, form: FormData): Promise<EstadoPublicar> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar?next=/negocio/publicar");

  const datos = esquemaOferta.safeParse(Object.fromEntries(form));
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Revisa los datos." };
  const d = datos.data;

  // La foto debe estar en la carpeta del negocio (la política de Storage ya lo exige al subirla).
  if (!d.foto.startsWith(`${d.negocioId}/`)) return { error: "La foto no corresponde a este negocio." };

  const ventana = ventanaDeHoy(d.desde, d.hasta);
  if ("error" in ventana) return ventana;

  const supabase = await createClient();
  const { data: negocio } = await supabase.from("negocios").select("es_prueba").eq("id", d.negocioId).maybeSingle();
  if (!negocio) return { error: "No tienes acceso a este negocio." };

  const { data: nueva, error } = await supabase.from("ofertas").insert({
    negocio_id: d.negocioId,
    tipo: "comercial", // carril solo comercial (decisión del 14 nov)
    formato: d.formato,
    tamano: d.tamano,
    lleva: d.lleva,
    paga: d.paga,
    titulo: d.titulo,
    contenido: d.contenido,
    categoria: d.categoria,
    foto_url: d.foto,
    precio_habitual: d.precioHabitual,
    precio_final: d.precioFinal,
    cupos_total: d.cupos,
    cupos_disponibles: d.cupos,
    recogida_desde: ventana.desde,
    recogida_hasta: ventana.hasta,
    tiempo_preparacion_min: d.preparacion ?? null,
    estado: "activa",
    publicada_por: usuario.id,
    es_prueba: negocio.es_prueba,
  }).select("id").single();
  if (error) return { error: "No pudimos publicar la oferta. Revisa los datos e intenta de nuevo." };

  // Correo a los interesados cercanos, después de responder (con tope y máximo uno cada 6 horas).
  if (nueva?.id) {
    const origen = await origenActual();
    after(() => avisarInteresados([nueva.id], origen));
  }

  const base = d.destino === "admin" ? "/admin/publicar" : "/negocio/ofertas";
  redirect(`${base}?n=${encodeURIComponent(d.slug)}&publicada=1`);
}

/**
 * Edita una oferta vigente con la función editar_oferta (permisos de quien llama, RLS
 * y trigger de inventario). Con reservas: los cupos no bajan de lo reservado y las
 * reservas hechas conservan su precio y su ventana (están copiados en cada reserva).
 */
export async function editarOferta(_p: EstadoPublicar, form: FormData): Promise<EstadoPublicar> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar?next=/negocio/ofertas");

  const ofertaId = z.uuid().safeParse(form.get("ofertaId"));
  if (!ofertaId.success) return { error: "Oferta no válida." };
  const datos = esquemaOferta.safeParse(Object.fromEntries(form));
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Revisa los datos." };
  const d = datos.data;
  if (!d.foto.startsWith(`${d.negocioId}/`)) return { error: "La foto no corresponde a este negocio." };

  const ventana = ventanaDeHoy(d.desde, d.hasta);
  if ("error" in ventana) return ventana;

  const supabase = await createClient();
  const { error } = await supabase.rpc("editar_oferta", {
    p_oferta_id: ofertaId.data,
    p_titulo: d.titulo,
    p_contenido: d.contenido,
    p_categoria: d.categoria,
    p_formato: d.formato,
    p_foto_url: d.foto,
    p_precio_habitual: d.precioHabitual,
    p_precio_final: d.precioFinal,
    p_cupos_total: d.cupos,
    p_recogida_desde: ventana.desde,
    p_recogida_hasta: ventana.hasta,
    // La función acepta null (sin tiempo de preparación); el generador de tipos no lo refleja.
    p_tiempo_preparacion_min: (d.preparacion ?? null) as number,
    // Igual: null quita el tamaño o el «lleva/paga».
    p_tamano: d.tamano as string,
    p_lleva: d.lleva as number,
    p_paga: d.paga as number,
  });
  if (error) {
    const reservados = /Ya hay (\d+) (?:cupos|unidades) reservad/.exec(error.message);
    if (reservados) return { error: `Ya hay ${reservados[1]} unidades reservadas: la oferta no puede quedar con menos.` };
    if (/solo se editan ofertas vigentes/i.test(error.message)) return { error: "Esta oferta ya cerró: duplícala para publicarla de nuevo." };
    if (/hora de fin ya pasó/i.test(error.message)) return { error: "La hora de fin ya pasó. Elige una ventana de recogida futura." };
    return { error: mensajeAmigable(error) };
  }

  revalidatePath("/negocio/ofertas");
  revalidatePath("/");
  redirect(`/negocio/ofertas?n=${encodeURIComponent(d.slug)}&editada=1`);
}
