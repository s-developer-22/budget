import type { MonthState, OperationTemplate, PlanConfig } from "./schema";

export function money(
  cents: number,
  p: Pick<PlanConfig, "locale" | "currency">,
): string {
  if (!Number.isSafeInteger(cents)) throw new Error("Importo non intero");
  return new Intl.NumberFormat(p.locale, {
    style: "currency",
    currency: p.currency,
  }).format(cents / 100);
}
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function monthsThrough(start: string, end: string): string[] {
  if (end < start) throw new Error("Mese precedente al piano");
  const result: string[] = [];
  for (let m = start; m <= end; m = shiftMonth(m, 1)) {
    if (result.length >= 1200) throw new Error("Orizzonte massimo: 100 anni");
    result.push(m);
  }
  return result;
}
export function phaseFor(p: PlanConfig, states: MonthState[], month: string) {
  return p.phases.find(
    (f) => f.id === states.find((s) => s.month === month)?.phaseId,
  );
}
export function roleAccount(p: PlanConfig, role: string) {
  return p.accounts.find((a) => a.roles.includes(role))!;
}
export function accountLabel(p: PlanConfig, id?: string) {
  return (
    p.accounts.find((a) => a.id === id)?.label ??
    p.virtualBuckets.find((a) => a.id === id)?.label ??
    p.debts.find((a) => a.id === id)?.label ??
    "Destinazione da definire"
  );
}
export type Operation = OperationTemplate & {
  key: string;
  day: number | null;
  dayLabel: string;
  categoryName: string;
  kind: "income" | "expense" | "operation" | "periodic";
  unresolved: boolean;
};
export function categoryFor(
  p: PlanConfig,
  o: OperationTemplate,
  kind: Operation["kind"],
): string {
  if (kind === "income") return "Entrate";
  if (kind === "expense") return "Uscite fisse";
  if (kind === "periodic") return "Spese periodiche";
  if (o.operationType === "internal-allocation") return "Accantonamenti";
  const account = p.accounts.find((a) => a.id === o.destinationAccountId);
  if (account?.roles.includes("monthly-variable-spending-budget"))
    return "Spese varie";
  if (account?.roles.includes("emergency-fund")) return "Fondo emergenza";
  if (account?.roles.includes("long-term-contribution-plan")) return "PAC";
  return "Quote di fase";
}
function materialize(
  p: PlanConfig,
  o: OperationTemplate,
  month: string,
  kind: Operation["kind"],
): Operation {
  const s = o.schedule;
  let day: number | null = null,
    dayLabel = "Da definire";
  if (s.type === "monthly-day" || s.type === "annual-date") {
    day = s.day;
    dayLabel = String(day).padStart(2, "0");
  }
  if (s.type === "monthly-window") {
    day = s.startDay;
    dayLabel = `${s.startDay}–${s.endDay}`;
  }
  if (s.type === "nominal-day-with-gate") {
    day = s.nominalDay;
    dayLabel = String(day).padStart(2, "0");
  }
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const unresolved =
    day !== null &&
    (day > days || (s.type === "monthly-window" && s.endDay > days));
  return {
    ...o,
    key: `${month}:${o.id}`,
    day,
    dayLabel,
    kind,
    categoryName: categoryFor(p, o, kind),
    unresolved,
  };
}
export function checklist(
  p: PlanConfig,
  states: MonthState[],
  month: string,
): Operation[] {
  if (month < p.startMonth) throw new Error("Mese precedente al piano");
  const phase = phaseFor(p, states, month);
  const monthNum = Number(month.slice(5));
  return [
    ...p.recurringIncome.map((o) => materialize(p, o, month, "income")),
    ...p.recurringExpenses.map((o) => materialize(p, o, month, "expense")),
    ...[...p.baseMonthlyOperations, ...(phase?.operations ?? [])].map((o) =>
      materialize(p, o, month, "operation"),
    ),
    ...p.periodicReserve.scheduledExpenses
      .filter((o) => "month" in o.schedule && o.schedule.month === monthNum)
      .map((o) => materialize(p, o, month, "periodic")),
  ].sort(
    (a, b) =>
      (a.day ?? 99) - (b.day ?? 99) ||
      (a.kind === "expense" ? -1 : 0) - (b.kind === "expense" ? -1 : 0) ||
      Number(a.operationType === "internal-allocation") -
        Number(b.operationType === "internal-allocation"),
  );
}
export function gateStatus(
  o: Operation,
  checks: Record<string, boolean>,
  month: string,
) {
  const ids = o.executionGate?.requiredOperationTemplateIds ?? [];
  return {
    verified: ids.filter((id) => checks[`${month}:${id}`]).length,
    total: ids.length,
  };
}
export type Projection = {
  primary: number | null;
  reserve: number;
  operational: number | null;
  loaded: number | null;
  emergency: number | null;
  pac: number | null;
  issues: string[];
  missingMonths: string[];
};
export function project(
  p: PlanConfig,
  states: MonthState[],
  target: string,
): Projection {
  const primaryId = roleAccount(p, "income-receiver").id;
  const emergencyId = roleAccount(p, "emergency-fund").id,
    pacId = roleAccount(p, "long-term-contribution-plan").id,
    prepaidId = roleAccount(p, "monthly-variable-spending-budget").id;
  const balance = (id: string) =>
    p.initialBalances.find((b) => b.accountId === id)?.amountCents ?? 0;
  const balances: Record<string, number> = Object.fromEntries(
    p.accounts.map((a) => [a.id, balance(a.id)]),
  );
  let reserve = 0,
    loaded = 0,
    primaryKnown = true,
    emergencyKnown = true,
    pacKnown = true,
    loadedKnown = true;
  const issues = new Set<string>(),
    missingMonths: string[] = [];
  for (const month of monthsThrough(p.startMonth, target)) {
    const phase = phaseFor(p, states, month);
    if (!phase) {
      missingMonths.push(month);
      primaryKnown = false;
      emergencyKnown = false;
      pacKnown = false;
    }
    if (phase && phase.status !== "defined") {
      primaryKnown = false;
      issues.add("Modalità operativa da definire");
      if (phase.status === "undefined") {
        emergencyKnown = false;
        pacKnown = false;
      }
      for (const issue of phase.projectionGuard?.issues ?? [])
        issues.add(issue.description);
    }
    loaded = 0;
    loadedKnown = true;
    if (phase?.projectionGuard) {
      primaryKnown = false;
      for (const issue of phase.projectionGuard.issues)
        issues.add(issue.description);
    }
    for (const o of checklist(p, states, month)) {
      if (o.unresolved) {
        primaryKnown = false;
        if (o.destinationAccountId === emergencyId) emergencyKnown = false;
        if (o.destinationAccountId === pacId) pacKnown = false;
        if (o.destinationAccountId === prepaidId) loadedKnown = false;
        issues.add(
          `Giorno nominale non presente nel mese: ${o.dayLabel}. Data effettiva da definire.`,
        );
      }
      if (
        o.operationType === "phase-allocation" ||
        o.technicalExecution?.defined === false
      ) {
        primaryKnown = false;
        if (o.destinationAccountId === emergencyId) emergencyKnown = false;
        if (o.destinationAccountId === pacId) pacKnown = false;
        if (o.destinationAccountId === prepaidId) loadedKnown = false;
        issues.add("Modalità operativa da definire");
        continue;
      }
      if (o.kind === "income" && o.destinationAccountId)
        balances[o.destinationAccountId] += o.amountCents;
      else if (o.kind === "expense" && o.sourceAccountId)
        balances[o.sourceAccountId] -= o.amountCents;
      else if (o.kind === "periodic") {
        reserve -= o.amountCents;
        balances[p.periodicReserve.hostAccountId] -= o.amountCents;
      } else if (o.operationType === "internal-allocation")
        reserve += o.amountCents;
      else if (
        o.operationType === "transfer" &&
        o.sourceAccountId &&
        o.destinationAccountId
      ) {
        balances[o.sourceAccountId] -= o.amountCents;
        balances[o.destinationAccountId] += o.amountCents;
        if (o.destinationAccountId === prepaidId) loaded += o.amountCents;
      }
      // Phase allocations carry no defined banking execution. Do not invent a debit.
    }
  }
  if (missingMonths.length)
    issues.add(
      "Seleziona la fase dei mesi non configurati per completare la proiezione.",
    );
  const primary = primaryKnown ? balances[primaryId] : null;
  return {
    primary,
    reserve,
    operational: primary === null ? null : primary - reserve,
    loaded: loadedKnown ? loaded : null,
    emergency: emergencyKnown ? balances[emergencyId] : null,
    pac: pacKnown ? balances[pacId] : null,
    issues: [...issues],
    missingMonths,
  };
}
