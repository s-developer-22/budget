import { chromium, webkit, expect } from "@playwright/test";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
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
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    await page.getByRole("button", { name: "Apri piano demo" }).click();
    await page.locator("#phase").selectOption("demo-phase-a");
    await page.getByRole("button", { name: "Chiudi messaggio" }).click();
    await expect(page.locator(".save-state")).toHaveCount(0);
    await expect(page.locator("input[type=month],.month-picker")).toHaveCount(
      0,
    );
    await expect(page.locator(".day small")).toHaveCount(0);
    await expect(page.getByTestId("primary-value")).toHaveText("€ 1.418,00");
    await expect(page.locator(".operation>.amount").first()).toHaveText(
      "€ 710,00",
    );
    await expect(page.locator(".operation>.incoming").first()).toHaveText(
      "+ € 2.150,00",
    );
    const geometry = await page.evaluate(() => {
      const box = (e) => {
        const r = e.getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          right: r.right,
          bottom: r.bottom,
        };
      };
      const boxes = (s) => [...document.querySelectorAll(s)].map(box);
      const textBox = (e) => {
        const r = document.createRange();
        r.selectNodeContents(e);
        return box(r);
      };
      return {
        width: document.documentElement.scrollWidth,
        phase: boxes(".phase-pill")[0],
        phaseTarget: boxes("#phase")[0],
        titles: boxes(".operation-content"),
        amounts: boxes(".operation>.amount"),
        checks: boxes(".check-target"),
        gate: boxes(".gate>div")[0],
        gateHeight: boxes(".gate")[0].height,
        gateRadius: getComputedStyle(document.querySelector(".gate"))
          .borderRadius,
        baseline: [...document.querySelectorAll(".operation")].map((row) =>
          [...row.querySelectorAll(".day strong,.operation-title,.amount")].map(
            textBox,
          ),
        ),
        metrics: [
          ...document.querySelectorAll(".hero-value,.metric-value"),
        ].map((e) => ({
          text: e.textContent,
          box: box(e),
          textBox: textBox(e),
          card: box(e.closest(".metric")),
        })),
        targets: boxes("button,summary,#phase,.check-target"),
      };
    });
    expect(geometry.width).toBe(viewport.width);
    expect(geometry.phase.height).toBe(40);
    expect(geometry.phaseTarget.height).toBeGreaterThanOrEqual(44);
    expect(geometry.phase.width).toBeLessThan(400);
    expect(Math.abs(geometry.gate.x - geometry.titles[0].x)).toBeLessThan(1);
    expect(geometry.gateHeight).toBeLessThanOrEqual(76);
    expect(geometry.gateRadius).toBe("8px");
    for (const group of ["titles", "amounts", "checks"])
      expect(
        Math.max(...geometry[group].map((b) => b.x)) -
          Math.min(...geometry[group].map((b) => b.x)),
      ).toBeLessThan(1);
    for (const b of geometry.targets) {
      if (b.width && b.height) {
        expect(b.width).toBeGreaterThanOrEqual(44);
        expect(b.height).toBeGreaterThanOrEqual(44);
      }
    }
    for (const baseline of geometry.baseline)
      expect(
        Math.max(...baseline.map((b) => b.y)) -
          Math.min(...baseline.map((b) => b.y)),
      ).toBeLessThan(1);
    for (const metric of geometry.metrics) {
      expect(metric.textBox.right).toBeLessThanOrEqual(metric.card.right - 12);
      expect(metric.box.height).toBeLessThanOrEqual(40);
    }
    await page.screenshot({
      path: `qa-results/ui-${engine}-${orientation}-month.png`,
      fullPage: true,
    });
    await page.screenshot({
      path: `qa-results/ui-${engine}-${orientation}-viewport.png`,
    });
    for (const view of ["Piano", "Dati"]) {
      await page.getByRole("button", { name: view, exact: true }).click();
      await expect(
        page.getByRole("heading", {
          name: view === "Piano" ? "Il mio piano" : "Dati e backup",
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.locator(".save-state")).toHaveCount(0);
      await page.screenshot({
        path: `qa-results/ui-${engine}-${orientation}-${view.toLowerCase()}.png`,
        fullPage: true,
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(viewport.width);
    }
    await expect(
      page.getByRole("button", { name: "Conserva i dati sul dispositivo" }),
    ).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker?.controller);
    await expect(
      page.getByRole("button", { name: "Applica aggiornamento" }),
    ).toHaveCount(0);
    await expect(
      page.getByText("App aggiornata", { exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
    results.push({ engine, orientation, geometry });
    await context.close();
  }
  await browser.close();
}

// A real waiting worker, without editing the production build or financial data.
let revision = 1;
const root = path.resolve("dist");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    const file = path.resolve(
      root,
      pathname === "/" ? "index.html" : "." + pathname,
    );
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    let content = await fs.readFile(file);
    if (path.basename(file) === "sw.js")
      content = Buffer.concat([
        content,
        Buffer.from(`\n// UI QA worker revision ${revision}\n`),
      ]);
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1133, height: 744 },
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.getByRole("button", { name: "Dati", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Dati e backup", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".save-state")).toHaveCount(0);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller);
  await expect(
    page.getByRole("heading", { name: "Dati e backup", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Applica aggiornamento" }),
  ).toHaveCount(0);
  revision = 2;
  await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    await r.update();
  });
  await expect(
    page.getByRole("button", { name: "Applica aggiornamento" }),
  ).toBeVisible({ timeout: 20000 });
  expect(
    await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      return r.waiting?.state;
    }),
  ).toBe("installed");
  await page.getByRole("button", { name: "Applica aggiornamento" }).click();
  await expect(page.getByText("App aggiornata", { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(
    page.getByRole("button", { name: "Applica aggiornamento" }),
  ).toHaveCount(0);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
await fs.writeFile(
  "qa-results/ui-report.json",
  JSON.stringify({ viewports: results, realWorkerUpdate: true }, null, 2),
);
console.log(
  "UI QA passed: 4 iPad browser/viewport combinations, money format, columns, baselines, compact phase, integrated gate, copy and real service worker update.",
);
