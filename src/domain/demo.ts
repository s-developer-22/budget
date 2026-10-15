import { planSchema, type PlanConfig } from "./schema";

// Entirely fictional, independent of the user's private financial configuration.
export function demoPlan(): PlanConfig {
  const gate = {
    type: "completed-operations",
    requiredOperationTemplateIds: ["demo-income-a", "demo-income-b"],
    displayRule: "Dopo entrambi gli accrediti",
    hardBlock: false,
  };
  const schedule = { type: "nominal-day-with-gate", nominalDay: 18 };
  const transfer = (
    id: string,
    description: string,
    amountCents: number,
    destinationAccountId: string,
  ) => ({
    id,
    description,
    amountCents,
    sourceAccountId: "demo-main",
    destinationAccountId,
    purpose: description,
    operationType: "transfer",
    schedule,
    executionGate: gate,
  });
  return planSchema.parse({
    schemaVersion: 1,
    planVersion: "demo-1",
    planId: "fictional-demo",
    asOfDate: "2029-02-28",
    startMonth: "2029-03",
    locale: "it-IT",
    currency: "EUR",
    privacy: {
      containsPersonalFinancialData: false,
      intendedStorage: "local-device-only",
      publicRepositoryAllowed: true,
      notes: ["Piano fittizio per esplorare l’interfaccia."],
    },
    behavior: {
      trackRealBalances: false,
      compareActualVsPlanned: false,
      trackActualExpenses: false,
      bankConnections: false,
      marketValueTracking: false,
      automaticInvestmentAdvice: false,
      automaticPhaseAdvance: false,
      checkboxAffectsProjection: false,
      phaseSelectionMode: "manual-per-month",
    },
    accounts: [
      {
        id: "demo-main",
        label: "Conto quotidiano",
        kind: "checking",
        roles: ["income-receiver", "periodic-reserve-host"],
      },
      {
        id: "demo-card",
        label: "Carta quotidiana",
        kind: "prepaid",
        roles: ["monthly-variable-spending-budget"],
      },
      {
        id: "demo-safety",
        label: "Fondo di sicurezza",
        kind: "cash",
        roles: ["emergency-fund"],
      },
      {
        id: "demo-invest",
        label: "Piano di accumulo",
        kind: "investment",
        roles: ["long-term-contribution-plan"],
      },
    ],
    virtualBuckets: [
      {
        id: "demo-reserve",
        label: "Riserva interna",
        kind: "internal-reserve",
        hostAccountId: "demo-main",
        physicallySeparate: false,
      },
    ],
    initialBalances: [
      { accountId: "demo-main", amountCents: 75000 },
      { accountId: "demo-card", amountCents: 0 },
      { accountId: "demo-safety", amountCents: 0 },
      { accountId: "demo-invest", amountCents: 0 },
    ],
    recurringIncome: [
      {
        id: "demo-income-a",
        description: "Entrata principale",
        amountCents: 215000,
        destinationAccountId: "demo-main",
        schedule: { type: "monthly-window", startDay: 12, endDay: 17 },
        checklistMode: "verification",
      },
      {
        id: "demo-income-b",
        description: "Entrata integrativa",
        amountCents: 35000,
        destinationAccountId: "demo-main",
        schedule: { type: "monthly-window", startDay: 12, endDay: 17 },
        checklistMode: "verification",
      },
    ],
    recurringExpenses: [
      {
        id: "demo-home",
        description: "Casa",
        amountCents: 71000,
        sourceAccountId: "demo-main",
        schedule: { type: "monthly-day", day: 2 },
        category: "fixed-expense",
      },
      {
        id: "demo-connection",
        description: "Connessione",
        amountCents: 3400,
        sourceAccountId: "demo-main",
        schedule: { type: "monthly-day", day: 7 },
        category: "fixed-expense",
      },
      {
        id: "demo-energy",
        description: "Energia",
        amountCents: 7800,
        sourceAccountId: "demo-main",
        schedule: { type: "monthly-day", day: 24 },
        category: "fixed-expense",
      },
      {
        id: "demo-loan-payment",
        description: "Rata prestito",
        amountCents: 14000,
        sourceAccountId: "demo-main",
        debtId: "demo-loan",
        schedule: { type: "monthly-day", day: 26 },
        category: "fixed-expense",
      },
    ],
    baseMonthlyOperations: [
      transfer("demo-variable", "Budget quotidiano", 42000, "demo-card"),
      {
        id: "demo-allocation",
        description: "Accantonamento periodico",
        purpose: "Spese periodiche",
        amountCents: 8500,
        sourceAccountId: "demo-main",
        destinationVirtualBucketId: "demo-reserve",
        operationType: "internal-allocation",
        affectsPhysicalAccountBalance: false,
        schedule,
        executionGate: gate,
      },
    ],
    periodicReserve: {
      monthlyAllocationCents: 8500,
      hostAccountId: "demo-main",
      virtualBucketId: "demo-reserve",
      recalculateByMonthsUntilDue: false,
      referenceItems: [
        {
          id: "demo-annual-ref",
          description: "Copertura annuale",
          annualReferenceCents: 43000,
          monthlyReferenceCentsApprox: 3600,
        },
      ],
      scheduledExpenses: [
        {
          id: "demo-annual",
          description: "Copertura annuale",
          amountCents: 43000,
          source: "demo-reserve",
          schedule: { type: "annual-date", month: 8, day: 10 },
        },
        {
          id: "demo-tbd",
          description: "Quota annuale",
          amountCents: 18000,
          source: "demo-reserve",
          schedule: { type: "annual-month-day-tbd", month: 11, day: null },
        },
      ],
      unscheduledReferenceExpenses: [
        {
          id: "demo-undated",
          description: "Manutenzione occasionale",
          amountCents: 9500,
          schedule: null,
        },
      ],
    },
    phases: [
      {
        id: "demo-phase-a",
        label: "Fase 1 — Costruire la riserva",
        status: "defined",
        operations: [
          transfer(
            "demo-safety-op",
            "Fondo di sicurezza",
            30000,
            "demo-safety",
          ),
          transfer("demo-pac-a", "PAC", 15000, "demo-invest"),
        ],
        goals: [
          {
            id: "demo-goal",
            label: "Obiettivo di riferimento",
            targetCents: 420000,
            autoAdvancePhase: false,
          },
        ],
      },
      {
        id: "demo-phase-b",
        label: "Fase 2 — Ridurre il prestito",
        status: "partially-defined",
        operations: [
          {
            id: "demo-extra",
            description: "Quota destinata al prestito",
            amountCents: 30000,
            sourceAccountId: "demo-main",
            destinationDebtId: "demo-loan",
            operationType: "phase-allocation",
            purpose: "Riduzione prestito",
            schedule,
            executionGate: gate,
            technicalExecution: {
              defined: false,
              note: "Modalità operativa da definire",
            },
          },
          transfer("demo-pac-b", "PAC", 15000, "demo-invest"),
        ],
      },
      {
        id: "demo-phase-c",
        label: "Fase 3 — Da configurare",
        status: "partially-defined",
        operations: [transfer("demo-pac-c", "PAC", 15000, "demo-invest")],
        projectionGuard: {
          status: "requires-master-clarification",
          issues: [
            {
              id: "demo-guard",
              description: "Applicabilità della rata da definire.",
            },
          ],
        },
      },
      {
        id: "demo-phase-d",
        label: "Fase 4 — Accumulo",
        status: "undefined",
        operations: [],
        notes: ["Allocazione da definire."],
      },
    ],
    debts: [
      {
        id: "demo-loan",
        label: "Prestito dimostrativo",
        ordinaryPaymentCents: 14000,
        reportedRemainingInstallments: 23,
        reportedPayoffCents: 280000,
      },
    ],
    summaryRules: {
      introText:
        "Se hai seguito il piano, la situazione dovrebbe essere questa.",
      primaryAccount: {
        showTheoreticalBalance: true,
        showPeriodicReserve: true,
        showTheoreticalOperationalBalance: true,
      },
      prepaid: { showMonthlyLoadedBudget: true, estimateEndingBalance: false },
      emergencyFund: {
        showTheoreticalCumulative: true,
        source: "months-in-phase-1",
      },
      pac: { showTheoreticalContributedCapital: true, showMarketValue: false },
      periodicReserve: {
        showTheoreticalCumulative: true,
        subtractScheduledPlanExpenses: true,
      },
    },
    roundingRules: {
      contractualAmountsKeepExactCents: true,
      voluntaryBudgetsUseRoundAmounts: true,
      automaticSmallDifferenceCorrections: false,
    },
    uxRules: {
      checklistIsPrimary: true,
      chronologicalOrdering: true,
      accountAlwaysRecognizable: true,
      transferPurposeAlwaysVisible: true,
      sectionsCollapsible: true,
      checkboxPersistencePerMonth: true,
      phasePersistencePerMonth: true,
      changingPhaseOnlyChangesPhaseDependentOperations: true,
    },
  });
}
