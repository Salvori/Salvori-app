// @vitest-environment node
// Pruebas de la base de datos contra salvori-staging, con sesiones reales
// de comprador, negocio y admin. Se saltan si no hay claves de staging.
import { afterEach, describe, expect, it } from "vitest";
import { Escenario, admin, cambiarEstado, hayStaging, reservar } from "./helpers";

describe.skipIf(!hayStaging)("reservas en staging", { timeout: 60_000 }, () => {
  const esc = new Escenario();
  afterEach(() => esc.limpiar());

  it("dos compradores a la vez por el último cupo: solo uno reserva", async () => {
    const [a, b, dueno] = await Promise.all([esc.usuario("comprador"), esc.usuario("comprador"), esc.usuario("negocio")]);
    const negocio = await esc.negocio(dueno);
    const oferta = await esc.oferta(negocio, { cupos: 1 });

    const resultados = await Promise.all([reservar(a, oferta), reservar(b, oferta)]);
    const ok = resultados.filter((r) => !r.error);
    expect(ok).toHaveLength(1);
    expect(await esc.cupos(oferta)).toEqual({ cupos_disponibles: 0, estado: "agotada" });
  });

  it("rechazar (con motivo) y cancelar devuelven el cupo", async () => {
    const [comprador, dueno] = await Promise.all([esc.usuario("comprador"), esc.usuario("negocio")]);
    const negocio = await esc.negocio(dueno);
    const oferta = await esc.oferta(negocio, { cupos: 2 });

    const r1 = await reservar(comprador, oferta);
    expect(r1.error).toBeNull();
    expect((await esc.cupos(oferta)).cupos_disponibles).toBe(1);

    const sinMotivo = await cambiarEstado(dueno, r1.data.id, "rechazada");
    expect(sinMotivo.error?.message).toMatch(/motivo/i);

    const rechazo = await cambiarEstado(dueno, r1.data.id, "rechazada", { motivo_rechazo: "Se acabó el producto" });
    expect(rechazo.error).toBeNull();
    expect((await esc.cupos(oferta)).cupos_disponibles).toBe(2);

    const r2 = await reservar(comprador, oferta);
    expect((await esc.cupos(oferta)).cupos_disponibles).toBe(1);
    const cancelacion = await cambiarEstado(comprador, r2.data.id, "cancelada");
    expect(cancelacion.error).toBeNull();
    expect((await esc.cupos(oferta)).cupos_disponibles).toBe(2);
  });

  it("el código aparece solo al confirmar", async () => {
    const [comprador, dueno] = await Promise.all([esc.usuario("comprador"), esc.usuario("negocio")]);
    const oferta = await esc.oferta(await esc.negocio(dueno));

    const r = await reservar(comprador, oferta);
    expect(r.data.estado).toBe("solicitada");
    expect(r.data.codigo).toBeNull();

    const conf = await cambiarEstado(dueno, r.data.id, "confirmada");
    expect(conf.error).toBeNull();
    expect(conf.data.codigo).toMatch(/^[A-Z0-9]{6}$/);

    const { data: vista } = await comprador.db.from("reservas").select("codigo, estado").eq("id", r.data.id).single();
    expect(vista).toEqual({ codigo: conf.data.codigo, estado: "confirmada" });
  });

  it("la entrega exige el código correcto y un método de pago", async () => {
    const [comprador, dueno] = await Promise.all([esc.usuario("comprador"), esc.usuario("negocio")]);
    const oferta = await esc.oferta(await esc.negocio(dueno));
    const r = await reservar(comprador, oferta);
    const { data: conf } = await cambiarEstado(dueno, r.data.id, "confirmada");

    const malCodigo = await cambiarEstado(dueno, r.data.id, "entregada", { codigo: "ZZZZZZ", metodo_pago: "efectivo" });
    expect(malCodigo.error?.message).toMatch(/código/i);

    const sinPago = await cambiarEstado(dueno, r.data.id, "entregada", { codigo: conf.codigo });
    expect(sinPago.error?.message).toMatch(/método de pago/i);

    const ok = await cambiarEstado(dueno, r.data.id, "entregada", { codigo: conf.codigo.toLowerCase(), metodo_pago: "nequi" });
    expect(ok.error).toBeNull();
    expect(ok.data).toMatchObject({ estado: "entregada", metodo_pago: "nequi" });
  });

  it("el ahorro solo cuenta las reservas entregadas", async () => {
    const [comprador, dueno] = await Promise.all([esc.usuario("comprador"), esc.usuario("negocio")]);
    const negocio = await esc.negocio(dueno);
    const oferta = await esc.oferta(negocio, { habitual: 10000, final: 6000 });

    const entregada = await reservar(comprador, oferta, 2);
    const { data: conf } = await cambiarEstado(dueno, entregada.data.id, "confirmada");
    await cambiarEstado(dueno, entregada.data.id, "entregada", { codigo: conf.codigo, metodo_pago: "efectivo" });
    await reservar(comprador, oferta, 1); // queda solicitada: no suma

    const { data: ahorro, error } = await comprador.db.rpc("ahorro_comprador", { uid: comprador.id });
    expect(error).toBeNull();
    expect(Number(ahorro)).toBe(8000); // (10.000 − 6.000) × 2
  });

  it("el negocio A no ve las reservas del negocio B", async () => {
    const [comprador, duenoA, duenoB] = await Promise.all([
      esc.usuario("comprador"),
      esc.usuario("negocio"),
      esc.usuario("negocio"),
    ]);
    await esc.negocio(duenoA);
    const negocioB = await esc.negocio(duenoB);
    const r = await reservar(comprador, await esc.oferta(negocioB));

    const bandejaAjena = await duenoA.db.rpc("reservas_negocio", { negocio_id: negocioB });
    expect(bandejaAjena.error?.code).toBe("42501");

    const { data: directas } = await duenoA.db.from("reservas").select("id").eq("id", r.data.id);
    expect(directas).toEqual([]);

    const cambio = await cambiarEstado(duenoA, r.data.id, "confirmada");
    expect(cambio.error?.code).toBe("42501");

    // B sí la ve, sin correo ni teléfono del comprador.
    const { data: bandeja } = await duenoB.db.rpc("reservas_negocio", { negocio_id: negocioB });
    expect(bandeja).toHaveLength(1);
    expect(Object.keys(bandeja[0])).not.toContain("email");
  });

  it("un comprador no ve las reservas de otro", async () => {
    const [a, b, dueno] = await Promise.all([esc.usuario("comprador"), esc.usuario("comprador"), esc.usuario("negocio")]);
    const oferta = await esc.oferta(await esc.negocio(dueno));
    const r = await reservar(a, oferta);

    const { data } = await b.db.from("reservas").select("id");
    expect(data?.map((x) => x.id)).not.toContain(r.data.id);

    const ahorroAjeno = await b.db.rpc("ahorro_comprador", { uid: a.id });
    expect(ahorroAjeno.error?.code).toBe("42501");
  });

  it("la calificación solo va después de entregar, y una sola vez", async () => {
    const [comprador, dueno] = await Promise.all([esc.usuario("comprador"), esc.usuario("negocio")]);
    const negocio = await esc.negocio(dueno);
    const r = await reservar(comprador, await esc.oferta(negocio));
    const calificar = () =>
      comprador.db.from("calificaciones").insert({
        reserva_id: r.data.id,
        negocio_id: negocio,
        calidad: 5,
        aseo: 4,
        atencion: 5,
        comentario: "Todo muy bien",
      });

    expect((await calificar()).error).not.toBeNull();

    const { data: conf } = await cambiarEstado(dueno, r.data.id, "confirmada");
    await cambiarEstado(dueno, r.data.id, "entregada", { codigo: conf.codigo, metodo_pago: "tarjeta" });

    expect((await calificar()).error).toBeNull();
    expect((await calificar()).error).not.toBeNull();
  });

  it("la tarea programada marca no_recogida al vencer la ventana", async () => {
    const [comprador, dueno] = await Promise.all([esc.usuario("comprador"), esc.usuario("negocio")]);
    const oferta = await esc.oferta(await esc.negocio(dueno));
    const r = await reservar(comprador, oferta);
    await cambiarEstado(dueno, r.data.id, "confirmada");

    // Simula que la ventana ya terminó.
    const pasado = Date.now() - 60 * 60 * 1000;
    await admin
      .from("reservas")
      .update({
        recogida_desde: new Date(pasado - 60 * 60 * 1000).toISOString(),
        recogida_hasta: new Date(pasado).toISOString(),
      })
      .eq("id", r.data.id);

    const { error } = await admin.rpc("cerrar_vencidas");
    expect(error).toBeNull();
    const { data } = await admin.from("reservas").select("estado, no_recogida_en").eq("id", r.data.id).single();
    expect(data?.estado).toBe("no_recogida");
    expect(data?.no_recogida_en).not.toBeNull();
  });
});
