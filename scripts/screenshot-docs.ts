/**
 * Captures a full-page screenshot of every page in the client documentation
 * site's route list, logged in as the seeded admin, saving into
 * docs-client/public/screenshots/. Requires the main app's dev server
 * already running (npm run dev) and a seeded local Postgres.
 *
 * Standalone by design (no `@/` imports — only npm packages and node
 * built-ins) so it runs with plain `node`, matching scripts/seed-admin.ts.
 * Run: node --env-file=.env.local scripts/screenshot-docs.ts
 */
import { chromium, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../docs-client/public/screenshots",
);
const ROW_LINK_SELECTOR = "table tbody tr:first-child a, table tbody tr:first-child button";

async function shot(page: Page, filename: string) {
  await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: true });
  console.log(`captured ${filename}`);
}

async function gotoAndShoot(page: Page, url: string, filename: string) {
  try {
    await page.goto(`${BASE_URL}${url}`, { waitUntil: "networkidle", timeout: 20_000 });
    await page.waitForTimeout(400);
    await shot(page, filename);
  } catch (error) {
    console.warn(`skipped ${filename} (${url}):`, (error as Error).message);
  }
}

async function clickFirstRowAndShoot(page: Page, listUrl: string, filename: string) {
  try {
    await page.goto(`${BASE_URL}${listUrl}`, { waitUntil: "networkidle", timeout: 20_000 });
    await page.locator(ROW_LINK_SELECTOR).first().click({ timeout: 5_000 });
    await page.waitForTimeout(600);
    await shot(page, filename);
  } catch (error) {
    console.warn(`skipped ${filename} (click-through from ${listUrl}):`, (error as Error).message);
  }
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set (see .env.example).");
  }

  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // Auth flow — capture the login screen before authenticating.
    await gotoAndShoot(page, "/login", "masuk-login.png");
    await page.fill("#login-email", email);
    await page.fill("#login-password", password);
    await page.click('button:has-text("Masuk")');
    await page.waitForURL(/\/dasbor/, { timeout: 15_000 });

    await shot(page, "dasbor.png");

    const simplePages: Array<[string, string]> = [
      ["/penawaran", "penawaran-list.png"],
      ["/penawaran/baru", "penawaran-builder.png"],
      ["/proyek", "proyek-list.png"],
      ["/proyek/baru", "proyek-create.png"],
      ["/faktur", "faktur-list.png"],
      ["/penggajian", "penggajian-list.png"],
      ["/penggajian/baru", "penggajian-create.png"],
      ["/arus-kas", "arus-kas-list.png"],
      ["/arus-kas/baru", "arus-kas-create.png"],
      ["/pajak", "pajak.png"],
      ["/perusahaan", "perusahaan-list.png"],
      ["/katalog", "katalog-list.png"],
      ["/karyawan", "karyawan-list.png"],
      ["/kelengkapan", "kelengkapan-list.png"],
      ["/dokumen", "pengiriman.png"],
      ["/konfigurasi", "konfigurasi.png"],
      ["/pengguna", "pengguna-list.png"],
      ["/profil-perusahaan", "profil-perusahaan.png"],
    ];
    for (const [url, filename] of simplePages) {
      await gotoAndShoot(page, url, filename);
    }

    await clickFirstRowAndShoot(page, "/penawaran", "penawaran-detail.png");
    await clickFirstRowAndShoot(page, "/proyek", "proyek-detail.png");
    await clickFirstRowAndShoot(page, "/faktur", "faktur-detail.png");
    await clickFirstRowAndShoot(page, "/perusahaan", "perusahaan-detail.png");
    await clickFirstRowAndShoot(page, "/katalog", "katalog-detail.png");
    await clickFirstRowAndShoot(page, "/karyawan", "karyawan-detail.png");
    await clickFirstRowAndShoot(page, "/kelengkapan", "kelengkapan-detail.png");

    // Penggajian: list -> batch detail -> individual slip (two levels deep).
    try {
      await page.goto(`${BASE_URL}/penggajian`, { waitUntil: "networkidle", timeout: 20_000 });
      await page.locator(ROW_LINK_SELECTOR).first().click({ timeout: 5_000 });
      await page.waitForTimeout(600);
      await shot(page, "penggajian-batch.png");
      await page.locator(ROW_LINK_SELECTOR).first().click({ timeout: 5_000 });
      await page.waitForTimeout(600);
      await shot(page, "penggajian-slip.png");
    } catch (error) {
      console.warn("skipped penggajian batch/slip drill-down:", (error as Error).message);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
