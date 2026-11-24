import { expect, test } from "@playwright/test";
import { USUARIOS, admin, clienteComo, cookiesDeSesion, crearOfertaTemporal, faltaMigracionMarca, hayStaging, SIN_MIGRACION_MARCA } from "./staging";

// P4 · calificación después de la entrega: una sola vez, y el promedio aparece en la ficha del negocio.
test.describe("calificación tras la entrega (staging)", () => {
  test.skip(!hayStaging, "Necesita .env.local de staging y los usuarios de prueba.");
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  let datos: Awaited<ReturnType<typeof crearOfertaTemporal>>;
  let reservaId = "";

  test.beforeAll(async () => {
    test.skip(await faltaMigracionMarca(), SIN_MIGRACION_MARCA);
    datos = await crearOfertaTemporal();
    // Reserva entregada sin pasar por la interfaz: comprador reserva y el negocio confirma y entrega por RPC.
    const comprador = await clienteComo(USUARIOS.comprador.email, USUARIOS.comprador.password);
    const { data: reserva, error } = await comprador.rpc("solicitar_reserva", { oferta_id: datos.ofertaId, cantidad: 1, observaciones: "" });
    expect(error).toBeNull();
    reservaId = (reserva as { id: string }).id;
    const negocio = await clienteComo(USUARIOS.negocio.email, USUARIOS.negocio.password);
    const { data: conf } = await negocio.rpc("cambiar_estado_reserva", { reserva_id: reservaId, nuevo_estado: "confirmada", datos: {} });
    const codigo = (conf as { codigo: string }).codigo;
    const { error: e2 } = await negocio.rpc("cambiar_estado_reserva", {
      reserva_id: reservaId,
      nuevo_estado: "entregada",
      datos: { codigo, metodo_pago: "efectivo" },
    });
    expect(e2).toBeNull();
  });
  test.afterAll(async () => {
    await datos?.borrar();
  });

  test("el comprador califica una vez y el promedio sale en la ficha", async ({ page, context, baseURL }) => {
    await context.addCookies(await cookiesDeSesion(USUARIOS.comprador.email, USUARIOS.comprador.password, new URL(baseURL!).hostname));
    await page.goto("/mis-reservas");
    const tarjeta = page.locator('li[data-estado="entregada"]', { hasText: datos.titulo });
    await expect(tarjeta.getByText(/^Ahorraste/)).toBeVisible();

    // Sin estrellas no deja enviar.
    await tarjeta.getByRole("button", { name: "Enviar calificación" }).click();
    await expect(tarjeta.getByRole("alert")).toHaveText(/Califica calidad, aseo y atención/);

    await tarjeta.getByLabel("Calidad: 5 de 5").check({ force: true });
    await tarjeta.getByLabel("Aseo: 4 de 5").check({ force: true });
    await tarjeta.getByLabel("Atención: 3 de 5").check({ force: true });
    await tarjeta.getByLabel("Comentario (opcional)").fill("Prueba automática de calificación");
    await tarjeta.getByRole("button", { name: "Enviar calificación" }).click();
    // La página se refresca sola y deja el aviso permanente.
    await expect(tarjeta.getByText("Ya calificaste esta compra")).toBeVisible();

    const { data: fila } = await admin().from("calificaciones").select("calidad, aseo, atencion, comentario").eq("reserva_id", reservaId).single();
    expect(fila).toEqual({ calidad: 5, aseo: 4, atencion: 3, comentario: "Prueba automática de calificación" });

    // Al recargar sigue sin ofrecer calificar de nuevo.
    await page.reload();
    await expect(tarjeta.getByText("Ya calificaste esta compra")).toBeVisible();
    await expect(tarjeta.getByRole("button", { name: "Enviar calificación" })).toHaveCount(0);

    // Una segunda calificación directa la rechaza la base de datos.
    const comprador = await clienteComo(USUARIOS.comprador.email, USUARIOS.comprador.password);
    const { error } = await comprador
      .from("calificaciones")
      .insert({ reserva_id: reservaId, negocio_id: datos.negocioId, calidad: 1, aseo: 1, atencion: 1 });
    expect(error?.code).toBe("23505");

    // Promedio (5+4+3)/3 = 4,0 con 1 calificación en la página del negocio.
    const { data: n } = await admin().from("negocios").select("slug").eq("id", datos.negocioId).single();
    await page.goto(`/n/${n!.slug}`);
    await expect(page.getByText("4,0").first()).toBeVisible();
    await expect(page.getByText("(1 calificación)")).toBeVisible();
  });
});
