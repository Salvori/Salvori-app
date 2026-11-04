import { expect, test } from "@playwright/test";
import { USUARIOS, clienteComo, cookiesDeSesion, crearOfertaTemporal, hayStaging } from "./staging";

test.describe("flujo del comprador (staging)", () => {
  test.skip(!hayStaging, "Necesita .env.local de staging y los usuarios de prueba.");
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  let datos: Awaited<ReturnType<typeof crearOfertaTemporal>>;
  test.beforeAll(async () => {
    datos = await crearOfertaTemporal();
  });
  test.afterAll(async () => {
    await datos?.borrar();
  });

  test("la oferta aparece en la portada y lleva a /entrar sin sesión", async ({ page }) => {
    await page.goto("/");
    const tarjeta = page.locator("article", { hasText: datos.titulo });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta.getByText("Quedan 3")).toBeVisible();
    await tarjeta.getByRole("link", { name: "Reservar" }).click();
    await expect(page.getByRole("heading", { name: datos.titulo })).toBeVisible();
    await page.getByRole("link", { name: "Entrar para reservar" }).click();
    await expect(page).toHaveURL(/\/entrar\?next=%2Foferta%2F/);
    await expect(page.getByRole("checkbox")).toBeVisible();
  });

  test("reserva, el negocio confirma y el comprador ve el código", async ({ page, context, baseURL }) => {
    const dominio = new URL(baseURL!).hostname;
    await context.addCookies(await cookiesDeSesion(USUARIOS.comprador.email, USUARIOS.comprador.password, dominio));

    await page.goto(`/oferta/${datos.ofertaId}`);
    await page.getByRole("button", { name: "Agregar una unidad" }).click();
    await page.getByLabel("Observaciones (opcional)").fill("Prueba automática");
    await page.getByRole("button", { name: /^Reservar/ }).click();

    await expect(page).toHaveURL(/\/mis-reservas/);
    const reserva = page.locator("li[data-estado]", { hasText: datos.titulo });
    await expect(reserva.getByText("Esperando confirmación del negocio")).toBeVisible();
    await expect(reserva.getByTestId("codigo")).toHaveCount(0);

    // Otro «navegador»: el negocio confirma por RPC.
    const negocio = await clienteComo(USUARIOS.negocio.email, USUARIOS.negocio.password);
    const { data: bandeja } = await negocio.rpc("reservas_negocio", { negocio_id: datos.negocioId });
    const pendiente = (bandeja ?? []).find((r: { estado: string }) => r.estado === "solicitada");
    expect(pendiente).toBeTruthy();
    const { error } = await negocio.rpc("cambiar_estado_reserva", { reserva_id: pendiente.id, nuevo_estado: "confirmada", datos: {} });
    expect(error).toBeNull();

    // Llega por tiempo real, sin recargar.
    await expect(reserva.getByText("Confirmada: ya puedes ir")).toBeVisible({ timeout: 15_000 }); // el respaldo refresca a los 20 s: esto prueba Realtime
    await expect(reserva.getByTestId("codigo")).toHaveText(/^[A-Z0-9]{6}$/);
  });
});
