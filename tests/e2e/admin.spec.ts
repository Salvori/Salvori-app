import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { USUARIOS, admin, borrarNegocio, clienteComo, cookiesDeSesion, hayAdmin, publicarEnTresPasos } from "./staging";

test.describe("admin: crea un negocio, vincula su usuario, publica por él y gestiona sus reservas", () => {
  test.skip(!hayAdmin, "Necesita .env.local de staging y los usuarios de prueba (incluido el admin).");
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  const sufijo = randomUUID().slice(0, 6);
  const nombre = `Negocio E2E admin ${sufijo}`;
  const slug = `negocio-e2e-admin-${sufijo}`;
  let negocioId = "";

  test.afterAll(async () => {
    const db = admin();
    if (!negocioId) negocioId = (await db.from("negocios").select("id").eq("slug", slug).maybeSingle()).data?.id ?? "";
    if (negocioId) await borrarNegocio(negocioId);
  });

  for (const rol of ["comprador", "negocio"] as const) {
    test(`un ${rol} que abre /admin vuelve a la portada`, async ({ page, context, baseURL }) => {
      await context.addCookies(await cookiesDeSesion(USUARIOS[rol].email, USUARIOS[rol].password, new URL(baseURL!).hostname));
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/$/);
      await page.goto("/admin/reservas");
      await expect(page).toHaveURL(/\/$/);
    });
  }

  test("sin sesión, /admin pide entrar", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/entrar\?next=(%2F|\/)admin/);
  });

  test("flujo completo del admin", async ({ page, context, baseURL }) => {
    await context.addCookies(await cookiesDeSesion(USUARIOS.admin.email, USUARIOS.admin.password, new URL(baseURL!).hostname));

    // --- Crear el negocio (slug automático) ---
    await page.goto("/admin");
    await page.getByRole("link", { name: "Nuevo negocio" }).click();
    await page.getByLabel("Nombre del negocio").fill(nombre);
    await expect(page.getByText(`/n/${slug}`)).toBeVisible();
    await page.getByLabel("Dirección").fill("Calle E2E # 1-23");
    await page.getByLabel("Horario de atención").fill("lun-sab: 07:00-19:00");
    await page.getByLabel("WhatsApp del negocio").fill("300 123 4567");
    // En dev, la insignia de Next puede tapar el checkbox en el móvil: el clic va directo al elemento.
    await page.getByLabel(/Negocio de prueba/).dispatchEvent("click");
    await expect(page.getByLabel(/Negocio de prueba/)).toBeChecked();
    await page.getByRole("button", { name: "Crear negocio" }).click();
    await expect(page.getByText("Negocio creado.")).toBeVisible({ timeout: 20_000 }); // crea, redirige y compila la página en dev
    negocioId = new URL(page.url()).pathname.split("/").pop()!;
    const { data: creado } = await admin().from("negocios").select("slug, telefono_whatsapp, horario, es_prueba, activo").eq("id", negocioId).single();
    expect(creado).toEqual({ slug, telefono_whatsapp: "573001234567", horario: { "lun-sab": "07:00-19:00" }, es_prueba: true, activo: true });

    // --- Vincular al usuario del negocio ---
    await expect(page.getByText("Nadie opera este negocio todavía.")).toBeVisible();
    await page.getByLabel("Correo de quien opera el negocio").fill(USUARIOS.negocio.email);
    await page.getByRole("button", { name: "Vincular como negocio" }).click();
    await expect(page.getByText(/quedó vinculado/)).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: USUARIOS.negocio.email })).toBeVisible();
    const { data: miembros } = await admin().from("negocio_miembros").select("user_id").eq("negocio_id", negocioId);
    expect(miembros).toHaveLength(1);

    // --- Editar ---
    // Por rol: la página anterior (Nuevo negocio) sigue oculta en el DOM y también tiene «Dirección».
    await page.getByRole("textbox", { name: "Dirección" }).fill("Calle E2E # 4-56");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Cambios guardados.")).toBeVisible();

    // --- Publicar a nombre del negocio ---
    const titulo = `Combo admin ${sufijo}`;
    await page.goto("/admin/publicar");
    await page.getByLabel("¿A nombre de qué negocio publicas?").selectOption(slug);
    await page.getByRole("button", { name: "Elegir" }).click();
    await expect(page).toHaveURL(new RegExp(`n=${slug}`));
    await publicarEnTresPasos(page, titulo);
    await expect(page.getByText(`¡Oferta publicada a nombre de ${nombre}!`)).toBeVisible();
    const { data: oferta } = await admin().from("ofertas").select("id, tipo, negocio_id, es_prueba").eq("titulo", titulo).single();
    expect(oferta).toMatchObject({ tipo: "comercial", negocio_id: negocioId, es_prueba: true });

    // --- Un comprador reserva (por la función, como lo hace la app) ---
    const comprador = await clienteComo(USUARIOS.comprador.email, USUARIOS.comprador.password);
    const { error } = await comprador.rpc("solicitar_reserva", { oferta_id: oferta!.id, cantidad: 2, observaciones: "", origen: "e2e" });
    expect(error).toBeNull();

    // --- Reservas de todos los negocios: filtro, WhatsApp y las mismas acciones ---
    await page.goto(`/admin/reservas?n=${slug}&estado=por-gestionar`);
    const tarjeta = page.locator("li[data-estado]", { hasText: titulo });
    await expect(tarjeta).toContainText(nombre);
    const aviso = tarjeta.getByRole("link", { name: "Avisar por WhatsApp" });
    const href = decodeURIComponent((await aviso.getAttribute("href"))!);
    expect(href).toContain("https://wa.me/573001234567?text=");
    expect(href).toContain(`2 × ${titulo}`);
    expect(href).toContain(`/negocio?n=${slug}`);

    await tarjeta.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.locator('li[data-estado="confirmada"]', { hasText: titulo })).toBeVisible();

    // Sin filtro de negocio también aparece.
    await page.goto("/admin/reservas");
    await expect(page.locator('li[data-estado="confirmada"]', { hasText: titulo })).toBeVisible();

    // --- Quitar al usuario ---
    await page.goto(`/admin/negocios/${negocioId}`);
    await page.getByRole("listitem").filter({ hasText: USUARIOS.negocio.email }).getByRole("button", { name: "Quitar" }).click();
    await expect(page.getByText("Nadie opera este negocio todavía.")).toBeVisible();
  });
});
