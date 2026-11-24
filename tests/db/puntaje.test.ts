// @vitest-environment node
// P4 · 10. Puntaje de cumplimiento (migración 20261124010000_puntaje_cumplimiento.sql) en PGlite:
// valores 5/3/1 del comprador, «No pude cumplir» del negocio, una reserva activa con puntaje bajo,
// y que nadie pueda tocar su propio puntaje.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBaseLocal, errorDe, type BaseLocal } from "./pglite";

let b: BaseLocal;
let dueno = "", comprador = "", otroComprador = "", admin = "";
let neg = "";

const OFERTA = `
  INSERT INTO public.ofertas (negocio_id, tipo, titulo, contenido, categoria, foto_url, precio_habitual, precio_final,
    cupos_total, cupos_disponibles, recogida_desde, recogida_hasta, estado, publicada_por)
  VALUES ($1, 'comercial', 'Combo', 'Pan y café', 'otro', 'x/y.jpg', 10000, 6000, 50, 50,
    now() - interval '1 hour', now() + interval '2 hours', 'activa', $2) RETURNING id`;

let unica = "";
/** Una sola oferta compartida: el plan Prueba admite 5 activas. */
async function oferta() {
  if (!unica) unica = (await b.db.query<{ id: string }>(OFERTA, [neg, dueno])).rows[0].id;
  return unica;
}
async function reservar(uid: string, ofertaId: string) {
  const [r] = await b.filas<{ id: string }>(uid, `SELECT * FROM public.solicitar_reserva($1, 1)`, [ofertaId]);
  return r.id;
}
async function estado(uid: string, reservaId: string, nuevo: string, datos: Record<string, string> = {}) {
  const [r] = await b.filas<{ r: { codigo: string } }>(uid, `SELECT public.cambiar_estado_reserva($1, $2, $3) AS r`, [reservaId, nuevo, JSON.stringify(datos)]);
  return r.r;
}
async function puntaje(uid: string) {
  const [p] = await b.filas<{ puntaje: string | null; cerradas: number }>(uid, `SELECT * FROM public.puntaje_comprador($1)`, [uid]);
  return { puntaje: p.puntaje === null ? null : Number(p.puntaje), cerradas: p.cerradas };
}
/** Reserva confirmada del comprador, lista para cerrarla de cualquier forma. */
async function confirmada(uid = comprador) {
  const id = await reservar(uid, await oferta());
  const { codigo } = await estado(dueno, id, "confirmada");
  return { id, codigo };
}
/** No recogida: se vence la ventana y el negocio la marca. */
async function noRecogida(uid = comprador) {
  const { id } = await confirmada(uid);
  await b.db.query(`UPDATE public.reservas SET recogida_hasta = now() - interval '1 minute' WHERE id = $1`, [id]);
  await estado(dueno, id, "no_recogida");
}

describe("puntaje de cumplimiento (PGlite local)", { timeout: 60_000 }, () => {
  beforeAll(async () => {
    b = await crearBaseLocal();
    [dueno, comprador, otroComprador, admin] = await Promise.all([b.usuario("negocio"), b.usuario("comprador"), b.usuario("comprador"), b.usuario("admin")]);
    neg = await b.negocio(dueno);
  }, 60_000);

  it("sin historial el comprador es «Nuevo»", async () => {
    expect(await puntaje(comprador)).toEqual({ puntaje: null, cerradas: 0 });
  });

  it("entregada vale 5, cancelar después de confirmada vale 3 y devuelve la unidad", async () => {
    const e = await confirmada();
    await estado(dueno, e.id, "entregada", { codigo: e.codigo, metodo_pago: "efectivo" });
    expect(await puntaje(comprador)).toEqual({ puntaje: 5, cerradas: 1 });

    const c = await confirmada();
    expect(await errorDe(estado(comprador, c.id, "cancelada"))).toBeNull();
    const { rows } = await b.db.query(`SELECT o.cupos_disponibles FROM public.reservas r JOIN public.ofertas o ON o.id = r.oferta_id WHERE r.id = $1`, [c.id]);
    const sinReservas = (await b.db.query<{ n: number }>(`SELECT 50 - sum(cantidad)::int AS n FROM public.reservas WHERE oferta_id = $1 AND estado NOT IN ('cancelada','rechazada')`, [unica])).rows[0].n;
    expect(rows[0]).toEqual({ cupos_disponibles: sinReservas });
    expect(await puntaje(comprador)).toEqual({ puntaje: 4, cerradas: 2 });

    // Cancelar mientras está solicitada no cuenta.
    const s = await reservar(comprador, await oferta());
    await estado(comprador, s, "cancelada");
    expect((await puntaje(comprador)).cerradas).toBe(2);
  });

  it("una no recogida baja el puntaje del comprador", async () => {
    await noRecogida();
    // (5 + 3 + 1) / 3 = 3,0
    expect(await puntaje(comprador)).toEqual({ puntaje: 3, cerradas: 3 });
  });

  it("con puntaje < 3 y 3 cerradas solo puede tener una reserva activa", async () => {
    await noRecogida(otroComprador);
    await noRecogida(otroComprador);
    await noRecogida(otroComprador);
    expect(await puntaje(otroComprador)).toEqual({ puntaje: 1, cerradas: 3 });
    await reservar(otroComprador, await oferta());
    expect(await errorDe(reservar(otroComprador, await oferta()))).toMatch(/solo puedes tener una reserva activa a la vez/);
    // A quien tiene buen puntaje no le aplica.
    await reservar(comprador, await oferta());
    expect(await errorDe(reservar(comprador, await oferta()))).toBeNull();
  });

  it("el negocio ve el puntaje del comprador en su bandeja", async () => {
    const filas = await b.filas<{ puntaje_comprador: string | null; cerradas_comprador: number }>(
      dueno,
      `SELECT puntaje_comprador, cerradas_comprador FROM public.reservas_negocio($1)`,
      [neg],
    );
    expect(filas.some((f) => Number(f.puntaje_comprador) === 1 && f.cerradas_comprador === 3)).toBe(true);
  });

  it("«No pude cumplir» exige motivo, cancela la reserva y baja el puntaje del negocio", async () => {
    const e = await confirmada();
    await estado(dueno, e.id, "entregada", { codigo: e.codigo, metodo_pago: "nequi" });
    await b.filas(comprador, `INSERT INTO public.calificaciones (reserva_id, negocio_id, calidad, aseo, atencion) VALUES ($1, $2, 5, 5, 5)`, [e.id, neg]);
    const antes = (await b.filas<{ promedio: string; total: number }>("anon", `SELECT * FROM public.resumen_calificaciones($1)`, [[neg]]))[0];
    expect({ promedio: Number(antes.promedio), total: antes.total }).toEqual({ promedio: 5, total: 1 });

    const f = await confirmada();
    expect(await errorDe(b.filas(dueno, `SELECT public.no_pude_cumplir($1, '  ')`, [f.id]))).toMatch(/Indica por qué/);
    // Solo el negocio dueño de la reserva.
    expect(await errorDe(b.filas(comprador, `SELECT public.no_pude_cumplir($1, 'x')`, [f.id]))).toMatch(/permiso/);
    expect(await errorDe(b.filas(dueno, `SELECT public.no_pude_cumplir($1, 'Se agotó el pan')`, [f.id]))).toBeNull();
    const { rows } = await b.db.query(`SELECT estado, incumplida_por, motivo_incumplimiento FROM public.reservas WHERE id = $1`, [f.id]);
    expect(rows[0]).toEqual({ estado: "cancelada", incumplida_por: "negocio", motivo_incumplimiento: "Se agotó el pan" });

    // (5 + 1) / 2 = 3,0 con 2 «calificaciones».
    const despues = (await b.filas<{ promedio: string; total: number }>("anon", `SELECT * FROM public.resumen_calificaciones($1)`, [[neg]]))[0];
    expect({ promedio: Number(despues.promedio), total: despues.total }).toEqual({ promedio: 3, total: 2 });
    // El incumplimiento del negocio no afecta al comprador.
    expect((await puntaje(comprador)).cerradas).toBeGreaterThan(0);
    const fila = await b.filas<{ total: number }>(admin, `SELECT * FROM public.incumplimientos_recientes()`);
    expect(fila).toEqual([{ negocio_id: neg, total: 1 }]);
  });

  it("nadie modifica su propio puntaje ni ve el de otros", async () => {
    expect(await errorDe(b.filas(comprador, `UPDATE public.reservas SET estado = 'entregada' WHERE comprador_id = auth.uid()`))).toMatch(/permission denied|permiso/);
    expect(await errorDe(b.filas(dueno, `UPDATE public.reservas SET incumplida_por = NULL`))).toMatch(/permission denied|permiso/);
    expect(await errorDe(b.filas(comprador, `SELECT * FROM public.puntaje_comprador($1)`, [otroComprador]))).toMatch(/No tienes acceso/);
    expect(await errorDe(b.filas(comprador, `SELECT * FROM public.calcular_puntaje_comprador($1)`, [comprador]))).toMatch(/permission denied/);
    expect(await errorDe(b.filas(dueno, `SELECT * FROM public.incumplimientos_recientes()`))).toMatch(/equipo de Salvori/);
    expect(await errorDe(b.filas(admin, `SELECT * FROM public.puntaje_comprador($1)`, [comprador]))).toBeNull();
  });
});
