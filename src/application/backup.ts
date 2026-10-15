import {
  backupSchema,
  planSchema,
  type Backup,
  type MonthState,
  type PlanConfig,
  type Preferences,
} from "../domain/schema";
export function parseImport(raw: string) {
  if (raw.length > 5_000_000)
    throw new Error("File troppo grande. Limite: 5 MB.");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Il file non contiene JSON valido.");
  }
  const backup = backupSchema.safeParse(value);
  if (backup.success) return { plan: backup.data.plan, backup: backup.data };
  const plan = planSchema.safeParse(value);
  if (plan.success) return { plan: plan.data, backup: undefined };
  // Validation errors deliberately avoid echoing private file contents.
  throw new Error(
    "File non valido o versione non supportata. Verifica schema, riferimenti e importi in centesimi. I dati presenti sono conservati.",
  );
}
export function makeBackup(
  plan: PlanConfig,
  months: MonthState[],
  checks: Record<string, boolean>,
  preferences: Preferences,
): Backup {
  return backupSchema.parse({
    backupVersion: 1,
    exportedAt: new Date().toISOString(),
    plan,
    months,
    checks,
    preferences,
  });
}
export function downloadBackup(backup: Backup) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
