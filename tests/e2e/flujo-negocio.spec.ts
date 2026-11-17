import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { USUARIOS, admin, cookiesDeSesion, crearOfertaTemporal, hayStaging, publicarEnTresPasos } from "./staging";

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
    await datos?.borrar(); // también las fotos subidas desde el formulario
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

    await negocio.goto(`/negocio/publicar?n=${slug}`);
    await publicarEnTresPasos(negocio, titulo);
    await expect(negocio.getByText("¡Oferta publicada!")).toBeVisible();
    await expect(negocio.getByText(titulo)).toBeVisible();
    const { data: publicada } = await admin().from("ofertas").select("id, tipo, elaborado_en").eq("titulo", titulo).single();
    expect(publicada).toMatchObject({ tipo: "comercial", elaborado_en: null });

    // --- Negocio programa la oferta por días y hora ---
    const fila = negocio.locator(`[data-oferta="${publicada!.id}"]`);
    await fila.getByText("Programar", { exact: true }).click();
    await fila.getByLabel("Sábado").check({ force: true });
    await fila.getByRole("button", { name: "Guardar programación" }).click();
    const programada = negocio.locator(`[data-programacion="${publicada!.id}"]`);
    await expect(programada).toContainText("Se publica lun, mar, mié, jue, vie y sáb", { timeout: 15_000 });
    const { data: plan } = await admin().from("oferta_programacion").select("dias_semana, activa, ultima_publicacion").eq("plantilla_oferta_id", publicada!.id).single();
    // La hora de hoy ya pasó: no se duplica la oferta de hoy, empieza el próximo día.
    expect(plan).toMatchObject({ dias_semana: [1, 2, 3, 4, 5, 6], activa: true });
    expect(plan!.ultima_publicacion).not.toBeNull();
    await programada.getByRole("button", { name: "Pausar" }).click();
    await expect(programada).toContainText("En pausa");

    // --- Cambia los cupos mientras no tenga reservas ---
    await fila.getByText("Cambiar cupos").click();
    await fila.getByLabel("Cupos", { exact: true }).fill("6");
    await fila.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(fila.getByText("Ahora tiene 6 cupos.")).toBeVisible();
    await expect(fila).toContainText("6/6 cupos");

    // --- Duplicar abre el formulario con los datos de la oferta ---
    await fila.getByRole("link", { name: "Duplicar" }).click();
    await expect(negocio.getByText(`Copia de «${titulo}»`)).toBeVisible();
    await expect(negocio.getByAltText("Foto de la oferta")).toBeVisible();
    await negocio.getByRole("button", { name: "Siguiente" }).click();
    await expect(negocio.getByLabel("Título")).toHaveValue(titulo);
    await expect(negocio.getByLabel("Precio Salvori")).toHaveValue("8000");
    await expect(negocio.getByLabel("Cupos disponibles")).toHaveValue("6");

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
