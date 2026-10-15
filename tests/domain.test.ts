import { describe, it, expect } from "vitest";
import { demoPlan } from "../src/domain/demo";
import {
  checklist,
  gateStatus,
  money,
  monthsThrough,
  project,
  shiftMonth,
} from "../src/domain/engine";
import {
  planSchema,
  backupSchema,
  type MonthState,
} from "../src/domain/schema";
import { makeBackup, parseImport } from "../src/application/backup";
const states = (end: string, phase = "demo-phase-a"): MonthState[] =>
  monthsThrough("2029-03", end).map((month) => ({ month, phaseId: phase }));
describe("money and calendar", () => {
  it("preserves exact cents and rejects float input", () => {
    expect(money(12345, demoPlan())).toMatch(/123,45/);
    expect(() => money(1.1, demoPlan())).toThrow();
  });
  it("rolls months without timezone ambiguity", () => {
    expect(shiftMonth("2029-12", 1)).toBe("2030-01");
    expect(shiftMonth("2029-01", -1)).toBe("2028-12");
    expect(() => monthsThrough("2029-03", "2029-02")).toThrow();
  });
});
describe("monthly checklist", () => {
  it("preserves configured income order and puts internal allocation after transfers", () => {
    const p = demoPlan();
    p.recurringIncome.reverse();
    const ops = checklist(p, states("2029-03"), "2029-03");
    expect(ops.filter((o) => o.kind === "income").map((o) => o.id)).toEqual(
      p.recurringIncome.map((o) => o.id),
    );
    expect(ops.filter((o) => o.day === 18).map((o) => o.id)).toEqual([
      "demo-variable",
      "demo-safety-op",
      "demo-pac-a",
      "demo-allocation",
    ]);
  });
  it("is chronological and identifiers are deterministic and month-specific", () => {
    const p = demoPlan(),
      a = checklist(p, states("2029-03"), "2029-03");
    expect(a).toEqual(checklist(p, states("2029-03"), "2029-03"));
    expect(a.map((o) => o.day)).toEqual(
      [...a.map((o) => o.day)].sort((a, b) => (a ?? 99) - (b ?? 99)),
    );
    expect(new Set(a.map((o) => o.key)).size).toBe(a.length);
    expect(checklist(p, states("2029-04"), "2029-04")[0].key).not.toBe(
      a[0].key,
    );
  });
  it("generates recurring entries and only current phase operations", () => {
    const p = demoPlan();
    const a = checklist(p, states("2029-03"), "2029-03"),
      b = checklist(p, states("2029-03", "demo-phase-b"), "2029-03");
    expect(a).toHaveLength(10);
    expect(a.filter((o) => o.kind === "income")).toHaveLength(2);
    expect(b.some((o) => o.id === "demo-extra")).toBe(true);
    expect(b.some((o) => o.id === "demo-safety-op")).toBe(false);
    expect(
      a
        .filter(
          (o) =>
            !o.id.startsWith("demo-safety-op") && !o.id.startsWith("demo-pac-"),
        )
        .map((o) => o.key),
    ).toEqual(
      b
        .filter((o) => o.id !== "demo-extra" && !o.id.startsWith("demo-pac-"))
        .map((o) => o.key),
    );
  });
  it("does not fabricate a phase or phase allocation", () => {
    expect(checklist(demoPlan(), [], "2029-03")).toHaveLength(8);
    expect(
      checklist(demoPlan(), states("2029-03", "demo-phase-d"), "2029-03"),
    ).toHaveLength(8);
    expect(
      project(demoPlan(), states("2029-03", "demo-phase-d"), "2029-03").pac,
    ).toBeNull();
  });
  it("keeps unknown day separate and only generates due annual expenses", () => {
    const nov = checklist(demoPlan(), states("2029-11"), "2029-11");
    expect(nov.at(-1)?.day).toBeNull();
    expect(nov.at(-1)?.id).toBe("demo-tbd");
    expect(
      checklist(demoPlan(), states("2029-08"), "2029-08").some(
        (o) => o.id === "demo-annual",
      ),
    ).toBe(true);
    expect(nov.some((o) => o.id === "demo-undated")).toBe(false);
  });
  it("never silently clamps nominal dates", () => {
    const p = demoPlan();
    p.recurringExpenses[0].schedule = { type: "monthly-day", day: 31 };
    const ops = checklist(p, states("2030-02"), "2030-02");
    expect(ops.find((o) => o.id === "demo-home")).toMatchObject({
      day: 31,
      unresolved: true,
    });
    expect(project(p, states("2030-02"), "2030-02").primary).toBeNull();
  });
  it("gate is informational at zero, one and two verified credits", () => {
    const month = "2029-03",
      o = checklist(demoPlan(), states(month), month).find(
        (o) => o.executionGate,
      )!;
    expect(gateStatus(o, {}, month)).toEqual({ verified: 0, total: 2 });
    expect(
      gateStatus(o, { [`${month}:demo-income-a`]: true }, month).verified,
    ).toBe(1);
    expect(
      gateStatus(
        o,
        { [`${month}:demo-income-a`]: true, [`${month}:demo-income-b`]: true },
        month,
      ).verified,
    ).toBe(2);
    expect(o.executionGate?.hardBlock).toBe(false);
  });
});
describe("theoretical projections", () => {
  it("does not apply a transfer whose execution is undefined even if its phase is marked defined", () => {
    const p = demoPlan();
    p.phases[0].operations[1].technicalExecution = {
      defined: false,
      note: "Execution unspecified",
    };
    expect(project(p, states("2029-03"), "2029-03")).toMatchObject({
      primary: null,
      pac: null,
      emergency: 30000,
      loaded: 42000,
    });
  });
  it("does not fabricate loaded budget or contribution balances on nonexistent nominal dates", () => {
    const p = demoPlan();
    p.startMonth = "2029-02";
    p.baseMonthlyOperations[0].schedule = {
      type: "nominal-day-with-gate",
      nominalDay: 31,
    };
    for (const o of p.phases[0].operations)
      o.schedule = { type: "nominal-day-with-gate", nominalDay: 31 };
    expect(
      project(
        p,
        [{ month: p.startMonth, phaseId: p.phases[0].id }],
        p.startMonth,
      ),
    ).toMatchObject({
      primary: null,
      pac: null,
      emergency: null,
      loaded: null,
    });
  });
  it("respects an explicit projection guard independently of a phase label", () => {
    const p = demoPlan();
    p.phases[2].status = "defined";
    expect(
      project(p, states("2029-03", "demo-phase-c"), "2029-03").primary,
    ).toBeNull();
  });
  it("calculates primary, reserve, operating share, loaded budget, emergency and contributed PAC", () => {
    expect(project(demoPlan(), states("2029-03"), "2029-03")).toMatchObject({
      primary: 141800,
      reserve: 8500,
      operational: 133300,
      loaded: 42000,
      emergency: 30000,
      pac: 15000,
      issues: [],
    });
  });
  it("reserve stays physically in the host account", () => {
    const p = demoPlan(),
      before = project(p, states("2029-03"), "2029-03");
    p.baseMonthlyOperations = p.baseMonthlyOperations.filter(
      (o) => o.operationType !== "internal-allocation",
    );
    const after = project(p, states("2029-03"), "2029-03");
    expect(before.primary).toBe(after.primary);
    expect(before.operational).toBe(after.operational! - 8500);
  });
  it("subtracts known annual and month-only deadlines exactly once annually", () => {
    expect(project(demoPlan(), states("2029-08"), "2029-08")).toMatchObject({
      primary: 432800,
      reserve: 8000,
      emergency: 180000,
      pac: 90000,
    });
    expect(project(demoPlan(), states("2029-11"), "2029-11").reserve).toBe(
      15500,
    );
    expect(project(demoPlan(), states("2030-08"), "2030-08").reserve).toBe(
      49000,
    );
  });
  it("does not use checkbox data as a projection input", () => {
    const p = demoPlan(),
      s = states("2029-03"),
      before = project(p, s, "2029-03");
    const backup = makeBackup(
      p,
      s,
      Object.fromEntries(checklist(p, s, "2029-03").map((o) => [o.key, true])),
      { view: "Mese" },
    );
    expect(project(backup.plan, backup.months, "2029-03")).toEqual(before);
  });
  it("partial phases keep known contributions but hide primary and operating balances", () => {
    const p = demoPlan(),
      s = states("2029-04");
    s[1].phaseId = "demo-phase-b";
    expect(project(p, s, "2029-04")).toMatchObject({
      primary: null,
      operational: null,
      pac: 30000,
      emergency: 30000,
      reserve: 17000,
    });
    expect(
      checklist(p, states("2029-03", "demo-phase-c"), "2029-03").some(
        (o) => o.id === "demo-loan-payment",
      ),
    ).toBe(true);
  });
  it("missing historical phases do not become automatic phase 1 months", () => {
    const p = project(
      demoPlan(),
      [{ month: "2029-04", phaseId: "demo-phase-a" }],
      "2029-04",
    );
    expect(p.primary).toBeNull();
    expect(p.pac).toBeNull();
    expect(p.missingMonths).toEqual(["2029-03"]);
  });
  it("reference goals never advance phases automatically", () => {
    const result = project(demoPlan(), states("2031-03"), "2031-03");
    expect(result.emergency).toBe(750000);
    expect(result.issues).toEqual([]);
  });
});
describe("schema and backup", () => {
  it("rejects checklist months beyond the supported backup horizon", () => {
    const b = makeBackup(demoPlan(), [], {}, { view: "Mese" });
    expect(
      backupSchema.safeParse({ ...b, checks: { "2130-03:demo-home": true } })
        .success,
    ).toBe(false);
  });
  it("validates fictional plan and exact versioned backup roundtrip", () => {
    const p = demoPlan();
    expect(planSchema.safeParse(p).success).toBe(true);
    const b = makeBackup(
      p,
      states("2029-03"),
      { "2029-03:demo-home": true },
      { view: "Piano", month: "2029-03" },
    );
    expect(parseImport(JSON.stringify(b)).backup).toEqual(b);
    expect(parseImport(JSON.stringify(p)).plan).toEqual(p);
  });
  it("rejects fractions, duplicates, unknown references and unsafe behavior", () => {
    for (const mutate of [
      (p: ReturnType<typeof demoPlan>) => {
        p.recurringExpenses[0].amountCents = 1.2;
      },
      (p: ReturnType<typeof demoPlan>) => {
        p.accounts.push(p.accounts[0]);
      },
      (p: ReturnType<typeof demoPlan>) => {
        p.recurringExpenses[0].sourceAccountId = "missing";
      },
      (p: ReturnType<typeof demoPlan>) => {
        p.recurringIncome[1].id = p.recurringIncome[0].id;
      },
    ]) {
      const p = demoPlan();
      mutate(p);
      expect(planSchema.safeParse(p).success).toBe(false);
    }
    const p = JSON.parse(JSON.stringify(demoPlan()));
    p.behavior.checkboxAffectsProjection = true;
    expect(planSchema.safeParse(p).success).toBe(false);
  });
  it("rejects malformed JSON and unsupported versions without echoing data", () => {
    expect(() => parseImport("{bad")).toThrow("JSON");
    expect(() =>
      parseImport('{"schemaVersion":42,"secret":"sensitive"}'),
    ).toThrow("File non valido");
    expect(() => parseImport(" ".repeat(5_000_001))).toThrow("troppo grande");
  });
  it("rejects invalid backup phases, duplicate months and unknown checklist keys", () => {
    const b = makeBackup(demoPlan(), states("2029-03"), {}, { view: "Mese" });
    expect(
      backupSchema.safeParse({
        ...b,
        months: [{ month: "2029-03", phaseId: "missing" }],
      }).success,
    ).toBe(false);
    expect(
      backupSchema.safeParse({ ...b, months: [...b.months, ...b.months] })
        .success,
    ).toBe(false);
    expect(
      backupSchema.safeParse({ ...b, checks: { "2029-03:missing": true } })
        .success,
    ).toBe(false);
  });
  it("rejects missing initial values and inconsistent internal reserves", () => {
    const a = demoPlan();
    a.initialBalances.pop();
    expect(planSchema.safeParse(a).success).toBe(false);
    const b = demoPlan();
    b.periodicReserve.monthlyAllocationCents++;
    expect(planSchema.safeParse(b).success).toBe(false);
  });
  it("rejects backup preferences outside the supported horizon", () => {
    const b = makeBackup(demoPlan(), [], {}, { view: "Mese" });
    expect(
      backupSchema.safeParse({
        ...b,
        preferences: { view: "Mese", month: "2130-03" },
      }).success,
    ).toBe(false);
  });
});
