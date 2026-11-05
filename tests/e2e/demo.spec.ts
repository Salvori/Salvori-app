import { expect, test } from "@playwright/test";

// Demo de frontend (/demo): datos de muestra en el navegador, sin Supabase.
// Dos pestañas del mismo navegador: el negocio con su panel abierto y el cliente reservando.
test("demo: el negocio publica, el cliente reserva y el negocio confirma y entrega", async ({ context }) => {
  test.setTimeout(90_000);
  const negocio = await context.newPage();
  const cliente = await context.newPage();

  // El negocio sube un combo nuevo.
  await negocio.goto("/demo/negocio");
  await expect(negocio.getByRole("heading", { name: /Hola, Panadería La Esquina/ })).toBeVisible();
  await negocio.getByRole("link", { name: "Subir un combo nuevo" }).click();
  await negocio.getByRole("button", { name: /Postres/ }).click();
  await negocio.getByRole("textbox", { name: "Nombre del combo" }).fill("Combo 2 tortas de la casa");
  await negocio.getByLabel("¿Qué incluye exactamente?").fill("2 porciones de torta de chocolate de hoy");
  await negocio.getByLabel("Precio Salvori").fill("7000");
  await negocio.getByLabel("Valor real").fill("12000");
  await expect(negocio.getByText("Descuento de 42%")).toBeVisible();
  await negocio.getByRole("button", { name: "Publicar combo" }).click();
  await expect(negocio.getByText("¡Combo publicado!")).toBeVisible();
  await negocio.goto("/demo/negocio");

  // El cliente lo ve en el inicio y lo reserva.
  await cliente.goto("/demo");
  await expect(cliente.getByRole("link", { name: /Reservar un combo/ })).toBeVisible();
  const tarjeta = cliente.locator("li", { hasText: "Combo 2 tortas de la casa" });
  await tarjeta.getByRole("link", { name: "Reservar combo" }).click();
  await cliente.getByRole("button", { name: "Agregar uno" }).click();
  await cliente.getByRole("link", { name: /^Reservar ·/ }).click();
  await expect(cliente.getByRole("heading", { name: "Confirma tu reserva" })).toBeVisible();
  await cliente.getByRole("radio", { name: /Nequi/ }).click();
  await cliente.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(cliente.getByTestId("estado")).toHaveText("Esperando confirmación del negocio");

  // Al negocio le llega el aviso y confirma.
  await expect(negocio.getByText("¡Nueva reserva!")).toBeVisible({ timeout: 10_000 });
  const pedido = negocio.locator('li[data-estado="por_confirmar"]', { hasText: "Combo 2 tortas de la casa" });
  await pedido.getByRole("button", { name: "Confirmar" }).click();

  // El cliente ve su código.
  await expect(cliente.getByTestId("estado")).toHaveText("Confirmado: ya puedes ir", { timeout: 10_000 });
  const codigo = (await cliente.getByTestId("codigo").textContent())!.trim();
  expect(codigo).toMatch(/^[A-Z0-9]{6}$/);

  // El negocio entrega con el código (primero uno equivocado).
  const porEntregar = negocio.locator('li[data-estado="confirmado"]', { hasText: "Combo 2 tortas de la casa" });
  await porEntregar.getByRole("button", { name: "Entregar pedido" }).click();
  await porEntregar.getByLabel("Código que te muestra el cliente").fill("ZZZZZZ");
  await porEntregar.getByRole("button", { name: "Lo entregué ✓" }).click();
  await expect(porEntregar.getByText("El código no coincide")).toBeVisible();
  await porEntregar.getByLabel("Código que te muestra el cliente").fill(codigo);
  await porEntregar.getByRole("button", { name: "Lo entregué ✓" }).click();

  // Cierre: el cliente ve su ahorro y el pedido queda en el historial.
  await expect(cliente.getByTestId("estado")).toHaveText("Entregado", { timeout: 10_000 });
  await expect(cliente.getByText("Ahorraste $ 10.000")).toBeVisible();
  await cliente.goto("/demo/pedidos");
  await expect(cliente.getByRole("heading", { name: "Historial" })).toBeVisible();
  await expect(cliente.locator("a", { hasText: "Combo 2 tortas de la casa" })).toContainText("Entregado");
});
