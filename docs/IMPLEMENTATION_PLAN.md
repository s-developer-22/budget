# Implementation plan

## Authority and privacy

Financial rules follow the supplied financial MASTER. Technical architecture follows the technical specification; layout follows the alignment specification and visual reference. Attachments remain outside this repository. No personal financial values, identifiers, screenshots or configuration are copied into source, tests, demo or documentation.

## Architecture and sequence

1. Strict versioned Zod schema with reference validation and integer cents.
2. Pure domain engine: deterministic monthly operations, annual deadlines, manual monthly phases, informational gates and theoretical projections independent of checklist state.
3. Domain tests using an entirely fictional plan.
4. Versioned IndexedDB stores for plan, month phases, checks, preferences and metadata; transactional replacement and restore.
5. Validated local JSON import, versioned backup export/restore, explicit destructive confirmation.
6. Tablet-first React shell: chronological Month checklist, consultative Plan, local Data management.
7. Accessible accordions, stable columns, one icon family, 4 px spacing, 44 px targets.
8. Installable PWA caching only public app shell assets, configurable deployment base.
9. Visual and functional QA at 744×1133 and 1133×744; phone fallback; offline and reload checks.
10. Run npm install, typecheck, tests, build, privacy scan; repair failures before delivery.

## Undefined rules

- Unselected months have no assumed phase: cumulative values requiring their phase remain unavailable until the user chooses it.
- Partial phase allocations are informational, without fabricated banking destinations or physical debits.
- The primary balance is unavailable from the first incomplete phase or unresolved recurring-day schedule onward.
- The end of a recurring debt installment is never inferred from a phase change.
- Undefined phase allocation remains empty; the engine does not invent continuing phase operations.
- Annual expenses with a known month but no day affect the end-of-month reserve and appear separately as day undefined. Unscheduled reference expenses are informational and not subtracted.
- Nominal days outside a calendar month retain their nominal label, are flagged, and are not silently moved to a different date. Related balance projections are unavailable.

## Verification

Domain, persistence and backup tests; automated browser geometry and interactions; Chromium screenshots and WebKit smoke checks when available. Browser viewport QA does not claim physical iPad hardware verification.
