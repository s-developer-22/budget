import { openDB, type DBSchema } from "idb";
import type {
  Backup,
  MonthState,
  PlanConfig,
  Preferences,
} from "../domain/schema";
interface BudgetDB extends DBSchema {
  config: { key: string; value: PlanConfig };
  months: { key: string; value: MonthState };
  checks: { key: string; value: boolean };
  preferences: { key: string; value: Preferences };
  metadata: { key: string; value: string };
}
const stores = [
  "config",
  "months",
  "checks",
  "preferences",
  "metadata",
] as const;
export function createStore(name = "budget-local-v1") {
  const db = openDB<BudgetDB>(name, 1, {
    upgrade(db) {
      for (const store of stores) db.createObjectStore(store);
    },
    blocking(_a, _b, event) {
      (event.target as IDBDatabase).close();
    },
  });
  return {
    async load() {
      const d = await db;
      const tx = d.transaction([...stores], "readonly");
      const [plan, months, keys, values, preferences] = await Promise.all([
        tx.objectStore("config").get("active"),
        tx.objectStore("months").getAll(),
        tx.objectStore("checks").getAllKeys(),
        tx.objectStore("checks").getAll(),
        tx.objectStore("preferences").get("current"),
      ]);
      await tx.done;
      return {
        plan: plan ?? null,
        months,
        checks: Object.fromEntries(keys.map((k, i) => [k, values[i]])),
        preferences: preferences ?? { view: "Mese" as const },
      };
    },
    async replace(plan: PlanConfig, backup?: Backup) {
      const d = await db;
      const tx = d.transaction([...stores], "readwrite");
      await Promise.all(stores.map((s) => tx.objectStore(s).clear()));
      await tx.objectStore("config").put(plan, "active");
      for (const m of backup?.months ?? [])
        await tx.objectStore("months").put(m, m.month);
      for (const [k, v] of Object.entries(backup?.checks ?? {}))
        await tx.objectStore("checks").put(v, k);
      await tx
        .objectStore("preferences")
        .put(
          backup?.preferences ?? { view: "Mese", month: plan.startMonth },
          "current",
        );
      await tx
        .objectStore("metadata")
        .put(new Date().toISOString(), "updatedAt");
      await tx.done;
    },
    async phase(state: MonthState) {
      const d = await db;
      await d.put("months", state, state.month);
    },
    async check(key: string, value: boolean) {
      const d = await db;
      await d.put("checks", value, key);
    },
    async preferences(value: Preferences) {
      const d = await db;
      await d.put("preferences", value, "current");
    },
    async reset() {
      const d = await db;
      const tx = d.transaction([...stores], "readwrite");
      await Promise.all(stores.map((s) => tx.objectStore(s).clear()));
      await tx.done;
    },
    async close() {
      (await db).close();
    },
  };
}
export type Store = ReturnType<typeof createStore>;
