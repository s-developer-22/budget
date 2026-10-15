import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { createStore } from "../src/persistence/store";
import { demoPlan } from "../src/domain/demo";
import { makeBackup, parseImport } from "../src/application/backup";
describe("IndexedDB and restore", () => {
  it("persists plan, month phases, checks and preferences across connections", async () => {
    const name = `test-${crypto.randomUUID()}`,
      a = createStore(name),
      p = demoPlan();
    await a.replace(p);
    await a.phase({ month: "2029-03", phaseId: "demo-phase-a" });
    await a.check("2029-03:demo-home", true);
    await a.preferences({ view: "Piano", month: "2029-04" });
    await a.close();
    const b = createStore(name),
      loaded = await b.load();
    expect(loaded.plan).toEqual(p);
    expect(loaded.months).toEqual([
      { month: "2029-03", phaseId: "demo-phase-a" },
    ]);
    expect(loaded.checks).toEqual({ "2029-03:demo-home": true });
    expect(loaded.preferences.view).toBe("Piano");
    await b.close();
  });
  it("roundtrips full backup transactionally and resets all stores", async () => {
    const store = createStore(`test-${crypto.randomUUID()}`),
      p = demoPlan(),
      b = makeBackup(
        p,
        [{ month: "2029-03", phaseId: "demo-phase-b" }],
        { "2029-03:demo-home": true },
        { view: "Dati" },
      );
    const parsed = parseImport(JSON.stringify(b));
    await store.replace(parsed.plan, parsed.backup);
    const data = await store.load();
    expect(data.months).toEqual(b.months);
    expect(data.checks).toEqual(b.checks);
    await store.reset();
    expect(await store.load()).toMatchObject({
      plan: null,
      months: [],
      checks: {},
      preferences: { view: "Mese" },
    });
    await store.close();
  });
  it("invalid imports preserve existing storage and replacements clear prior state", async () => {
    const store = createStore(`test-${crypto.randomUUID()}`),
      p = demoPlan();
    await store.replace(p);
    await store.check("2029-03:demo-home", true);
    expect(() => parseImport("{}")).toThrow();
    expect((await store.load()).checks).toEqual({ "2029-03:demo-home": true });
    await store.replace(p);
    expect((await store.load()).checks).toEqual({});
    await store.close();
  });
});
