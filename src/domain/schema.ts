import { z } from "zod";

export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .refine(
    (v) => Number(v.slice(0, 4)) >= 1900 && Number(v.slice(0, 4)) <= 9998,
    "Anno fuori intervallo",
  );
const id = z.string().min(1).max(128);
const text = z.string().min(1).max(500);
const cents = z.number().int().nonnegative().max(1_000_000_000_000);
const day = z.number().int().min(1).max(31);
const annualMonth = z.number().int().min(1).max(12);
export const scheduleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("monthly-day"), day }),
  z
    .object({ type: z.literal("monthly-window"), startDay: day, endDay: day })
    .refine((s) => s.startDay <= s.endDay),
  z.object({ type: z.literal("nominal-day-with-gate"), nominalDay: day }),
  z
    .object({ type: z.literal("annual-date"), month: annualMonth, day })
    .refine(
      (s) => s.day <= new Date(Date.UTC(2000, s.month, 0)).getUTCDate(),
      "Data annuale invalida",
    ),
  z.object({
    type: z.literal("annual-month-day-tbd"),
    month: annualMonth,
    day: z.null(),
  }),
]);
const operation = z.object({
  id,
  description: text,
  amountCents: cents,
  schedule: scheduleSchema,
  operationType: z
    .enum(["transfer", "internal-allocation", "phase-allocation"])
    .optional(),
  sourceAccountId: id.optional(),
  destinationAccountId: id.optional(),
  destinationVirtualBucketId: id.optional(),
  destinationDebtId: id.optional(),
  source: id.optional(),
  purpose: text.optional(),
  category: text.optional(),
  debtId: id.optional(),
  checklistMode: z.literal("verification").optional(),
  affectsPhysicalAccountBalance: z.literal(false).optional(),
  executionGate: z
    .object({
      type: z.literal("completed-operations"),
      requiredOperationTemplateIds: z.array(id).min(1),
      displayRule: text,
      hardBlock: z.literal(false),
    })
    .optional(),
  technicalExecution: z.object({ defined: z.boolean(), note: text }).optional(),
  checklistDateStatus: z.literal("to-be-defined").optional(),
  details: z
    .object({
      coveredCategories: z.array(text),
      subBudgetsAreRigid: z.literal(false),
    })
    .optional(),
});
const phase = z.object({
  id,
  label: text,
  status: z.enum(["defined", "partially-defined", "undefined"]),
  operations: z.array(operation),
  notes: z.array(text).optional(),
  goals: z
    .array(
      z.object({
        id,
        label: text,
        targetCents: cents,
        autoAdvancePhase: z.literal(false),
      }),
    )
    .optional(),
  informationalEconomics: z.record(z.string(), cents).optional(),
  projectionGuard: z
    .object({
      status: text,
      issues: z.array(z.object({ id, description: text })),
    })
    .optional(),
});
export const planSchema = z
  .object({
    schemaVersion: z.literal(1),
    planVersion: text,
    planId: id,
    asOfDate: z.iso.date(),
    startMonth: monthSchema,
    locale: z.string().refine((v) => {
      try {
        new Intl.NumberFormat(v);
        return true;
      } catch {
        return false;
      }
    }),
    currency: z.string().regex(/^[A-Z]{3}$/),
    privacy: z.object({
      containsPersonalFinancialData: z.boolean(),
      intendedStorage: z.literal("local-device-only"),
      publicRepositoryAllowed: z.boolean(),
      notes: z.array(text),
    }),
    behavior: z.object({
      trackRealBalances: z.literal(false),
      compareActualVsPlanned: z.literal(false),
      trackActualExpenses: z.literal(false),
      bankConnections: z.literal(false),
      marketValueTracking: z.literal(false),
      automaticInvestmentAdvice: z.literal(false),
      automaticPhaseAdvance: z.literal(false),
      checkboxAffectsProjection: z.literal(false),
      phaseSelectionMode: z.literal("manual-per-month"),
    }),
    accounts: z
      .array(
        z.object({
          id,
          label: text,
          kind: z.enum(["checking", "prepaid", "cash", "investment", "other"]),
          roles: z.array(text),
          activeInPlan: z.boolean().optional(),
          valuationMode: z.literal("contributed-capital-only").optional(),
        }),
      )
      .min(1),
    virtualBuckets: z.array(
      z.object({
        id,
        label: text,
        kind: z.literal("internal-reserve"),
        hostAccountId: id,
        physicallySeparate: z.literal(false),
      }),
    ),
    initialBalances: z.array(
      z.object({ accountId: id, amountCents: cents, meaning: text.optional() }),
    ),
    recurringIncome: z.array(operation),
    recurringExpenses: z.array(operation),
    baseMonthlyOperations: z.array(operation),
    periodicReserve: z.object({
      monthlyAllocationCents: cents,
      hostAccountId: id,
      virtualBucketId: id,
      recalculateByMonthsUntilDue: z.literal(false),
      referenceItems: z.array(
        z.object({
          id,
          description: text,
          annualReferenceCents: cents.nullable(),
          monthlyReferenceCents: cents.optional(),
          monthlyReferenceCentsApprox: cents.optional(),
        }),
      ),
      scheduledExpenses: z.array(operation),
      unscheduledReferenceExpenses: z.array(
        z.object({
          id,
          description: text,
          amountCents: cents,
          schedule: z.null(),
        }),
      ),
    }),
    phases: z.array(phase).min(1),
    debts: z.array(
      z.object({
        id,
        label: text,
        ordinaryPaymentCents: cents,
        reportedRemainingInstallments: z.number().int().nonnegative(),
        reportedPayoffCents: cents,
      }),
    ),
    informationalTotals: z.record(z.string(), cents).optional(),
    summaryRules: z.object({
      introText: text,
      primaryAccount: z.object({
        showTheoreticalBalance: z.literal(true),
        showPeriodicReserve: z.literal(true),
        showTheoreticalOperationalBalance: z.literal(true),
      }),
      prepaid: z.object({
        showMonthlyLoadedBudget: z.literal(true),
        estimateEndingBalance: z.literal(false),
      }),
      emergencyFund: z.object({
        showTheoreticalCumulative: z.literal(true),
        source: z.literal("months-in-phase-1"),
      }),
      pac: z.object({
        showTheoreticalContributedCapital: z.literal(true),
        showMarketValue: z.literal(false),
      }),
      periodicReserve: z.object({
        showTheoreticalCumulative: z.literal(true),
        subtractScheduledPlanExpenses: z.literal(true),
      }),
    }),
    roundingRules: z.object({
      contractualAmountsKeepExactCents: z.literal(true),
      voluntaryBudgetsUseRoundAmounts: z.literal(true),
      automaticSmallDifferenceCorrections: z.literal(false),
    }),
    uxRules: z.object({
      checklistIsPrimary: z.literal(true),
      chronologicalOrdering: z.literal(true),
      accountAlwaysRecognizable: z.literal(true),
      transferPurposeAlwaysVisible: z.literal(true),
      sectionsCollapsible: z.literal(true),
      checkboxPersistencePerMonth: z.literal(true),
      phasePersistencePerMonth: z.literal(true),
      changingPhaseOnlyChangesPhaseDependentOperations: z.literal(true),
    }),
  })
  .superRefine((p, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    const unique = (values: string[], label: string) => {
      if (new Set(values).size !== values.length)
        issue(`Identificatori duplicati: ${label}`);
    };
    unique(
      p.accounts.map((a) => a.id),
      "conti",
    );
    unique(
      p.phases.map((a) => a.id),
      "fasi",
    );
    unique(
      p.debts.map((a) => a.id),
      "debiti",
    );
    unique(
      p.virtualBuckets.map((a) => a.id),
      "riserve",
    );
    unique(
      p.initialBalances.map((a) => a.accountId),
      "saldi iniziali",
    );
    const ops = [
      ...p.recurringIncome,
      ...p.recurringExpenses,
      ...p.baseMonthlyOperations,
      ...p.phases.flatMap((f) => f.operations),
      ...p.periodicReserve.scheduledExpenses,
    ];
    unique(
      ops.map((o) => o.id),
      "operazioni",
    );
    if (
      [
        ...ops.map((o) => o.amountCents),
        ...p.initialBalances.map((b) => b.amountCents),
      ].reduce((a, b) => a + b, 0) > 1_000_000_000_000
    )
      issue("Importi complessivi oltre il limite di precisione");
    const accounts = new Set(p.accounts.map((a) => a.id)),
      buckets = new Set(p.virtualBuckets.map((a) => a.id)),
      debts = new Set(p.debts.map((a) => a.id)),
      incomes = new Set(p.recurringIncome.map((o) => o.id));
    for (const b of [
      ...p.initialBalances,
      ...p.virtualBuckets.map((b) => ({ accountId: b.hostAccountId })),
    ])
      if (!accounts.has(b.accountId)) issue("Conto sconosciuto");
    if (p.initialBalances.length !== p.accounts.length)
      issue("Specificare il valore iniziale di ogni conto");
    if (
      !accounts.has(p.periodicReserve.hostAccountId) ||
      !buckets.has(p.periodicReserve.virtualBucketId)
    )
      issue("Riserva sconosciuta");
    if (
      !p.accounts
        .find((a) => a.id === p.periodicReserve.hostAccountId)
        ?.roles.includes("income-receiver")
    )
      issue("La riserva deve rimanere sul conto principale");
    if (
      p.virtualBuckets.find((b) => b.id === p.periodicReserve.virtualBucketId)
        ?.hostAccountId !== p.periodicReserve.hostAccountId
    )
      issue("Conto ospite della riserva incoerente");
    for (const o of [
      ...p.baseMonthlyOperations,
      ...p.phases.flatMap((f) => f.operations),
    ])
      if (
        !o.operationType ||
        !["monthly-day", "nominal-day-with-gate"].includes(o.schedule.type)
      )
        issue("Movimento mensile incompleto");
    const allocations = p.baseMonthlyOperations.filter(
      (o) =>
        o.operationType === "internal-allocation" &&
        o.destinationVirtualBucketId === p.periodicReserve.virtualBucketId,
    );
    if (
      allocations.length !== 1 ||
      allocations[0]?.amountCents !== p.periodicReserve.monthlyAllocationCents
    )
      issue("Quota mensile della riserva incoerente");
    for (const o of ops) {
      for (const key of ["sourceAccountId", "destinationAccountId"] as const)
        if (o[key] && !accounts.has(o[key]!))
          issue("Riferimento conto sconosciuto");
      if (
        o.destinationVirtualBucketId &&
        !buckets.has(o.destinationVirtualBucketId)
      )
        issue("Riferimento riserva sconosciuto");
      for (const key of ["destinationDebtId", "debtId"] as const)
        if (o[key] && !debts.has(o[key]!))
          issue("Riferimento debito sconosciuto");
      if (
        o.executionGate?.requiredOperationTemplateIds.some(
          (i) => !incomes.has(i),
        )
      )
        issue("Gate riferito a entrata sconosciuta");
      if (
        o.operationType === "transfer" &&
        (!o.sourceAccountId || !o.destinationAccountId)
      )
        issue("Trasferimento incompleto");
      if (
        o.operationType === "internal-allocation" &&
        (!o.sourceAccountId ||
          !o.destinationVirtualBucketId ||
          o.affectsPhysicalAccountBalance !== false)
      )
        issue("Accantonamento incompleto");
      if (o.operationType === "phase-allocation" && !o.destinationDebtId)
        issue("Quota priva di riferimento");
    }
    for (const o of p.recurringIncome)
      if (!o.destinationAccountId || o.schedule.type !== "monthly-window")
        issue("Entrata incompleta");
    for (const o of p.recurringExpenses)
      if (!o.sourceAccountId || o.schedule.type !== "monthly-day")
        issue("Addebito incompleto");
    for (const o of p.periodicReserve.scheduledExpenses)
      if (
        !["annual-date", "annual-month-day-tbd"].includes(o.schedule.type) ||
        o.source !== p.periodicReserve.virtualBucketId
      )
        issue("Scadenza periodica incompleta");
    for (const role of [
      "income-receiver",
      "monthly-variable-spending-budget",
      "emergency-fund",
      "long-term-contribution-plan",
    ])
      if (p.accounts.filter((a) => a.roles.includes(role)).length !== 1)
        issue(`Ruolo conto non univoco: ${role}`);
    if (
      p.privacy.containsPersonalFinancialData &&
      p.privacy.publicRepositoryAllowed
    )
      issue("Privacy incoerente");
  });
export type PlanConfig = z.infer<typeof planSchema>;
export type OperationTemplate = z.infer<typeof operation>;
export type Phase = z.infer<typeof phase>;
export const monthStateSchema = z.object({ month: monthSchema, phaseId: id });
export type MonthState = z.infer<typeof monthStateSchema>;
export const preferencesSchema = z.object({
  view: z.enum(["Mese", "Piano", "Dati"]),
  month: monthSchema.optional(),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const backupSchema = z
  .object({
    backupVersion: z.literal(1),
    exportedAt: z.iso.datetime(),
    plan: planSchema,
    months: z.array(monthStateSchema),
    checks: z.record(z.string(), z.boolean()),
    preferences: preferencesSchema,
  })
  .superRefine((b, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    const offset = (month: string) =>
      (Number(month.slice(0, 4)) - Number(b.plan.startMonth.slice(0, 4))) * 12 +
      Number(month.slice(5)) -
      Number(b.plan.startMonth.slice(5));
    if (new Set(b.months.map((m) => m.month)).size !== b.months.length)
      fail("Mesi duplicati");
    if (
      b.months.some(
        (m) =>
          offset(m.month) < 0 ||
          offset(m.month) >= 1200 ||
          !b.plan.phases.some((p) => p.id === m.phaseId),
      )
    )
      fail("Stato mensile non valido");
    if (
      b.preferences.month &&
      (offset(b.preferences.month) < 0 || offset(b.preferences.month) >= 1200)
    )
      fail("Preferenza mese non valida");
    const ids = new Set(
      [
        ...b.plan.recurringIncome,
        ...b.plan.recurringExpenses,
        ...b.plan.baseMonthlyOperations,
        ...b.plan.phases.flatMap((p) => p.operations),
        ...b.plan.periodicReserve.scheduledExpenses,
      ].map((o) => o.id),
    );
    for (const key of Object.keys(b.checks)) {
      const [month, ...parts] = key.split(":");
      if (
        !monthSchema.safeParse(month).success ||
        offset(month) < 0 ||
        offset(month) >= 1200 ||
        !ids.has(parts.join(":"))
      )
        fail("Checklist non valida");
    }
  });
export type Backup = z.infer<typeof backupSchema>;
