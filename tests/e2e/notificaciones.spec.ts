import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { USUARIOS, admin, cookiesDeSesion, crearOfertaTemporal, hayStaging } from "./staging";

// La migración 20261123000200_notificaciones aún puede no estar en staging: las pruebas
// que la necesitan (interesados, baja, WhatsApp del comprador) se saltan solas.
async function hayMigracion(): Promise<boolean> {
  const { error } = await admin().from("interesados").select("id").limit(1);
  return !error;
}

test("la baja con un enlace no válido avisa sin romper", async ({ page }) => {
  await page.goto("/baja?t=no-es-un-token");
  await expect(page.getByRole("heading", { name: "Avisos de combos cerca" })).toBeVisible();
  await page.getByRole("button", { name: "Dejar de recibir avisos" }).click();
  await expect(page.getByText("El enlace de baja no es válido.")).toBeVisible();
});

test.describe("notificaciones (staging)", () => {
  test.skip(!hayStaging, "Necesita .env.local de staging y los usuarios de prueba.");
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  let datos: Awaited<ReturnType<typeof crearOfertaTemporal>>;
  let slug: string;
  let migracion = false;
  test.beforeAll(async () => {
    datos = await crearOfertaTemporal();
    const { data } = await admin().from("negocios").update({ telefono_whatsapp: "3001234567" }).eq("id", datos.negocioId).select("slug").single();
    slug = data!.slug as string;
    migracion = await hayMigracion();
  });
  test.afterAll(async () => {
    await datos?.borrar();
  });

  test("la ficha dice cómo avisar al negocio y que el correo llega al confirmar", async ({ page }) => {
    await page.goto(`/oferta/${datos.ofertaId}`);
    await expect(page.getByText("Reserva aquí y avísale al negocio por WhatsApp.")).toBeVisible();
    await expect(page.getByText("Te avisamos por correo cuando el negocio confirme.")).toBeVisible();
  });

  test("después de reservar, el comprador envía su pedido por WhatsApp", async ({ page, context, baseURL }) => {
    const dominio = new URL(baseURL!).hostname;
    await context.addCookies(await cookiesDeSesion(USUARIOS.comprador.email, USUARIOS.comprador.password, dominio));
    await page.goto(`/oferta/${datos.ofertaId}`);
    await page.getByRole("button", { name: /^Reservar/ }).click();
    // La primera vez el servidor de desarrollo compila /mis-reservas: margen amplio.
    await expect(page).toHaveURL(/\/mis-reservas/, { timeout: 30_000 });
    await expect(page.getByRole("status").first()).toContainText("Te avisamos por correo");

    test.skip(!migracion, "Falta la migración de notificaciones en staging.");
    const reserva = page.locator("li[data-estado]", { hasText: datos.titulo });
    const boton = reserva.getByRole("link", { name: "Enviar mi pedido por WhatsApp" });
    await expect(boton).toBeVisible();
    const href = (await boton.getAttribute("href"))!;
    expect(href).toMatch(/^https:\/\/wa\.me\/573001234567\?text=/);
    const texto = decodeURIComponent(href.split("text=")[1]);
    expect(texto).toContain(`1 × ${datos.titulo}`);
    expect(texto).toContain("Código: pendiente de confirmar");
    expect(texto).not.toContain(USUARIOS.comprador.email);
  });

  test("la bandeja del negocio explica los canales y activa el sonido", async ({ browser, baseURL }) => {
    const dominio = new URL(baseURL!).hostname;
    const ctx = await browser.newContext();
    await ctx.addCookies(await cookiesDeSesion(USUARIOS.negocio.email, USUARIOS.negocio.password, dominio));
    const page = await ctx.newPage();
    await page.goto(`/negocio?n=${slug}`);
    const recuadro = page.getByRole("region", { name: "Cómo te llegan las reservas" });
    await expect(recuadro).toContainText("Tono y aviso en esta pantalla (deja el panel abierto).");
    await expect(recuadro).toContainText(USUARIOS.negocio.email);
    await expect(recuadro).toContainText("WhatsApp cuando el cliente pulse el botón");
    await recuadro.getByRole("button", { name: "Activar sonido y avisos del navegador" }).click();
    await expect(recuadro.getByText("Sonido y avisos activados")).toBeVisible();
    await ctx.close();
  });

  test("«Avísame cuando haya combos cerca» desde la portada y baja con el enlace", async ({ page }) => {
    test.skip(!migracion, "Falta la migración de notificaciones en staging.");
    const correo = `e2e-${randomUUID().slice(0, 8)}@salvori.test`;
    try {
      await page.goto("/#avisame");
      const formulario = page.getByRole("form", { name: "Avísame cuando haya combos cerca" });
      await formulario.getByLabel("Tu correo").fill(correo);
      await formulario.getByRole("button", { name: "Punto en el mapa" }).click();
      await formulario.getByRole("button", { name: "1 km" }).click();
      await formulario.getByRole("checkbox").check();
      await formulario.getByRole("button", { name: "Avísame" }).click();
      await expect(page.getByText(/¡Listo! Te escribimos cuando haya combos cerca/)).toBeVisible();

      const { data } = await admin().from("interesados").select("radio_km, origen_ubicacion, token_baja, user_id").eq("correo", correo).single();
      expect(data).toMatchObject({ radio_km: 1, origen_ubicacion: "mapa", user_id: null });

      await page.goto(`/baja?t=${data!.token_baja}`);
      await page.getByRole("button", { name: "Dejar de recibir avisos" }).click();
      await expect(page.getByText("Ya no te enviaremos avisos de combos cerca.")).toBeVisible();
      const { count } = await admin().from("interesados").select("id", { count: "exact", head: true }).eq("correo", correo);
      expect(count).toBe(0);
    } finally {
      await admin().from("interesados").delete().eq("correo", correo);
    }
  });
});
