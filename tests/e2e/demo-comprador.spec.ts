import { expect, test } from "@playwright/test";
import { USUARIOS, admin, clienteComo, cookiesDeSesion, crearOfertaTemporal, hayStaging, SIN_MIGRACION_MARCA, faltaMigracionMarca } from "./staging";

// Negocio edita un combo y su descuento → comprador guarda su dirección → ve el pin y la
// distancia → reserva → negocio confirma → comprador descarga el ticket (PNG y PDF).
test.describe("demo del comprador: combo editado, dirección, mapa y ticket", () => {
  test.skip(!hayStaging, "Necesita .env.local de staging y los usuarios de prueba.");
  test.beforeAll(async () => {
    test.skip(await faltaMigracionMarca(), SIN_MIGRACION_MARCA);
  });
  test.describe.configure({ mode: "serial", timeout: 150_000 });

  let datos: Awaited<ReturnType<typeof crearOfertaTemporal>>;
  let slug = "";
  let nombreNegocio = "";
  let compradorId = "";

  test.beforeAll(async () => {
    const db = admin();
    // La migración 20261118000000 agrega ofertas.formato y direcciones_comprador.
    const { error } = await db.from("direcciones_comprador").select("user_id").limit(1);
    test.skip(Boolean(error), "Falta aplicar la migración 20261118000000_demo_comprador en staging.");

    datos = await crearOfertaTemporal();
    const { data } = await db.from("negocios").select("slug, nombre").eq("id", datos.negocioId).single();
    slug = data!.slug;
    nombreNegocio = data!.nombre;
    const { data: lista } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
    compradorId = lista!.users.find((u) => u.email === USUARIOS.comprador.email)!.id;
    await db.from("direcciones_comprador").delete().eq("user_id", compradorId);
  });

  test.afterAll(async () => {
    if (compradorId) await admin().from("direcciones_comprador").delete().eq("user_id", compradorId);
    await datos?.borrar();
  });

  test("flujo completo", async ({ browser, baseURL }) => {
    const dominio = new URL(baseURL!).hostname;

    // --- El negocio edita el combo: lo vuelve «Promoción» y sube el descuento ---
    const ctxNegocio = await browser.newContext({ ...test.info().project.use, baseURL });
    await ctxNegocio.addCookies(await cookiesDeSesion(USUARIOS.negocio.email, USUARIOS.negocio.password, dominio));
    const negocio = await ctxNegocio.newPage();
    await negocio.goto(`/negocio/ofertas?n=${slug}`);
    await negocio.locator(`[data-oferta="${datos.ofertaId}"]`).getByRole("link", { name: "Editar" }).click();
    await expect(negocio.getByRole("heading", { name: `Editar «${datos.titulo}»` })).toBeVisible({ timeout: 20_000 }); // la primera visita compila la ruta en dev
    await expect(negocio.getByAltText("Foto de la oferta")).toBeVisible();
    await negocio.getByRole("button", { name: "Siguiente" }).click();
    await expect(negocio.getByLabel("Título")).toHaveValue(datos.titulo);
    await negocio.getByRole("radio", { name: "Promoción" }).click();
    await negocio.getByLabel("Precio Salvori").fill("4500");
    await expect(negocio.getByText("Descuento: 50%")).toBeVisible(); // en vivo, al escribir
    await negocio.getByRole("button", { name: "Siguiente" }).click();
    await expect(negocio.getByLabel("Vista previa")).toContainText("Promoción");
    await expect(negocio.getByLabel("Vista previa")).toContainText("−50 %");
    await negocio.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(negocio.getByText("Cambios guardados.")).toBeVisible({ timeout: 20_000 });
    const { data: editada } = await admin().from("ofertas").select("precio_final, formato, tipo").eq("id", datos.ofertaId).single();
    expect(editada).toEqual({ precio_final: 4500, formato: "promocion", tipo: "comercial" });

    // --- El comprador guarda su dirección (pin en el mapa) ---
    const ctxComprador = await browser.newContext({ ...test.info().project.use, baseURL });
    await ctxComprador.addCookies(await cookiesDeSesion(USUARIOS.comprador.email, USUARIOS.comprador.password, dominio));
    const comprador = await ctxComprador.newPage();
    await comprador.goto("/");
    await expect(comprador.getByRole("link", { name: "Guarda tu dirección" })).toBeVisible();
    await comprador.getByRole("link", { name: "Guarda tu dirección" }).click();
    await expect(comprador).toHaveURL(/\/perfil/);
    await comprador.getByLabel("Tu dirección en Popayán").fill("Calle 5 # 4-50, Centro");
    await comprador.getByRole("button", { name: "Ubicar en el mapa" }).click();
    // En pruebas el geocodificador está apagado (SALVORI_GEOCODIFICADOR=desactivado): se mueve el pin a mano.
    await expect(comprador.getByText(/La ubicamos|No pudimos buscar|No encontramos/)).toBeVisible({ timeout: 15_000 });
    const mapa = comprador.locator(".leaflet-container");
    await expect(mapa.locator(".pin-comprador")).toBeVisible();
    const caja = (await mapa.boundingBox())!;
    await comprador.mouse.click(caja.x + caja.width / 2 + 30, caja.y + caja.height / 2 + 20);
    await comprador.getByRole("button", { name: "Guardar dirección" }).click();
    await expect(comprador).toHaveURL(new URL("/", baseURL).toString(), { timeout: 20_000 }); // vuelve a la portada (next=/)
    const { data: dir } = await admin().from("direcciones_comprador").select("direccion, lat, lng").eq("user_id", compradorId).single();
    expect(dir!.direccion).toBe("Calle 5 # 4-50, Centro");
    expect(Math.abs(dir!.lat - 2.4419)).toBeLessThan(0.02);
    expect(Math.abs(dir!.lng + 76.6063)).toBeLessThan(0.02);

    // --- Ve la tarjeta con etiqueta, descuento y distancia desde su dirección ---
    await expect(comprador.getByText("Distancias en línea recta desde tu dirección: Calle 5 # 4-50, Centro.")).toBeVisible();
    const tarjeta = comprador.locator("article", { hasText: datos.titulo });
    await expect(tarjeta.getByText("Promoción")).toBeVisible();
    await expect(tarjeta.getByText("−50 %")).toBeVisible();
    await expect(tarjeta.getByText("3 unidades disponibles")).toBeVisible();
    await expect(tarjeta.getByText(/min a pie/)).toBeVisible();
    await expect(tarjeta.locator(".line-through")).toHaveText("$ 9.000");

    // --- Mapa: su pin y el del negocio, con popup y enlace a la ficha ---
    await comprador.getByRole("button", { name: "Mapa" }).click();
    const mapaOfertas = comprador.locator(".leaflet-container");
    await expect(mapaOfertas.locator(".pin-comprador")).toBeVisible();
    const pin = mapaOfertas.locator(`.pin-negocio[title="${nombreNegocio}"]`);
    await expect(pin).toBeVisible();
    await pin.click();
    const popup = comprador.locator(".leaflet-popup");
    await expect(popup).toContainText(nombreNegocio);
    await expect(popup).toContainText(datos.titulo);
    await expect(popup).toContainText(/min a pie/);
    await popup.getByRole("link", { name: new RegExp(datos.titulo) }).click();

    // --- Reserva desde la ficha ---
    await expect(comprador.getByRole("heading", { name: datos.titulo })).toBeVisible();
    await comprador.getByRole("button", { name: /^Reservar/ }).click();
    await expect(comprador).toHaveURL(/\/mis-reservas/);
    const miReserva = comprador.locator("li[data-estado]", { hasText: datos.titulo });
    await expect(miReserva.getByText("Esperando confirmación del negocio")).toBeVisible();

    // --- El negocio confirma ---
    const db = await clienteComo(USUARIOS.negocio.email, USUARIOS.negocio.password);
    const { data: bandeja } = await db.rpc("reservas_negocio", { negocio_id: datos.negocioId });
    const pendiente = (bandeja ?? []).find((r: { estado: string }) => r.estado === "solicitada");
    const { error } = await db.rpc("cambiar_estado_reserva", { reserva_id: pendiente.id, nuevo_estado: "confirmada", datos: {} });
    expect(error).toBeNull();

    // --- El comprador ve el ticket y lo descarga ---
    const ticket = miReserva.getByTestId("ticket");
    await expect(ticket).toBeVisible({ timeout: 25_000 });
    const codigo = (await ticket.getByTestId("codigo").textContent())!.trim();
    expect(codigo).toMatch(/^[A-Z0-9]{6}$/);
    await expect(ticket).toContainText(`1 × ${datos.titulo}`);
    await expect(ticket).toContainText(nombreNegocio);
    await expect(ticket).toContainText("Calle E2E");
    await expect(ticket).toContainText(/Recoge de \d{2}:\d{2} a \d{2}:\d{2}/);
    await expect(ticket).toContainText("Pagas en el local al recoger · $ 4.500");

    const [png] = await Promise.all([comprador.waitForEvent("download"), miReserva.getByRole("button", { name: "Descargar imagen" }).click()]);
    expect(png.suggestedFilename()).toBe(`salvori-reserva-${codigo}.png`);
    const [pdf] = await Promise.all([comprador.waitForEvent("download"), miReserva.getByRole("button", { name: "Descargar PDF" }).click()]);
    expect(pdf.suggestedFilename()).toBe(`salvori-reserva-${codigo}.pdf`);
    const bytes = await (await pdf.createReadStream()).toArray();
    expect(Buffer.concat(bytes).subarray(0, 5).toString()).toBe("%PDF-");

    await ctxNegocio.close();
    await ctxComprador.close();
  });
});
