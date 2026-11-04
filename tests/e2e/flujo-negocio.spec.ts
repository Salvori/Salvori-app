import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { USUARIOS, admin, cookiesDeSesion, crearOfertaTemporal, hayStaging } from "./staging";

test.describe("demo: negocio publica, comprador reserva, negocio confirma y entrega", () => {
  test.skip(!hayStaging, "Necesita .env.local de staging y los usuarios de prueba.");
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let datos: Awaited<ReturnType<typeof crearOfertaTemporal>>;
  let slug = "";
  test.beforeAll(async () => {
    datos = await crearOfertaTemporal();
    const { data } = await admin().from("negocios").select("slug").eq("id", datos.negocioId).single();
    slug = data!.slug;
  });
  test.afterAll(async () => {
    // Borra también las fotos subidas desde el formulario.
    const db = admin();
    const { data: fotos } = await db.storage.from("ofertas").list(datos.negocioId);
    if (fotos?.length) await db.storage.from("ofertas").remove(fotos.map((f) => `${datos.negocioId}/${f.name}`));
    await datos?.borrar();
  });

  test("un comprador que abre /negocio vuelve a la portada", async ({ page, context, baseURL }) => {
    await context.addCookies(await cookiesDeSesion(USUARIOS.comprador.email, USUARIOS.comprador.password, new URL(baseURL!).hostname));
    await page.goto("/negocio");
    await expect(page).toHaveURL(/\/$/);
  });

  test("flujo completo", async ({ browser, baseURL }) => {
    const dominio = new URL(baseURL!).hostname;
    const titulo = `Combo demo ${randomUUID().slice(0, 6)}`;

    // --- Negocio publica en 3 pasos ---
    const ctxNegocio = await browser.newContext({ ...test.info().project.use, baseURL });
    await ctxNegocio.addCookies(await cookiesDeSesion(USUARIOS.negocio.email, USUARIOS.negocio.password, dominio));
    const negocio = await ctxNegocio.newPage();

    // Foto: una imagen generada en el propio navegador.
    await negocio.setContent('<div style="width:600px;height:450px;background:linear-gradient(135deg,#F57A35,#F8F5EA)"></div>');
    const foto = await negocio.screenshot({ type: "png" });

    await negocio.goto(`/negocio/publicar?n=${slug}`);
    await negocio.getByTestId("foto").setInputFiles({ name: "combo.png", mimeType: "image/png", buffer: foto });
    await expect(negocio.getByAltText("Foto de la oferta")).toBeVisible({ timeout: 20_000 });
    await negocio.getByRole("button", { name: "Siguiente" }).click();

    await negocio.getByRole("radio", { name: "Promoción o combo" }).click();
    await negocio.getByLabel("Título").fill(titulo);
    await negocio.getByLabel("Qué recibe exactamente").fill("2 empanadas de pipián y una gaseosa personal");
    await negocio.getByLabel("Precio habitual").fill("12000");
    await negocio.getByLabel("Precio Salvori").fill("8000");
    await expect(negocio.getByText("Descuento: 33%")).toBeVisible();
    await negocio.getByLabel("Cupos disponibles").fill("4");
    await negocio.getByRole("button", { name: "Siguiente" }).click();

    await expect(negocio.getByLabel("Vista previa")).toContainText(titulo);
    await negocio.getByRole("button", { name: "Publicar oferta" }).click();
    await expect(negocio.getByText("¡Oferta publicada!")).toBeVisible();
    await expect(negocio.getByText(titulo)).toBeVisible();

    // El negocio deja abierta su bandeja.
    await negocio.goto(`/negocio?n=${slug}`);
    await expect(negocio.getByText("Aún no hay reservas hoy")).toBeVisible();

    // --- Comprador reserva ---
    const ctxComprador = await browser.newContext({ ...test.info().project.use, baseURL });
    await ctxComprador.addCookies(await cookiesDeSesion(USUARIOS.comprador.email, USUARIOS.comprador.password, dominio));
    const comprador = await ctxComprador.newPage();
    await comprador.goto("/");
    await comprador.locator("article", { hasText: titulo }).getByRole("link", { name: "Reservar" }).click();
    await comprador.getByRole("button", { name: /^Reservar/ }).click();
    const miReserva = comprador.locator("li[data-estado]", { hasText: titulo });
    await expect(miReserva.getByText("Esperando confirmación del negocio")).toBeVisible();

    // --- Negocio recibe el aviso y confirma ---
    await expect(negocio.getByText("¡Nueva reserva!")).toBeVisible({ timeout: 15_000 });
    const tarjeta = negocio.locator("li[data-estado]", { hasText: titulo });
    await tarjeta.getByRole("button", { name: "Confirmar" }).click();
    await expect(negocio.locator('li[data-estado="confirmada"]', { hasText: titulo })).toBeVisible();

    // --- Comprador ve el código ---
    await expect(miReserva.getByText("Confirmada: ya puedes ir")).toBeVisible({ timeout: 15_000 });
    const codigo = (await miReserva.getByTestId("codigo").textContent())!.trim();
    expect(codigo).toMatch(/^[A-Z0-9]{6}$/);

    // --- Negocio entrega con el código ---
    const confirmada = negocio.locator('li[data-estado="confirmada"]', { hasText: titulo });
    await confirmada.getByRole("button", { name: "Entregar" }).click();
    await confirmada.getByLabel("Código del comprador").fill("ZZZZZZ");
    await confirmada.getByRole("button", { name: "Confirmar entrega" }).click();
    await expect(confirmada.getByText("El código no coincide")).toBeVisible();
    await confirmada.getByLabel("Código del comprador").fill(codigo.toLowerCase());
    await confirmada.getByText("nequi").click();
    await confirmada.getByRole("button", { name: "Confirmar entrega" }).click();
    await expect(negocio.locator('li[data-estado="entregada"]', { hasText: titulo })).toBeVisible();
    await expect(negocio.getByText("entregadas hoy").locator("..")).toContainText("1");

    // --- El comprador ve su ahorro ---
    await expect(miReserva.getByText("Ahorraste $ 4.000")).toBeVisible({ timeout: 25_000 });

    await ctxNegocio.close();
    await ctxComprador.close();
  });
});
