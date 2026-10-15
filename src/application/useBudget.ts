import { useEffect, useRef, useState } from "react";
import { createStore } from "../persistence/store";
import type {
  Backup,
  MonthState,
  PlanConfig,
  Preferences,
} from "../domain/schema";
export function useBudget() {
  const store = useRef<ReturnType<typeof createStore> | null>(null);
  const [plan, setPlan] = useState<PlanConfig | null>(null),
    [months, setMonths] = useState<MonthState[]>([]),
    [checks, setChecks] = useState<Record<string, boolean>>({}),
    [preferences, setPreferences] = useState<Preferences>({ view: "Mese" });
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [storageAvailable, setStorageAvailable] = useState(false);
  useEffect(() => {
    store.current = createStore();
    let active = true;
    store.current
      .load()
      .then((data) => {
        if (active) {
          setPlan(data.plan);
          setMonths(data.months);
          setChecks(data.checks);
          setPreferences(data.preferences);
          setStorageAvailable(true);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Archivio locale non disponibile. Abilita l’archiviazione del browser e ricarica.",
          );
          setReady(true);
        }
      });
    return () => {
      active = false;
      void store.current?.close();
    };
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      return true;
    } catch {
      setError(
        "Salvataggio non riuscito. I dati non sono stati modificati. Verifica lo spazio disponibile.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  return {
    plan,
    months,
    checks,
    preferences,
    ready,
    error,
    busy,
    storageAvailable,
    setError,
    replace: async (p: PlanConfig, b?: Backup) =>
      run(async () => {
        await store.current!.replace(p, b);
        setPlan(p);
        setMonths(b?.months ?? []);
        setChecks(b?.checks ?? {});
        setPreferences(b?.preferences ?? { view: "Mese", month: p.startMonth });
      }),
    phase: async (month: string, phaseId: string) =>
      run(async () => {
        const state = { month, phaseId };
        await store.current!.phase(state);
        setMonths((s) => [...s.filter((m) => m.month !== month), state]);
      }),
    check: async (key: string, value: boolean) => {
      const previous = !!checks[key];
      setChecks((c) => ({ ...c, [key]: value }));
      const success = await run(async () => {
        await store.current!.check(key, value);
      });
      if (!success) setChecks((c) => ({ ...c, [key]: previous }));
      return success;
    },
    prefer: async (p: Preferences) =>
      run(async () => {
        await store.current!.preferences(p);
        setPreferences(p);
      }),
    reset: async () =>
      run(async () => {
        await store.current!.reset();
        setPlan(null);
        setMonths([]);
        setChecks({});
        setPreferences({ view: "Mese" });
      }),
  };
}
