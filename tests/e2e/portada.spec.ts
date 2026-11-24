import { expect, test } from "@playwright/test";
import { SIN_MIGRACION_MARCA, faltaMigracionMarca, hayStaging } from "./staging";

test("la portada abre en español con el lema de Salvori", async ({ page }) => {
  // Con staging sin la migración de oferta y marca, el catálogo falla (pide columnas nuevas).
  test.skip(hayStaging && (await faltaMigracionMarca()), SIN_MIGRACION_MARCA);
  await page.goto("/");
  await expect(page).toHaveTitle("Salvori — Ofertas de comida cerca de ti");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-CO");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Lo bueno\s*se aprovecha\./);
  // Sin Supabase: «Muy pronto en Popayán»; con Supabase: el listado de ofertas cercanas.
  await expect(page.getByText(/Muy pronto en Popayán|ofertas? cerca/).first()).toBeVisible();
  // Para negocios: precio de la base (planes) o el texto fijo si no hay Supabase.
  await expect(page.getByTestId("precios-negocios")).toHaveText("15 días gratis. Después, desde $ 50.000 al mes.");
});

test("una ruta inexistente muestra la página 404 en español", async ({ page }) => {
  const res = await page.goto("/no-existe");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
});
