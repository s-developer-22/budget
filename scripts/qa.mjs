import { chromium, webkit, expect } from "@playwright/test";
import fs from "node:fs/promises";
const url = process.env.QA_URL || "http://127.0.0.1:4173/";
await fs.mkdir("qa-results", { recursive: true });
const report = [];
for (const [engine, browserType] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await browserType.launch({ headless: true });
  for (const [orientation, viewport] of [
    ["portrait", { width: 744, height: 1133 }],
    ["landscape", { width: 1133, height: 744 }],
    ["phone", { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({
      viewport,
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    await page.getByRole("button", { name: "Apri piano demo" }).click();
    await page.locator("#phase").selectOption("demo-phase-a");
    const closeNotice = page.getByRole("button", { name: "Chiudi messaggio" });
    if (await closeNotice.count()) await closeNotice.click();
    await expect(
      page.getByRole("heading", { name: "Marzo 2029" }),
    ).toBeVisible();
    const initial = await page.getByTestId("primary-value").textContent();
    await expect(page.getByText("0/2 accrediti verificati")).toBeVisible();
    const summaryBefore = await page
      .locator('[data-testid$="-value"]')
      .allTextContents();
    await page
      .getByRole("checkbox", {
        name: "Completata: Budget quotidiano",
        exact: true,
      })
      .check();
    await expect(
      page.getByRole("checkbox", {
        name: "Completata: Budget quotidiano",
        exact: true,
      }),
    ).toBeEnabled();
    expect(await page.getByTestId("primary-value").textContent()).toBe(initial);
    expect(
      await page.locator('[data-testid$="-value"]').allTextContents(),
    ).toEqual(summaryBefore);
    await page
      .getByRole("checkbox", {
        name: "Completata: Budget quotidiano",
        exact: true,
      })
      .uncheck();
    await page
      .getByRole("checkbox", {
        name: "Completata: Entrata principale",
        exact: true,
      })
      .check();
    await expect(page.getByText("1/2 accrediti verificati")).toBeVisible();
    await page
      .getByRole("checkbox", {
        name: "Completata: Entrata integrativa",
        exact: true,
      })
      .check();
    await expect(page.getByText("2/2 accrediti verificati")).toBeVisible();
    expect(await page.getByTestId("primary-value").textContent()).toBe(initial);
    const geometry = await page.evaluate(() => {
      const box = (s) =>
        [...document.querySelectorAll(s)].map((e) => {
          const b = e.getBoundingClientRect();
          return {
            x: b.x,
            y: b.y,
            right: b.right,
            width: b.width,
            height: b.height,
          };
        });
      return {
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        amounts: box(".operation>.amount"),
        checks: box(".check-target"),
        titles: box(".operation-content"),
        buttons: box("button"),
        nav: box(".nav"),
        layout: box(".month-layout"),
        main: box(".month-main"),
        aside: box(".month-aside"),
      };
    });
    expect(geometry.scrollWidth).toBeLessThanOrEqual(viewport.width);
    for (const group of ["amounts", "checks", "titles"])
      expect(
        Math.max(...geometry[group].map((b) => b.x)) -
          Math.min(...geometry[group].map((b) => b.x)),
      ).toBeLessThan(1);
    for (const b of geometry.buttons) {
      if (b.width && b.height) {
        expect(b.width).toBeGreaterThanOrEqual(44);
        expect(b.height).toBeGreaterThanOrEqual(44);
      }
    }
    if (orientation === "landscape") {
      expect(geometry.nav[0].width).toBe(88);
      expect(Math.round(geometry.aside[0].x - geometry.main[0].right)).toBe(24);
      const available = geometry.main[0].width + geometry.aside[0].width;
      expect(geometry.main[0].width / available).toBeGreaterThanOrEqual(0.6);
      expect(geometry.main[0].width / available).toBeLessThanOrEqual(0.64);
    }
    if (orientation === "portrait") expect(geometry.nav[0].width).toBe(744);
    await expect(page.locator(".save-state")).toHaveCount(0);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `qa-results/${engine}-${orientation}-month.png`,
      fullPage: true,
    });
    await page.screenshot({
      path: `qa-results/${engine}-${orientation}-viewport.png`,
    });
    await page.reload();
    await expect(
      page.getByRole("checkbox", {
        name: "Completata: Entrata principale",
        exact: true,
      }),
    ).toBeChecked();
    await expect(page.locator("#phase")).toHaveValue("demo-phase-a");
    await page.locator("#phase").selectOption("demo-phase-b");
    await expect(page.getByTestId("primary-value")).toHaveText("Da definire");
    await expect(
      page.getByText("Modalità operativa da definire").first(),
    ).toBeVisible();
    await page.locator("#phase").selectOption("demo-phase-a");
    await expect(page.getByTestId("primary-value")).toHaveText(initial);
    await expect(
      page.getByRole("checkbox", {
        name: "Completata: Entrata principale",
        exact: true,
      }),
    ).toBeChecked();
    await page.getByRole("button", { name: "Mese successivo" }).click();
    await expect(page.locator("#phase")).toHaveValue("");
    await expect(
      page.getByRole("checkbox", {
        name: "Completata: Entrata principale",
        exact: true,
      }),
    ).not.toBeChecked();
    await page.getByRole("button", { name: "Mese precedente" }).click();
    await page.evaluate(() =>
      scrollTo(0, document.documentElement.scrollHeight),
    );
    await page.getByRole("button", { name: "Piano", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Il mio piano", exact: true }),
    ).toBeVisible();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await expect(page.locator(".save-state")).toHaveCount(0);
    await page.screenshot({
      path: `qa-results/${engine}-${orientation}-plan.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
    await page.getByRole("button", { name: "Dati", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Dati e backup", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".save-state")).toHaveCount(0);
    await page.screenshot({
      path: `qa-results/${engine}-${orientation}-data.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Esporta backup" }).click();
    const download = await downloadPromise;
    const raw = await fs.readFile(await download.path(), "utf8");
    const backup = JSON.parse(raw);
    expect(backup.months[0].phaseId).toBe("demo-phase-a");
    expect(backup.checks["2029-03:demo-income-a"]).toBe(true);
    await page.locator("input[type=file]").setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("{}"),
    });
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(
      page.getByText("Piano caricato", { exact: true }),
    ).toBeVisible();
    await page.locator("input[type=file]").setInputFiles({
      name: "demo-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(raw),
    });
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("button", { name: "Annulla", exact: true })
      .last()
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.locator("input[type=file]").setInputFiles({
      name: "demo-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(raw),
    });
    await page.getByRole("button", { name: "Conferma importazione" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.waitForFunction(
      () => !!navigator.serviceWorker?.controller,
      undefined,
      {
        timeout: 20000,
      },
    );
    const caches = await page.evaluate(async () => {
      const result = [];
      for (const key of await window.caches.keys()) {
        const c = await window.caches.open(key);
        result.push(...(await c.keys()).map((r) => r.url));
      }
      return result;
    });
    expect(caches.length).toBeGreaterThan(0);
    expect(caches.some((u) => /backup|private|budget-plan/.test(u))).toBe(
      false,
    );
    if (engine === "chromium") await context.setOffline(true);
    const offlineResponse = await page.reload();
    if (engine === "chromium")
      expect(offlineResponse?.fromServiceWorker()).toBe(true);
    await expect(
      page.getByRole("heading", { name: "Dati e backup" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mese", exact: true }).click();
    await expect(
      page.getByRole("checkbox", {
        name: "Completata: Entrata principale",
        exact: true,
      }),
    ).toBeChecked();
    await page
      .getByRole("checkbox", { name: "Completata: Casa", exact: true })
      .check();
    await expect(
      page.getByRole("checkbox", { name: "Completata: Casa", exact: true }),
    ).toBeEnabled();
    await page.reload();
    await expect(
      page.getByRole("checkbox", { name: "Completata: Casa", exact: true }),
    ).toBeChecked();
    await page.close();
    const reopened = await context.newPage();
    await reopened.goto(url);
    await expect(
      reopened.getByRole("checkbox", { name: "Completata: Casa", exact: true }),
    ).toBeChecked();
    await expect(reopened.locator("#phase")).toHaveValue("demo-phase-a");
    expect(errors).toEqual([]);
    report.push({
      engine,
      orientation,
      viewport,
      geometry,
      offline:
        engine === "chromium"
          ? "passed"
          : "not verified: WebKit Windows offline navigation unavailable; online reload and reopen passed",
      backup: true,
      persistence: true,
      runtimeErrors: errors,
    });
    await context.close();
  }
  await browser.close();
}
await fs.writeFile("qa-results/report.json", JSON.stringify(report, null, 2));
console.log(
  `QA passed: ${report.length} viewport/browser combinations; Chromium offline cache response/reopen; phase isolation, checklist, imports and backup on both engines.`,
);
