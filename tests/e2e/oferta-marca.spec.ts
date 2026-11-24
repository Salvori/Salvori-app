import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { SIN_MIGRACION_MARCA, USUARIOS, admin, cookiesDeSesion, crearOfertaTemporal, faltaMigracionMarca, hayStaging } from "./staging";

// Logo del negocio, ficha pública /n/<slug>, tamaño, «Lleva 3, paga 2» y origen negocio:<slug>.
test.describe("oferta y marca del negocio (staging)", () => {
  test.skip(!hayStaging, "Necesita .env.local de staging y los usuarios de prueba.");
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let datos: Awaited<ReturnType<typeof crearOfertaTemporal>>;
  let slug = "";
  let nombre = "";

  test.beforeAll(async () => {
    test.skip(await faltaMigracionMarca(), SIN_MIGRACION_MARCA);
    datos = await crearOfertaTemporal();
    const db = admin();
    const { data } = await db.from("negocios").select("slug, nombre").eq("id", datos.negocioId).single();
    slug = data!.slug;
    nombre = data!.nombre;
    // La oferta temporal (9.000 → 6.000) pasa a «Lleva 3, paga 2» a $ 3.000 la unidad, con tamaño.
    const { error } = await db.from("ofertas").update({ formato: "lleva_paga", lleva: 3, paga: 2, tamano: "500 g" }).eq("id", datos.ofertaId);
    expect(error).toBeNull();
  });
  test.afterAll(async () => {
    await datos?.borrar();
  });

  test("tarjeta con insignia, tamaño, paquetes y avatar; enlace a la ficha del negocio", async ({ page, context }) => {
    await page.goto("/");
    const tarjeta = page.locator("article", { hasText: datos.titulo });
    await expect(tarjeta.getByText("Lleva 3, paga 2")).toBeVisible();
    await expect(tarjeta.getByText("500 g")).toBeVisible();
    await expect(tarjeta.getByText("3 paquetes disponibles")).toBeVisible();
    await expect(tarjeta.getByTestId("avatar-negocio")).toHaveText("N"); // «Negocio E2E …» sin logo

    await tarjeta.getByRole("link", { name: nombre }).click();
    await expect(page).toHaveURL(new RegExp(`/n/${slug}$`));
    await expect(page.getByRole("heading", { name: nombre, level: 1 })).toBeVisible();
    await expect(page.getByText("Panadería y pastelería")).toBeVisible();
    await expect(page.getByText("Calle E2E")).toBeVisible();
    await expect(page.locator(".leaflet-container .pin-local")).toBeVisible();
    await expect(page.locator("article article", { hasText: datos.titulo })).toBeVisible();

    await expect(async () => {
      const cookie = (await context.cookies()).find((c) => c.name === "salvori_origen");
      expect(cookie?.value).toBe(`negocio:${slug}`);
    }).toPass({ timeout: 10_000 });
  });

  test("la reserva desde la ficha del negocio se hace por paquetes y guarda el origen", async ({ page, context, baseURL }) => {
    await context.addCookies(await cookiesDeSesion(USUARIOS.comprador.email, USUARIOS.comprador.password, new URL(baseURL!).hostname));
    await page.goto(`/n/${slug}`);
    await page.locator("article article", { hasText: datos.titulo }).getByRole("link", { name: /Reservar/ }).click();
    await expect(page.getByRole("heading", { name: datos.titulo })).toBeVisible();
    await expect(page.getByText("Tamaño: 500 g")).toBeVisible();
    await expect(page.getByText(/Cada paquete trae 3 unidades y pagas 2/)).toBeVisible();
    await expect(page.getByText("Paquetes", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^Reservar/ }).click();
    await expect(page).toHaveURL(/\/mis-reservas/);
    await expect(page.locator("li[data-estado]", { hasText: datos.titulo })).toContainText("paquete lleva 3, paga 2");

    const { data: reserva } = await admin().from("reservas").select("origen, cantidad, precio_unitario").eq("oferta_id", datos.ofertaId).single();
    expect(reserva).toMatchObject({ origen: `negocio:${slug}`, cantidad: 1, precio_unitario: 6000 });
  });

  test("el negocio ve su local en el mapa, sube su logo y publica un «Lleva y paga»", async ({ page, context, baseURL }) => {
    await context.addCookies(await cookiesDeSesion(USUARIOS.negocio.email, USUARIOS.negocio.password, new URL(baseURL!).hostname));
    await page.goto(`/negocio?n=${slug}`);
    const local = page.getByRole("region", { name: "Tu local en Salvori" });
    await expect(local).toContainText("Calle E2E");
    await expect(local.locator(".leaflet-container .pin-local")).toBeVisible();
    await expect(local.getByTestId("aviso-coordenadas")).toHaveCount(0);

    // Logo: una imagen generada con el propio navegador.
    const lienzo = await context.newPage();
    await lienzo.setContent('<div style="width:300px;height:300px;background:#174C3C"></div>');
    const imagen = await lienzo.screenshot({ type: "png" });
    await lienzo.close();
    await expect(async () => {
      await local.getByLabel("Logo del negocio").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: imagen });
      await expect(local.getByText("Logo actualizado.")).toBeVisible({ timeout: 15_000 });
    }).toPass({ timeout: 45_000 });
    const { data: neg } = await admin().from("negocios").select("logo_url").eq("id", datos.negocioId).single();
    expect(neg!.logo_url).toMatch(new RegExp(`^negocios/${datos.negocioId}/logo\\.webp\\?v=\\d+$`));

    // Publica «Lleva 2, paga 1» con tamaño.
    const titulo = `Pandebono 2x1 ${randomUUID().slice(0, 6)}`;
    await page.goto(`/negocio/publicar?n=${slug}`);
    await expect(async () => {
      await page.getByTestId("foto").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: imagen });
      await expect(page.getByAltText("Foto de la oferta")).toBeVisible({ timeout: 10_000 });
    }).toPass({ timeout: 45_000 });
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("radio", { name: "Lleva y paga" }).click();
    await page.getByLabel("Título").fill(titulo);
    await page.getByLabel("Qué recibe exactamente").fill("Pandebonos medianos horneados hoy");
    await page.getByLabel("Tamaño o gramaje (opcional)").fill("mediano");
    await page.getByLabel("Lleva").fill("2");
    await page.getByLabel("Paga", { exact: true }).fill("1");
    await page.getByLabel("Precio por unidad").fill("2500");
    await expect(page.getByTestId("calculo-lleva-paga")).toContainText("Lleva 2, paga 1");
    await page.getByLabel("Paquetes disponibles").fill("4");
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByLabel("Vista previa")).toContainText("Lleva 2, paga 1");
    await page.getByRole("button", { name: "Publicar oferta" }).click();
    await expect(page.getByText("¡Oferta publicada!")).toBeVisible();

    const { data: o } = await admin().from("ofertas").select("formato, lleva, paga, tamano, precio_habitual, precio_final, cupos_total").eq("titulo", titulo).single();
    expect(o).toMatchObject({ formato: "lleva_paga", lleva: 2, paga: 1, tamano: "mediano", precio_habitual: 5000, precio_final: 2500, cupos_total: 4 });
  });
});
