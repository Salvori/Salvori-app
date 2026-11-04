import { expect, test } from "@playwright/test";

test("la portada abre en español con el lema de Salvori", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Salvori — Ofertas de comida cerca de ti");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-CO");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Lo bueno\s*se aprovecha\./);
  // Sin Supabase: «Muy pronto en Popayán»; con Supabase: el listado de ofertas cercanas.
  await expect(page.getByText(/Muy pronto en Popayán|ofertas? cerca/).first()).toBeVisible();
});

test("una ruta inexistente muestra la página 404 en español", async ({ page }) => {
  const res = await page.goto("/no-existe");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
});
