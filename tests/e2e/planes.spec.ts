import { expect, test } from "@playwright/test";
import { USUARIOS, admin, cookiesDeSesion, crearOfertaTemporal, hayAdmin, publicarEnTresPasos } from "./staging";

test.describe("planes: tarjeta «Tu plan», límite al publicar y pago registrado por el admin", () => {
  test.skip(!hayAdmin, "Necesita .env.local de staging y los usuarios de prueba (incluido el admin).");
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let datos: Awaited<ReturnType<typeof crearOfertaTemporal>> | undefined;
  let slug = "";
  let nombre = "";

  test.beforeAll(async () => {
    const { error } = await admin().from("planes").select("id").limit(1);
    test.skip(Boolean(error), "Falta aplicar la migración 20261123000300_planes en staging.");
    datos = await crearOfertaTemporal();
    const db = admin();
    const { data: neg } = await db.from("negocios").select("slug, nombre").eq("id", datos.negocioId).single();
    slug = neg!.slug;
    nombre = neg!.nombre;
    // 4 ofertas activas más: el negocio queda en 5 de 5 (límite del plan Prueba).
    const { data: base } = await db
      .from("ofertas")
      .select("negocio_id, tipo, titulo, contenido, categoria, foto_url, precio_habitual, precio_final, cupos_total, cupos_disponibles, recogida_desde, recogida_hasta, estado")
      .eq("id", datos.ofertaId)
      .single();
    const { error: e } = await db.from("ofertas").insert([1, 2, 3, 4].map((i) => ({ ...base!, titulo: `${base!.titulo} ${i}` })));
    if (e) throw e;
  });

  test.afterAll(async () => {
    if (!datos) return;
    await admin().from("pagos_mensualidad").delete().eq("negocio_id", datos.negocioId);
    await datos.borrar();
  });

  test("el negocio ve su plan y el límite le explica por qué no publica", async ({ page, context, baseURL }) => {
    await context.addCookies(await cookiesDeSesion(USUARIOS.negocio.email, USUARIOS.negocio.password, new URL(baseURL!).hostname));
    await page.goto(`/negocio?n=${slug}`);
    await expect(page.getByRole("heading", { name: "Tu plan: Prueba" })).toBeVisible();
    await expect(page.getByText(/Prueba gratis: te quedan 1[45] días/)).toBeVisible();
    await expect(page.getByText("5 de 5 ofertas activas")).toBeVisible();

    await page.goto(`/negocio/publicar?n=${slug}`);
    await publicarEnTresPasos(page, "Combo que excede el plan");
    await expect(page.getByRole("alert")).toContainText("Llegaste al límite de tu plan Prueba: 5 ofertas activas al mismo tiempo");
  });

  test("el admin registra el pago y el negocio queda al día en Básico", async ({ page, context, baseURL }) => {
    await context.addCookies(await cookiesDeSesion(USUARIOS.admin.email, USUARIOS.admin.password, new URL(baseURL!).hostname));
    await page.goto("/admin/planes");
    const fila = page.getByRole("listitem").filter({ hasText: nombre });
    await expect(fila).toContainText("Prueba gratis");
    await fila.getByText("Gestionar plan y pagos").click();
    await expect(fila.getByLabel("Valor recibido (COP)")).toHaveValue("50000");
    await fila.getByLabel("Meses").selectOption("2");
    await expect(fila.getByLabel("Valor recibido (COP)")).toHaveValue("100000");
    await fila.getByRole("button", { name: "Registrar pago" }).click();
    await expect(fila.getByText(/Pago registrado\. El plan queda al día hasta el/)).toBeVisible();

    const { data } = await admin().from("suscripciones").select("estado, planes(nombre)").eq("negocio_id", datos!.negocioId).single();
    expect(data).toMatchObject({ estado: "activa", planes: { nombre: "Básico" } });
  });
});
