import { chromium, webkit, expect } from "@playwright/test";
import { createServer } from "vite";
import fs from "node:fs/promises";

// Only fictional inputs. Private configuration is never a test fixture.
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { demoPlan } = await server.ssrLoadModule("/src/domain/demo.ts");
const plan = demoPlan();
await server.close();
const url = process.env.QA_URL || "http://127.0.0.1:4173/";
const results = [];
await fs.mkdir("qa-results", { recursive: true });
for (const [engine, type] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await type.launch();
  for (const [orientation, viewport] of [
    ["portrait", { width: 744, height: 1133 }],
    ["landscape", { width: 1133, height: 744 }],
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url);
    const upload = async (object) => {
      await page.locator("input[type=file]").setInputFiles({
        name: "fictional-review.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(object)),
      });
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Conferma importazione" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    };
    await upload(plan);
    await page.locator("#phase").selectOption("demo-phase-a");
    for (const phase of ["demo-phase-b", "demo-phase-c", "demo-phase-d"]) {
      await page.locator("#phase").selectOption(phase);
      await expect(page.getByTestId("primary-value")).toHaveText("Da definire");
    }
    await page.locator("#phase").selectOption("demo-phase-a");
    await page.getByRole("button", { name: "Mese successivo" }).click();
    await expect(page.locator("#phase")).toHaveValue("");
    await page.getByRole("button", { name: "Mese precedente" }).click();
    await expect(page.locator("#phase")).toHaveValue("demo-phase-a");
    await page.getByRole("button", { name: "Dati", exact: true }).click();
    await page.locator("input[type=file]").setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{unclosed"),
    });
    await expect(page.getByRole("alert")).toBeVisible();
    const importButton = page.getByRole("button", {
      name: "Sostituisci piano",
    });
    await importButton.focus();
    await page.locator("input[type=file]").setInputFiles({
      name: "fictional.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(plan)),
    });
    await page
      .getByRole("button", { name: "Annulla", exact: true })
      .last()
      .click();
    await expect(importButton).toBeFocused();
    const backup = (month) => ({
      backupVersion: 1,
      exportedAt: new Date().toISOString(),
      plan,
      months: Array.from({ length: month === "2029-08" ? 6 : 9 }, (_, i) => ({
        month: `2029-${String(i + 3).padStart(2, "0")}`,
        phaseId: "demo-phase-a",
      })),
      checks: {},
      preferences: { view: "Mese", month },
    });
    await upload(backup("2029-08"));
    await expect(page.getByTestId("reserve-value")).toHaveText("€ 80,00");
    await expect(page.getByTestId("primary-value")).toHaveText("€ 4.328,00");
    await expect(page.getByTestId("emergency-value")).toHaveText("€ 1.800,00");
    await expect(page.getByTestId("pac-value")).toHaveText("€ 900,00");
    await upload(backup("2029-11"));
    await expect(page.getByTestId("reserve-value")).toHaveText("€ 155,00");
    await expect(page.getByTestId("primary-value")).toHaveText("€ 6.152,00");
    await expect(
      page.getByRole("region", { name: "Giorno da definire", exact: true }),
    ).toBeVisible();

    const longPlan = structuredClone(plan);
    for (const account of longPlan.accounts)
      account.label += " · riferimento dimostrativo con denominazione estesa";
    longPlan.baseMonthlyOperations[0].purpose =
      "Finalità dimostrativa estesa per verificare la gerarchia e il ritmo della riga senza alterare le colonne";
    await upload(longPlan);
    await page.locator("#phase").selectOption("demo-phase-a");
    await page.evaluate(() => {
      for (const details of document.querySelectorAll("details"))
        details.open = true;
    });
    await expect
      .poll(() =>
        page.evaluate(() =>
          document
            .querySelector(".summary-grid")
            .style.getPropertyValue("--label-content-height"),
        ),
      )
      .not.toBe("");
    // Simulate nonzero insets independently of browser/hardware env() support.
    await page.addStyleTag({
      content:
        ":root{--safe-top:20px;--safe-bottom:24px;--safe-left:0px;--safe-right:0px}",
    });
    const geometry = await page.evaluate(() => {
      const bounds = (selector) =>
        [...document.querySelectorAll(selector)].map((e) => {
          const r = e.getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            right: r.right,
            width: r.width,
            height: r.height,
          };
        });
      return {
        scrollWidth: document.documentElement.scrollWidth,
        amounts: bounds(".operation>.amount"),
        checks: bounds(".check-target"),
        labels: bounds(".metric-label"),
        values: bounds(".metric-value"),
        main: bounds(".month-main"),
        aside: bounds(".month-aside"),
        cards: bounds(".checklist"),
        icons: bounds(".icon-disc svg"),
      };
    });
    expect(geometry.scrollWidth).toBe(viewport.width);
    for (const group of ["amounts", "checks"])
      expect(
        Math.max(...geometry[group].map((r) => r.x)) -
          Math.min(...geometry[group].map((r) => r.x)),
      ).toBeLessThan(1);
    expect(
      Math.max(...geometry.labels.map((r) => r.height)) -
        Math.min(...geometry.labels.map((r) => r.height)),
    ).toBeLessThan(1);
    expect(geometry.icons.every((r) => r.width === 20 && r.height === 20)).toBe(
      true,
    );
    if (orientation === "landscape") {
      expect(Math.abs(geometry.main[0].y - geometry.aside[0].y)).toBeLessThan(
        1,
      );
      expect(
        Math.abs(geometry.values[1].y - geometry.values[2].y),
      ).toBeLessThan(1);
    }
    await page.screenshot({
      path: `qa-results/${engine}-${orientation}-expanded-long-labels.png`,
      fullPage: true,
    });
    await page.evaluate(() =>
      scrollTo(0, document.documentElement.scrollHeight),
    );
    await expect
      .poll(() =>
        page.evaluate(() => {
          const last = document
            .querySelector(".quiet-note")
            .getBoundingClientRect();
          const nav = document.querySelector(".nav").getBoundingClientRect();
          return last.bottom <= (innerWidth >= 1000 ? innerHeight : nav.top);
        }),
      )
      .toBe(true);
    for (const view of ["Piano", "Dati"]) {
      await page.getByRole("button", { name: view, exact: true }).click();
      await page.evaluate(() => {
        for (const d of document.querySelectorAll("details")) d.open = true;
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(viewport.width);
      await page.screenshot({
        path: `qa-results/${engine}-${orientation}-${view.toLowerCase()}-expanded.png`,
        fullPage: true,
      });
    }
    expect(errors).toEqual([]);
    results.push({
      engine,
      orientation,
      validPlanImport: true,
      invalidJson: true,
      dialogFocus: true,
      periodicMonths: true,
      allPhases: true,
      longLabels: true,
      safeInsets: true,
      geometry,
    });
    await context.close();
  }
  await browser.close();
}
await fs.writeFile(
  "qa-results/review-report.json",
  JSON.stringify(results, null, 2),
);
console.log(
  `Final review passed: ${results.length} iPad viewport/browser combinations; plan imports, periodic months, phase guards, long labels, expanded views, focus and safe insets.`,
);
