// @vitest-environment node
// Planes y mensualidad (migración 20261123000300_planes.sql) en una base local
// PGlite con todas las migraciones: límite de ofertas activas, vencimiento con
// gracia, suspensión, pagos, cron de programadas y RLS con los tres roles.
// No necesita staging ni Docker. Las pruebas van en orden y comparten datos.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBaseLocal, errorDe, type BaseLocal } from "./pglite";

let b: BaseLocal;
let negocioViejo = "";
let dueno = "", otroDueno = "", admin = "", comprador = "";
let neg = "", otro = "", basico = "";
const ids: string[] = [];
let agotable = "";

const INSERTAR_OFERTA = (estado = "activa", cupos = 3) => `
  INSERT INTO public.ofertas (negocio_id, tipo, titulo, contenido, categoria, foto_url, precio_habitual, precio_final,
    cupos_total, cupos_disponibles, recogida_desde, recogida_hasta, estado, publicada_por)
  VALUES ($1, 'comercial', 'Combo', 'Pan y café', 'otro', 'x/y.jpg', 10000, 6000, ${cupos}, ${cupos},
    now() - interval '3 hours', now() + interval '2 hours', '${estado}', auth.uid()) RETURNING id`;

async function publicar(uid: string, negocio: string, estado = "activa", cupos = 3) {
  const [fila] = await b.filas<{ id: string }>(uid, INSERTAR_OFERTA(estado, cupos), [negocio]);
  return fila.id;
}

describe("planes y mensualidad (PGlite local)", { timeout: 60_000 }, () => {
  beforeAll(async () => {
    b = await crearBaseLocal({
      migracion: "20261123000300",
      sembrar: async (db) => {
        const { rows } = await db.query<{ id: string }>(
          `INSERT INTO public.negocios (nombre, slug, categoria, lat, lng) VALUES ('Viejo', 'viejo', 'otro', 2.44, -76.6) RETURNING id`,
        );
        negocioViejo = rows[0].id;
      },
    });
    [dueno, otroDueno, admin, comprador] = await Promise.all([
      b.usuario("negocio"),
      b.usuario("negocio"),
      b.usuario("admin"),
      b.usuario("comprador"),
    ]);
    neg = await b.negocio(dueno);
    otro = await b.negocio(otroDueno);
    basico = (await b.db.query<{ id: string }>(`SELECT id FROM public.planes WHERE nombre = 'Básico'`)).rows[0].id;
  }, 60_000);

  it("siembra Prueba y Básico, y da 15 días de prueba a negocios viejos y nuevos", async () => {
    const planes = (await b.db.query(`SELECT nombre, precio_mensual, max_ofertas_activas, dias_prueba FROM public.planes ORDER BY orden`)).rows;
    expect(planes).toEqual([
      { nombre: "Prueba", precio_mensual: 0, max_ofertas_activas: 5, dias_prueba: 15 },
      { nombre: "Básico", precio_mensual: 50000, max_ofertas_activas: 5, dias_prueba: null },
    ]);
    for (const id of [negocioViejo, neg]) {
      const { rows } = await b.db.query<{ estado: string; dias: number }>(
        `SELECT estado, round(extract(epoch FROM vence_en - now()) / 86400)::int AS dias FROM public.suscripciones WHERE negocio_id = $1`,
        [id],
      );
      expect(rows[0]).toEqual({ estado: "prueba", dias: 15 });
    }
  });

  it("rechaza la 6.ª oferta activa con un mensaje claro", async () => {
    for (let i = 0; i < 4; i++) ids.push(await publicar(dueno, neg));
    agotable = await publicar(dueno, neg, "activa", 1);
    expect(await errorDe(publicar(dueno, neg))).toMatch(/Llegaste al límite de tu plan Prueba: 5 ofertas activas al mismo tiempo/);
    // También si el admin publica a nombre del negocio.
    expect(await errorDe(b.filas(admin, INSERTAR_OFERTA(), [neg]))).toMatch(/límite/);
    // Otro negocio no se ve afectado.
    expect(await errorDe(publicar(otroDueno, otro))).toBeNull();
  });

  it("un borrador se guarda, pero no puede pasar a activa por encima del límite", async () => {
    const borrador = await publicar(dueno, neg, "borrador");
    const e = await errorDe(b.filas(dueno, `UPDATE public.ofertas SET estado = 'activa' WHERE id = $1`, [borrador]));
    expect(e).toMatch(/límite/);
  });

  it("las ofertas con la ventana terminada no cuentan", async () => {
    await b.db.query(
      `UPDATE public.ofertas SET recogida_desde = now() - interval '5 hours', recogida_hasta = now() - interval '1 hour' WHERE id = $1`,
      [ids[0]],
    );
    expect(await errorDe(publicar(dueno, neg))).toBeNull();
  });

  it("reservar (agotada) y cancelar (vuelve a activa) no se bloquean", async () => {
    const [r] = await b.filas<{ id: string }>(comprador, `SELECT * FROM public.solicitar_reserva($1, 1)`, [agotable]);
    expect((await b.db.query(`SELECT estado FROM public.ofertas WHERE id = $1`, [agotable])).rows[0]).toEqual({ estado: "agotada" });
    // La agotada libera un puesto del plan.
    expect(await errorDe(publicar(dueno, neg))).toBeNull();
    // Cancelar devuelve el cupo aunque el negocio quede con 6 activas.
    expect(await errorDe(b.filas(comprador, `SELECT public.cambiar_estado_reserva($1, 'cancelada')`, [r.id]))).toBeNull();
    expect((await b.db.query(`SELECT estado FROM public.ofertas WHERE id = $1`, [agotable])).rows[0]).toEqual({ estado: "activa" });
  });

  it("vencida: 3 días de gracia y luego bloquea; el cron diario la marca", async () => {
    await b.db.query(`UPDATE public.ofertas SET estado = 'cerrada' WHERE negocio_id = $1`, [neg]);
    await b.db.query(
      `UPDATE public.suscripciones SET inicia_en = now() - interval '20 days', vence_en = now() - interval '2 days' WHERE negocio_id = $1`,
      [neg],
    );
    expect(await errorDe(publicar(dueno, neg))).toBeNull();
    await b.db.query(`UPDATE public.suscripciones SET vence_en = now() - interval '4 days' WHERE negocio_id = $1`, [neg]);
    expect(await errorDe(publicar(dueno, neg))).toMatch(/Tu plan venció el \d\d\/\d\d\/\d{4}\. Para seguir publicando, paga la mensualidad/);
    const { rows } = await b.db.query<{ n: number }>(`SELECT public.marcar_suscripciones_vencidas() AS n`);
    expect(rows[0].n).toBeGreaterThanOrEqual(1);
    expect((await b.db.query(`SELECT estado FROM public.suscripciones WHERE negocio_id = $1`, [neg])).rows[0]).toEqual({ estado: "vencida" });
  });

  it("solo el admin registra pagos; el pago activa, cambia el plan y extiende un mes", async () => {
    expect(await errorDe(b.filas(dueno, `SELECT public.registrar_pago_mensualidad($1, $2, 50000, 'nequi')`, [neg, basico]))).toMatch(
      /Solo el equipo Salvori/,
    );
    const [pago] = await b.filas<{ valor: number }>(admin, `SELECT * FROM public.registrar_pago_mensualidad($1, $2, 50000, 'nequi', 1, 'Pagó en el local')`, [
      neg,
      basico,
    ]);
    expect(pago.valor).toBe(50000);
    const { rows } = await b.db.query(
      `SELECT s.estado, p.nombre, s.vence_en > now() + interval '27 days' AS extendida
       FROM public.suscripciones s JOIN public.planes p ON p.id = s.plan_id WHERE negocio_id = $1`,
      [neg],
    );
    expect(rows[0]).toEqual({ estado: "activa", nombre: "Básico", extendida: true });
    expect(await errorDe(publicar(dueno, neg))).toBeNull();
  });

  it("pagar durante la prueba no pierde los días de prueba", async () => {
    const antes = (await b.db.query<{ vence_en: Date }>(`SELECT vence_en FROM public.suscripciones WHERE negocio_id = $1`, [otro])).rows[0].vence_en;
    await b.filas(admin, `SELECT public.registrar_pago_mensualidad($1, $2, 100000, 'efectivo', 2)`, [otro, basico]);
    const { rows } = await b.db.query<{ periodo_desde: Date }>(`SELECT periodo_desde FROM public.pagos_mensualidad WHERE negocio_id = $1`, [otro]);
    expect(rows[0].periodo_desde.getTime()).toBe(antes.getTime());
  });

  it("suspendida bloquea de inmediato", async () => {
    await b.db.query(`UPDATE public.suscripciones SET estado = 'suspendida' WHERE negocio_id = $1`, [otro]);
    expect(await errorDe(publicar(otroDueno, otro))).toMatch(/suspendida/);
    await b.db.query(`UPDATE public.suscripciones SET estado = 'activa' WHERE negocio_id = $1`, [otro]);
  });

  it("el cron de programadas no falla: deja en borrador la que supera el límite y publica las demás", async () => {
    await b.db.query(`UPDATE public.planes SET max_ofertas_activas = 1 WHERE nombre = 'Prueba'`);
    const programar = (negocio: string, plantilla: string) =>
      b.db.query(
        `INSERT INTO public.oferta_programacion (negocio_id, plantilla_oferta_id, dias_semana, hora_publicacion)
         VALUES ($1, $2, ARRAY[1,2,3,4,5,6,7]::smallint[], '00:00')`,
        [negocio, plantilla],
      );
    const d3 = await b.usuario("negocio");
    const n3 = await b.negocio(d3);
    await programar(n3, await publicar(d3, n3)); // ya tiene 1 activa: la del cron excede
    const d4 = await b.usuario("negocio");
    const n4 = await b.negocio(d4);
    const p4 = await publicar(d4, n4);
    await b.db.query(`UPDATE public.ofertas SET estado = 'cerrada' WHERE id = $1`, [p4]);
    await programar(n4, p4);

    const { rows } = await b.db.query<{ n: number }>(`SELECT public.publicar_programadas() AS n`);
    expect(rows[0].n).toBe(2);
    const estados = async (n: string) =>
      (await b.db.query<{ estado: string }>(`SELECT estado FROM public.ofertas WHERE negocio_id = $1 ORDER BY creado_en`, [n])).rows.map((r) => r.estado);
    expect(await estados(n3)).toEqual(["activa", "borrador"]);
    expect(await estados(n4)).toEqual(["cerrada", "activa"]);
    await b.db.query(`UPDATE public.planes SET max_ofertas_activas = 5 WHERE nombre = 'Prueba'`);
  });

  it("RLS: el negocio ve solo lo suyo; comprador y anónimo, nada", async () => {
    expect(await b.filas(dueno, `SELECT negocio_id FROM public.suscripciones`)).toEqual([{ negocio_id: neg }]);
    expect(await b.filas(dueno, `SELECT negocio_id FROM public.pagos_mensualidad`)).toEqual([{ negocio_id: neg }]);
    expect(await b.filas(comprador, `SELECT 1 FROM public.suscripciones UNION ALL SELECT 1 FROM public.pagos_mensualidad`)).toEqual([]);
    expect(await errorDe(b.filas("anon", `SELECT 1 FROM public.suscripciones`))).toMatch(/permission denied/);
    expect(await errorDe(b.filas("anon", `SELECT 1 FROM public.pagos_mensualidad`))).toMatch(/permission denied/);
    // Los planes activos son públicos (precio en la portada).
    expect(await b.filas("anon", `SELECT nombre FROM public.planes ORDER BY orden`)).toEqual([{ nombre: "Prueba" }, { nombre: "Básico" }]);
    expect((await b.filas(admin, `SELECT 1 FROM public.suscripciones`)).length).toBeGreaterThanOrEqual(5);
  });

  it("RLS: el negocio no cambia su suscripción, ni pagos, ni planes; el admin sí", async () => {
    expect(
      await b.filas(dueno, `UPDATE public.suscripciones SET vence_en = now() + interval '1 year' WHERE negocio_id = $1 RETURNING 1`, [neg]),
    ).toEqual([]);
    expect(
      await errorDe(
        b.filas(dueno, `INSERT INTO public.pagos_mensualidad (negocio_id, plan_id, valor, metodo, periodo_desde, periodo_hasta)
                        VALUES ($1, $2, 1, 'nequi', now(), now() + interval '1 year')`, [neg, basico]),
      ),
    ).toMatch(/permission denied/);
    expect(await errorDe(b.filas(dueno, `INSERT INTO public.planes (nombre) VALUES ('Gratis')`))).toMatch(/row-level security/);

    expect(await b.filas(admin, `INSERT INTO public.planes (nombre, precio_mensual, max_ofertas_activas, orden) VALUES ('Plus', 90000, NULL, 2) RETURNING nombre`)).toEqual([
      { nombre: "Plus" },
    ]);
    expect(
      await b.filas(admin, `UPDATE public.suscripciones SET plan_id = (SELECT id FROM public.planes WHERE nombre = 'Plus') WHERE negocio_id = $1 RETURNING 1`, [neg]),
    ).toHaveLength(1);
    // Un plan inactivo lo sigue viendo quien lo tiene, no los demás.
    await b.db.query(`UPDATE public.planes SET activo = false WHERE nombre = 'Plus'`);
    expect(await b.filas(dueno, `SELECT nombre FROM public.planes WHERE nombre = 'Plus'`)).toHaveLength(1);
    expect(await b.filas(otroDueno, `SELECT nombre FROM public.planes WHERE nombre = 'Plus'`)).toHaveLength(0);
  });

  it("estado_planes: el negocio lee el suyo, el admin todos, y el estado se calcula al leer", async () => {
    const [propio] = await b.filas<Record<string, unknown>>(dueno, `SELECT * FROM public.estado_planes($1)`, [neg]);
    expect(propio).toMatchObject({ plan_nombre: "Plus", estado: "activa", max_ofertas_activas: null, ofertas_activas: 2 });
    expect(await errorDe(b.filas(dueno, `SELECT * FROM public.estado_planes($1)`, [otro]))).toMatch(/No tienes acceso/);
    expect(await errorDe(b.filas(dueno, `SELECT * FROM public.estado_planes()`))).toMatch(/Solo el equipo Salvori/);
    expect(await errorDe(b.filas(comprador, `SELECT * FROM public.estado_planes()`))).toMatch(/Solo el equipo Salvori/);
    expect((await b.filas(admin, `SELECT * FROM public.estado_planes()`)).length).toBeGreaterThanOrEqual(5);

    await b.db.query(
      `UPDATE public.suscripciones SET estado = 'activa', inicia_en = now() - interval '40 days', vence_en = now() - interval '1 hour' WHERE negocio_id = $1`,
      [otro],
    );
    expect(await b.filas(admin, `SELECT estado FROM public.estado_planes($1)`, [otro])).toEqual([{ estado: "vencida" }]);
  });
});
