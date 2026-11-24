import { expect, test } from "@playwright/test";
import { USUARIOS, admin, clienteComo, cookiesDeSesion, crearOfertaTemporal, faltaMigracionMarca, hayStaging, SIN_MIGRACION_MARCA } from "./staging";

// P4 · 10. Puntaje de cumplimiento en pantalla: el negocio ve el puntaje del comprador y usa «No pude cumplir»;
// el comprador ve el motivo y puede cancelar una reserva ya confirmada (con advertencia).
test.describe("puntaje de cumplimiento (staging)", () => {
  test.skip(!hayStaging, "Necesita .env.local de staging y los usuarios de prueba.");
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  let datos: Awaited<ReturnType<typeof crearOfertaTemporal>>;
  let slug = "";

  async function reservaConfirmada() {
    const comprador = await clienteComo(USUARIOS.comprador.email, USUARIOS.comprador.password);
    const { data, error } = await comprador.rpc("solicitar_reserva", { oferta_id: datos.ofertaId, cantidad: 1, observaciones: "" });
    expect(error).toBeNull();
    const id = (data as { id: string }).id;
    const negocio = await clienteComo(USUARIOS.negocio.email, USUARIOS.negocio.password);
    const { error: e2 } = await negocio.rpc("cambiar_estado_reserva", { reserva_id: id, nuevo_estado: "confirmada", datos: {} });
    expect(e2).toBeNull();
    return id;
  }

  test.beforeAll(async () => {
    test.skip(await faltaMigracionMarca(), SIN_MIGRACION_MARCA);
    datos = await crearOfertaTemporal();
    slug = (await admin().from("negocios").select("slug").eq("id", datos.negocioId).single()).data!.slug;
  });
  test.afterAll(async () => {
    await datos?.borrar();
  });

  test("el negocio ve el puntaje y marca «No pude cumplir»; el comprador ve el motivo", async ({ browser, baseURL }) => {
    const dominio = new URL(baseURL!).hostname;
    const id = await reservaConfirmada();

    const ctxNegocio = await browser.newContext({ ...test.info().project.use, baseURL });
    await ctxNegocio.addCookies(await cookiesDeSesion(USUARIOS.negocio.email, USUARIOS.negocio.password, dominio));
    const negocio = await ctxNegocio.newPage();
    await negocio.goto(`/negocio?n=${slug}`);
    const tarjeta = negocio.locator('li[data-estado="confirmada"]', { hasText: datos.titulo });
    await expect(tarjeta.getByText(/Cumplimiento \d,\d\/5|Comprador nuevo/)).toBeVisible();

    await tarjeta.getByRole("button", { name: "No pude cumplir" }).click();
    await tarjeta.getByPlaceholder(/Qué pasó/).fill("Se agotó el pan");
    await tarjeta.getByRole("button", { name: "Cancelar reserva" }).click();
    // La tarjeta pasa al historial con la marca y el motivo.
    const cerrada = negocio.locator('li[data-estado="cancelada"]', { hasText: datos.titulo });
    await expect(cerrada.getByText("No pudiste cumplir")).toBeVisible();
    await expect(cerrada.getByText("Motivo: Se agotó el pan")).toBeVisible();

    const { data: fila } = await admin().from("reservas").select("estado, incumplida_por, motivo_incumplimiento").eq("id", id).single();
    expect(fila).toEqual({ estado: "cancelada", incumplida_por: "negocio", motivo_incumplimiento: "Se agotó el pan" });

    const ctxComprador = await browser.newContext({ ...test.info().project.use, baseURL });
    await ctxComprador.addCookies(await cookiesDeSesion(USUARIOS.comprador.email, USUARIOS.comprador.password, dominio));
    const comprador = await ctxComprador.newPage();
    await comprador.goto("/mis-reservas");
    await expect(comprador.getByText(/no pudo cumplir: Se agotó el pan/).first()).toBeVisible();
    await ctxNegocio.close();
    await ctxComprador.close();
  });

  test("el comprador cancela una reserva confirmada con advertencia y ve su puntaje", async ({ page, context, baseURL }) => {
    const id = await reservaConfirmada();
    await context.addCookies(await cookiesDeSesion(USUARIOS.comprador.email, USUARIOS.comprador.password, new URL(baseURL!).hostname));
    await page.goto("/mis-reservas");
    const tarjeta = page.locator('li[data-estado="confirmada"]', { hasText: datos.titulo });
    let aviso = "";
    page.once("dialog", (d) => {
      aviso = d.message();
      void d.accept();
    });
    await tarjeta.getByRole("button", { name: "No puedo ir, cancelar" }).click();
    await expect.poll(async () => (await admin().from("reservas").select("estado").eq("id", id).single()).data?.estado).toBe("cancelada");
    expect(aviso).toMatch(/tu puntaje de cumplimiento baja/);

    await page.goto("/perfil");
    await expect(page.getByRole("heading", { name: "Tu puntaje de cumplimiento" })).toBeVisible();
    await expect(page.getByText(/^(\d,\d\/5|Nuevo)$/)).toBeVisible();
  });
});
