import { test, expect } from "@playwright/test";

test.describe("PWA", () => {
  test("manifest is accessible", async ({ page }) => {
    const response = await page.request.get("http://localhost:5173/manifest.json");
    expect(response.status()).toBe(200);
    const manifest = await response.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.icons).toBeDefined();
  });

  test("offline page exists", async ({ page }) => {
    const response = await page.request.get("http://localhost:5173/offline.html");
    expect(response.status()).toBe(200);
  });

  test("theme color meta tag exists", async ({ page }) => {
    await page.goto("/login");
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute("content");
    expect(themeColor).toBeTruthy();
  });
});
