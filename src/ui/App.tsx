import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useBudget } from "../application/useBudget";
import { downloadBackup, makeBackup, parseImport } from "../application/backup";
import { demoPlan } from "../domain/demo";
import {
  accountLabel,
  checklist,
  gateStatus,
  phaseFor,
  project,
  roleAccount,
  shiftMonth,
  type Operation,
} from "../domain/engine";
import type { Backup, PlanConfig } from "../domain/schema";
import { Icon, type IconName } from "./Icon";
import { formatMoney } from "./formatMoney";

type Budget = ReturnType<typeof useBudget>;
const nav = [
  { view: "Mese", icon: "month" },
  { view: "Piano", icon: "plan" },
  { view: "Dati", icon: "data" },
] as const;
const categories = [
  "Entrate",
  "Uscite fisse",
  "Spese varie",
  "Accantonamenti",
  "Fondo emergenza",
  "PAC",
  "Spese periodiche",
  "Quote di fase",
];
function monthTitle(month: string, locale: string) {
  const [y, m] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
function Panel({
  title,
  icon,
  children,
  open = false,
}: {
  title: string;
  icon?: IconName;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="panel" open={open || undefined}>
      <summary>
        {icon && (
          <span className="icon-disc">
            <Icon name={icon} />
          </span>
        )}
        <span>{title}</span>
        <Icon name="right" />
      </summary>
      <div className="panel-body">{children}</div>
    </details>
  );
}
function Nav({ budget }: { budget: Budget }) {
  return (
    <nav className="nav" aria-label="Navigazione principale">
      <div className="brand">
        <Icon name="brand" />
        <strong>Budget</strong>
      </div>
      <div className="nav-items">
        {nav.map((n) => (
          <button
            key={n.view}
            aria-current={
              budget.preferences.view === n.view ? "page" : undefined
            }
            onClick={() =>
              void budget.prefer({ ...budget.preferences, view: n.view })
            }
            disabled={budget.busy}
          >
            <Icon name={n.icon} />
            <span>{n.view}</span>
          </button>
        ))}
      </div>
      <span className="nav-foot">Solo sul dispositivo</span>
    </nav>
  );
}
function Route({ plan, o }: { plan: PlanConfig; o: Operation }) {
  if (o.kind === "income")
    return (
      <>
        {"→ "}
        {accountLabel(plan, o.destinationAccountId)}
      </>
    );
  if (o.kind === "periodic")
    return (
      <>
        {accountLabel(plan, plan.periodicReserve.hostAccountId)} · riserva
        interna
      </>
    );
  if (o.operationType === "internal-allocation")
    return <>{accountLabel(plan, o.sourceAccountId)} · riserva interna</>;
  if (o.kind === "expense")
    return <>{accountLabel(plan, o.sourceAccountId)} · addebito</>;
  return (
    <>
      {accountLabel(plan, o.sourceAccountId)} →{" "}
      {accountLabel(plan, o.destinationAccountId ?? o.destinationDebtId)}
    </>
  );
}
function Row({
  plan,
  o,
  budget,
}: {
  plan: PlanConfig;
  o: Operation;
  budget: Budget;
}) {
  const checked = !!budget.checks[o.key],
    informational = o.operationType === "phase-allocation",
    showPurpose = !!o.purpose && o.purpose !== o.description;
  return (
    <div
      className={`operation ${checked ? "completed" : ""} ${showPurpose ? "extended" : ""}`}
      data-key={o.key}
    >
      <span className="day">
        <strong>{o.day === null ? "—" : o.dayLabel}</strong>
      </span>
      <div className="operation-content">
        <span className="operation-title">
          {o.kind === "income" ? "Verifica accredito · " : ""}
          {o.description}
        </span>
        <span className="metadata">
          <Route plan={plan} o={o} />
        </span>
        {showPurpose && <span className="purpose">{o.purpose}</span>}
        {informational && (
          <span className="metadata">Modalità operativa da definire</span>
        )}
        {(o.unresolved || o.day === null) && (
          <span className="warning">Data effettiva da definire</span>
        )}
      </div>
      <span className={`amount ${o.kind === "income" ? "incoming" : ""}`}>
        {formatMoney(o.amountCents, o.kind === "income")}
      </span>
      {informational ? (
        <span
          className="check-target info-target"
          aria-label="Quota informativa, esecuzione da definire"
        >
          <Icon name="info" />
        </span>
      ) : (
        <label className="check-target">
          <input
            type="checkbox"
            aria-label={`Completata: ${o.description}`}
            checked={checked}
            disabled={budget.busy}
            onChange={(e) => void budget.check(o.key, e.target.checked)}
          />
          <span className="check-visual">
            {checked && <Icon name="check" />}
          </span>
        </label>
      )}
    </div>
  );
}
function Summary({
  plan,
  budget,
  month,
}: {
  plan: PlanConfig;
  budget: Budget;
  month: string;
}) {
  const metricsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const grid = metricsRef.current;
    if (!grid) return;
    const labels = [
      ...grid.querySelectorAll<HTMLElement>(".metric-label strong"),
    ];
    let frame = 0;
    const measure = () => {
      const height = `${Math.ceil(Math.max(0, ...labels.map((label) => label.getBoundingClientRect().height)) / 4) * 4}px`;
      if (grid.style.getPropertyValue("--label-content-height") !== height)
        grid.style.setProperty("--label-content-height", height);
    };
    measure();
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    for (const label of labels) observer.observe(label);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [plan]);
  const p = project(plan, budget.months, month),
    value = (v: number | null) => (v === null ? "Da definire" : formatMoney(v));
  const main = roleAccount(plan, "income-receiver"),
    card = roleAccount(plan, "monthly-variable-spending-budget"),
    fund = roleAccount(plan, "emergency-fund"),
    pac = roleAccount(plan, "long-term-contribution-plan");
  const goal = plan.phases.flatMap((f) => f.goals ?? [])[0];
  return (
    <details className="summary panel" open>
      <summary>
        <span>Riepilogo teorico</span>
        <Icon name="info" />
      </summary>
      <div className="panel-body">
        <p className="metadata intro">
          Se hai seguito il piano, la situazione dovrebbe essere questa.
        </p>
        <div className="summary-grid" ref={metricsRef}>
          <article className="metric main-metric">
            <div className="metric-label">
              <span className="icon-disc">
                <Icon name="bank" />
              </span>
              <strong>{main.label}</strong>
            </div>
            <div className="hero-value" data-testid="primary-value">
              {value(p.primary)}
            </div>
            <span className="metadata">Saldo teorico a fine mese</span>
            <dl>
              <div>
                <dt>Riserva periodiche</dt>
                <dd data-testid="reserve-value">{formatMoney(p.reserve)}</dd>
              </div>
              <div>
                <dt>Quota operativa</dt>
                <dd data-testid="operational-value">{value(p.operational)}</dd>
              </div>
            </dl>
          </article>
          <article className="metric">
            <div className="metric-label">
              <span className="icon-disc">
                <Icon name="wallet" />
              </span>
              <strong>{card.label}</strong>
            </div>
            <div className="metric-value" data-testid="loaded-value">
              {value(p.loaded)}
            </div>
            <span className="metadata">Budget caricato nel mese</span>
          </article>
          <article className="metric">
            <div className="metric-label">
              <span className="icon-disc">
                <Icon name="shield" />
              </span>
              <strong>{fund.label}</strong>
            </div>
            <div className="metric-value" data-testid="emergency-value">
              {value(p.emergency)}
            </div>
            <span className="metadata">Fondo teorico cumulato</span>
            {goal && (
              <>
                <progress
                  max={goal.targetCents || 1}
                  value={Math.min(p.emergency ?? 0, goal.targetCents)}
                  aria-label="Obiettivo fondo emergenza"
                />
                <span className="metadata">
                  Obiettivo di riferimento {formatMoney(goal.targetCents)}
                </span>
              </>
            )}
          </article>
          <article className="metric">
            <div className="metric-label">
              <span className="icon-disc">
                <Icon name="chart" />
              </span>
              <strong>{pac.label}</strong>
            </div>
            <div className="metric-value" data-testid="pac-value">
              {value(p.pac)}
            </div>
            <span className="metadata">Capitale teoricamente versato</span>
          </article>
        </div>
        {p.issues.length > 0 && (
          <div className="limit">
            <Icon name="info" />
            <div>
              {p.issues.map((i) => (
                <p key={i}>{i}</p>
              ))}
              {p.missingMonths.length > 0 && (
                <div className="missing-months">
                  {p.missingMonths.slice(0, 24).map((m) => (
                    <button
                      key={m}
                      onClick={() =>
                        void budget.prefer({ ...budget.preferences, month: m })
                      }
                    >
                      {monthTitle(m, plan.locale)}
                    </button>
                  ))}
                  {p.missingMonths.length > 24 && (
                    <span>
                      Altri {p.missingMonths.length - 24} mesi non configurati.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        <p className="summary-foot">
          I valori derivano dal piano e non dallo stato delle checkbox.
        </p>
      </div>
    </details>
  );
}
function Month({ plan, budget }: { plan: PlanConfig; budget: Budget }) {
  const asideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = asideRef.current;
    if (!element) return;
    let frame = 0;
    const measure = () => {
      const height = `${element.getBoundingClientRect().height}px`;
      if (element.style.getPropertyValue("--aside-height") !== height)
        element.style.setProperty("--aside-height", height);
    };
    measure();
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  const month = budget.preferences.month ?? plan.startMonth,
    phase = phaseFor(plan, budget.months, month),
    ops = checklist(plan, budget.months, month),
    actionable = ops.filter((o) => o.operationType !== "phase-allocation");
  const completed = actionable.filter((o) => budget.checks[o.key]).length;
  const gateOp = ops.find((o) => o.executionGate),
    gate = gateOp ? gateStatus(gateOp, budget.checks, month) : null;
  const days = [...new Set(ops.map((o) => o.day))];
  const move = (delta: number) =>
    void budget.prefer({
      ...budget.preferences,
      month: shiftMonth(month, delta),
    });
  return (
    <>
      <header className="month-header">
        <div>
          <p className="eyebrow">IL TUO MESE, CON CALMA</p>
          <div className="month-controls">
            <button
              className="icon-button"
              aria-label="Mese precedente"
              disabled={month === plan.startMonth || budget.busy}
              onClick={() => move(-1)}
            >
              <Icon name="left" />
            </button>
            <h1>{monthTitle(month, plan.locale)}</h1>
            <button
              className="icon-button"
              aria-label="Mese successivo"
              disabled={
                budget.busy || shiftMonth(plan.startMonth, 1199) === month
              }
              onClick={() => move(1)}
            >
              <Icon name="right" />
            </button>
          </div>
        </div>
      </header>
      <div className="month-layout">
        <section className="month-main" aria-label="Checklist mensile">
          <div className="phase-control">
            <span className="phase-pill" aria-hidden="true">
              <span>{phase?.label ?? "Seleziona la fase"}</span>
              <Icon name="right" />
            </span>
            <select
              id="phase"
              aria-label="Fase del mese"
              value={phase?.id ?? ""}
              disabled={budget.busy}
              onChange={(e) => void budget.phase(month, e.target.value)}
            >
              <option value="" disabled>
                Seleziona la fase
              </option>
              {plan.phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {(!phase || phase.status !== "defined") && (
            <p className="phase-note">
              <Icon name="info" />
              {phase
                ? "Modalità operativa da definire"
                : "Scegli la fase di questo mese. Le operazioni comuni sono già visibili."}
            </p>
          )}
          <div className="progress-section">
            <span>
              {completed} di {actionable.length} operazioni eseguite
            </span>
            <strong>
              {actionable.length
                ? Math.round((completed / actionable.length) * 100)
                : 0}
              %
            </strong>
            <progress
              max={actionable.length || 1}
              value={completed}
              aria-label="Progresso checklist"
            />
          </div>
          <div className="checklist card">
            {days.map((day) => (
              <section
                className="day-group"
                key={day ?? "unknown"}
                aria-label={
                  day === null ? "Giorno da definire" : `Giorno ${day}`
                }
              >
                {day !== null &&
                  ops.some((o) => o.day === day && o.executionGate) &&
                  gate && (
                    <div
                      className={`gate ${gate.verified === gate.total ? "verified" : ""}`}
                    >
                      <Icon
                        name={gate.verified === gate.total ? "check" : "info"}
                      />
                      <div>
                        <strong>
                          {gate.verified}/{gate.total} accrediti verificati
                        </strong>
                        <span>
                          Giorno nominale {gateOp?.dayLabel} · primo giorno
                          utile dopo entrambi gli accrediti
                        </span>
                      </div>
                    </div>
                  )}
                {ops
                  .filter((o) => o.day === day)
                  .map((o) => (
                    <Row key={o.key} plan={plan} o={o} budget={budget} />
                  ))}
              </section>
            ))}
          </div>
          <section className="month-details card">
            <h2>Dettagli del mese</h2>
            {categories.map((category) => {
              const items = ops.filter((o) => o.categoryName === category);
              if (
                !items.length &&
                ["Spese periodiche", "Quote di fase"].includes(category)
              )
                return null;
              return (
                <Panel key={category} title={category}>
                  <p className="detail-total">
                    {formatMoney(items.reduce((n, o) => n + o.amountCents, 0))}{" "}
                    <span className="metadata">nel mese</span>
                  </p>
                  {items.length ? (
                    items.map((o) => (
                      <div key={o.id} className="detail-line">
                        <span>
                          {o.description}
                          <small>
                            {o.details?.coveredCategories.join(" · ")}
                            {o.details &&
                              " · Categorie flessibili, senza sotto-budget rigidi."}
                            {o.operationType === "internal-allocation" &&
                              "Il denaro rimane sul conto principale."}
                          </small>
                        </span>
                        <strong>{formatMoney(o.amountCents)}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="metadata">
                      Nessuna operazione definita nella fase selezionata.
                    </p>
                  )}
                </Panel>
              );
            })}
          </section>
        </section>
        <aside className="month-aside" ref={asideRef}>
          <Summary plan={plan} budget={budget} month={month} />
          <div className="quiet-note">
            <Icon name="shield" />
            <p>
              Un promemoria personale.
              <br />I tuoi dati restano su questo dispositivo.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
function Plan({ plan }: { plan: PlanConfig }) {
  const operations = (items: PlanConfig["recurringIncome"]) =>
    items.map((o) => (
      <div className="detail-line" key={o.id}>
        <div>
          <strong>{o.description}</strong>
          <small>
            {o.schedule.type === "monthly-window"
              ? `Giorni ${o.schedule.startDay}–${o.schedule.endDay}`
              : o.schedule.type === "monthly-day"
                ? `Giorno ${o.schedule.day}`
                : o.schedule.type === "annual-date"
                  ? `${o.schedule.day}/${o.schedule.month} di ogni anno`
                  : o.schedule.type === "annual-month-day-tbd"
                    ? `Mese ${o.schedule.month} · giorno da definire`
                    : `Giorno nominale ${o.schedule.nominalDay}, dopo gli accrediti`}{" "}
            ·{" "}
            {accountLabel(
              plan,
              o.sourceAccountId ??
                o.destinationAccountId ??
                plan.periodicReserve.hostAccountId,
            )}
            {o.destinationAccountId &&
              o.sourceAccountId &&
              ` → ${accountLabel(plan, o.destinationAccountId)}`}
            {o.destinationDebtId &&
              ` → ${accountLabel(plan, o.destinationDebtId)} · modalità operativa da definire`}
            {o.destinationVirtualBucketId && " · riserva interna"}
          </small>
          {o.purpose && o.purpose !== o.description && (
            <small>{o.purpose}</small>
          )}
          {o.details && (
            <small>
              {o.details.coveredCategories.join(" · ")}. Categorie flessibili,
              senza sotto-budget rigidi.
            </small>
          )}
        </div>
        <strong>{formatMoney(o.amountCents)}</strong>
      </div>
    ));
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">UNA DIREZIONE CHIARA</p>
        <h1>Il mio piano</h1>
        <p>Regole e informazioni di riferimento.</p>
      </header>
      <div className="plan-content">
        <Panel title="Conti e contenitori" icon="bank" open>
          {plan.accounts.map((a) => (
            <div className="detail-line" key={a.id}>
              <div>
                <strong>{a.label}</strong>
                <small>
                  {a.activeInPlan === false
                    ? "Informativo · non attivo nel piano"
                    : a.roles.includes("income-receiver")
                      ? "Entrate, addebiti e liquidità operativa"
                      : a.roles.includes("monthly-variable-spending-budget")
                        ? "Budget mensile · saldo finale non stimato"
                        : a.roles.includes("emergency-fund")
                          ? "Fondo emergenza"
                          : a.roles.includes("long-term-contribution-plan")
                            ? "Capitale versato · nessun valore di mercato"
                            : a.kind}
                </small>
              </div>
            </div>
          ))}
          {plan.virtualBuckets.map((b) => (
            <div className="detail-line" key={b.id}>
              <div>
                <strong>{b.label}</strong>
                <small>
                  Riserva interna su {accountLabel(plan, b.hostAccountId)} · non
                  fisicamente separata
                </small>
              </div>
            </div>
          ))}
        </Panel>
        <Panel title="Valori iniziali" icon="wallet">
          <p className="metadata">Situazione di partenza · {plan.asOfDate}</p>
          {plan.initialBalances.map((b) => (
            <div className="detail-line" key={b.accountId}>
              <span>
                {accountLabel(plan, b.accountId)}
                <small>{b.meaning}</small>
              </span>
              <strong>{formatMoney(b.amountCents)}</strong>
            </div>
          ))}
        </Panel>
        <Panel title="Entrate ricorrenti" icon="download" open>
          {operations(plan.recurringIncome)}
        </Panel>
        <Panel title="Addebiti fissi" icon="wallet" open>
          {operations(plan.recurringExpenses)}
        </Panel>
        <Panel title="Movimenti comuni" icon="settings">
          {operations(plan.baseMonthlyOperations)}
        </Panel>
        <Panel title="Spese periodiche" icon="month">
          <p className="metadata">
            Accantonamento strutturale mensile:{" "}
            {formatMoney(plan.periodicReserve.monthlyAllocationCents)}. Non
            ricalcolato in base alla prossima scadenza.
          </p>
          {operations(plan.periodicReserve.scheduledExpenses)}
          {plan.periodicReserve.unscheduledReferenceExpenses.map((o) => (
            <div className="detail-line" key={o.id}>
              <span>
                {o.description}
                <small>Data non definita · solo riferimento</small>
              </span>
              <strong>{formatMoney(o.amountCents)}</strong>
            </div>
          ))}
          <h3>Quote di riferimento</h3>
          {plan.periodicReserve.referenceItems.map((o) => (
            <div className="detail-line" key={o.id}>
              <span>
                {o.description}
                <small>
                  {o.annualReferenceCents === null
                    ? "Nessun importo annuale"
                    : `${formatMoney(o.annualReferenceCents)} all’anno`}
                </small>
              </span>
              <strong>
                {o.monthlyReferenceCents !== undefined
                  ? formatMoney(o.monthlyReferenceCents)
                  : `~ ${formatMoney(o.monthlyReferenceCentsApprox ?? 0)}`}
                <small>al mese</small>
              </strong>
            </div>
          ))}
        </Panel>
        <Panel title="Fasi finanziarie" icon="plan" open>
          {plan.phases.map((p) => (
            <section className="phase-reference" key={p.id}>
              <h3>{p.label}</h3>
              <p className="metadata">
                {p.status === "defined"
                  ? "Fase definita · scelta manuale per mese"
                  : "Modalità operativa da definire"}
              </p>
              {operations(p.operations)}
              {p.goals?.map((g) => (
                <p key={g.id}>
                  {g.label}: {formatMoney(g.targetCents)} · nessun cambio fase
                  automatico.
                </p>
              ))}
              {p.informationalEconomics && (
                <dl>
                  {Object.entries(p.informationalEconomics).map(
                    ([key, val]) => (
                      <div key={key}>
                        <dt>
                          {{
                            ordinaryLoanPaymentCents: "Rata ordinaria prestito",
                            freedCarPaymentCents: "Ex rata auto liberata",
                            strategicAmountCents: "Quota strategica",
                            theoreticalTotalTowardPersonalLoanCents:
                              "Impegno economico teorico complessivo",
                            pacCents: "PAC",
                          }[key] ?? "Riferimento economico"}
                        </dt>
                        <dd>{formatMoney(val)}</dd>
                      </div>
                    ),
                  )}
                </dl>
              )}
              {p.projectionGuard?.issues.map((i) => (
                <p className="metadata" key={i.id}>
                  {i.description}
                </p>
              ))}
              {p.notes?.map((n) => (
                <p className="metadata" key={n}>
                  {n}
                </p>
              ))}
            </section>
          ))}
        </Panel>
        <Panel title="Debiti informativi" icon="info">
          {plan.debts.map((d) => (
            <div className="detail-line" key={d.id}>
              <div>
                <strong>{d.label}</strong>
                <small>
                  Rata {formatMoney(d.ordinaryPaymentCents)} ·{" "}
                  {d.reportedRemainingInstallments} rate residue comunicate
                </small>
                <small>
                  Conteggio iniziale informativo, non aggiornato
                  automaticamente.
                </small>
              </div>
              <strong>{formatMoney(d.reportedPayoffCents)}</strong>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}
type Pending = { plan: PlanConfig; backup?: Backup } | { reset: true };
function Confirm({
  pending,
  onConfirm,
  onCancel,
  busy,
}: {
  pending: Pending;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      className="confirm"
      ref={ref}
      aria-labelledby="confirmation-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <div className="dialog-heading">
        <h2 id="confirmation-title">
          {"reset" in pending
            ? "Eliminare i dati locali?"
            : pending.backup
              ? "Ripristinare questo backup?"
              : "Sostituire il piano?"}
        </h2>
        <button
          className="icon-button"
          aria-label="Annulla"
          onClick={onCancel}
          disabled={busy}
        >
          <Icon name="close" />
        </button>
      </div>
      <p>
        {"reset" in pending
          ? "Piano, fasi e checkbox verranno eliminati da questo dispositivo. Esporta un backup prima di procedere."
          : "Il piano, le fasi e le checkbox attuali verranno sostituiti. Esporta un backup se vuoi conservarli."}
      </p>
      {!("reset" in pending) && (
        <p className="metadata">
          Schema {pending.plan.schemaVersion} · {pending.plan.accounts.length}{" "}
          conti · {pending.backup?.months.length ?? 0} mesi configurati
        </p>
      )}
      <div className="dialog-actions">
        <button className="secondary" onClick={onCancel} disabled={busy}>
          Annulla
        </button>
        <button
          className={"reset" in pending ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy
            ? "Salvataggio…"
            : "reset" in pending
              ? "Elimina dati"
              : "Conferma importazione"}
        </button>
      </div>
    </dialog>
  );
}
function Data({
  plan,
  budget,
  onImport,
  onReset,
  pwa,
  update,
  install,
}: {
  plan: PlanConfig | null;
  budget: Budget;
  onImport: () => void;
  onReset: () => void;
  pwa: string;
  update?: () => void;
  install?: () => void;
}) {
  const [storage, setStorage] = useState<{
    usage?: number;
    quota?: number;
    persistent?: boolean;
  }>({});
  const [storageMessage, setStorageMessage] = useState("");
  useEffect(() => {
    void Promise.all([
      navigator.storage?.estimate?.(),
      navigator.storage?.persisted?.(),
    ])
      .then(([estimate, persistent]) => setStorage({ ...estimate, persistent }))
      .catch(() =>
        setStorageMessage(
          "Il browser non rende disponibile lo stato di archiviazione.",
        ),
      );
  }, []);
  const exportFile = () => {
    try {
      if (plan)
        downloadBackup(
          makeBackup(plan, budget.months, budget.checks, budget.preferences),
        );
    } catch {
      budget.setError("Backup non esportabile. I dati locali sono conservati.");
    }
  };
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">PRIVATO, PER SCELTA</p>
        <h1>Dati e backup</h1>
        <p>I tuoi dati restano solo su questo dispositivo.</p>
      </header>
      <div className="data-grid">
        <article className="card data-card">
          <span className="icon-disc">
            <Icon name="plan" />
          </span>
          <h2>Piano corrente</h2>
          <p>{plan ? "Piano caricato" : "Nessun piano caricato"}</p>
          {plan && (
            <p className="metadata">
              Schema {plan.schemaVersion} · versione {plan.planVersion}
              <br />
              Da {monthTitle(plan.startMonth, plan.locale)}
            </p>
          )}
          <button
            className="secondary"
            onClick={onImport}
            disabled={budget.busy || !budget.storageAvailable}
          >
            <Icon name="upload" />
            {plan ? "Sostituisci piano" : "Importa piano"}
          </button>
        </article>
        <article className="card data-card">
          <span className="icon-disc">
            <Icon name="download" />
          </span>
          <h2>Backup</h2>
          <p>Una copia completa del piano, delle fasi e dei promemoria.</p>
          <p className="metadata">
            Il file esportato contiene dati privati: conservalo con cura.
          </p>
          <button
            className="primary"
            onClick={exportFile}
            disabled={!plan || budget.busy}
          >
            <Icon name="download" />
            Esporta backup
          </button>
          <button
            className="secondary"
            onClick={onImport}
            disabled={budget.busy || !budget.storageAvailable}
          >
            <Icon name="upload" />
            Importa backup
          </button>
        </article>
        <article className="card data-card">
          <span className="icon-disc">
            <Icon name="data" />
          </span>
          <h2>Archivio locale</h2>
          <p>Salvato su questo dispositivo tramite IndexedDB.</p>
          <p className="metadata">
            {storage.usage === undefined
              ? "Spazio non disponibile"
              : `${(storage.usage / 1024 / 1024).toFixed(2)} MB utilizzati nell’origine`}
          </p>
          <p className="metadata">
            {storage.persistent
              ? "Archiviazione persistente concessa"
              : "Il browser può rimuovere i dati locali. Mantieni un backup."}
          </p>
          <button
            className="secondary"
            disabled={!navigator.storage?.persist}
            onClick={() => {
              void navigator.storage
                ?.persist?.()
                .then((persistent) => {
                  setStorage((s) => ({ ...s, persistent }));
                  setStorageMessage(
                    persistent
                      ? "Conservazione dei dati concessa."
                      : "Conservazione non concessa dal browser. Mantieni un backup.",
                  );
                })
                .catch(() =>
                  setStorageMessage(
                    "Richiesta non disponibile. Mantieni un backup locale.",
                  ),
                );
            }}
          >
            Conserva i dati sul dispositivo
          </button>
          {storageMessage && (
            <p className="metadata" role="status">
              {storageMessage}
            </p>
          )}
        </article>
        <article className="card data-card">
          <span className="icon-disc">
            <Icon name="shield" />
          </span>
          <h2>PWA e offline</h2>
          <p>{pwa}</p>
          <p className="metadata">
            Su iPad: Safari → Condividi → Aggiungi alla schermata Home.
          </p>
          {install && (
            <button className="primary" onClick={install}>
              Installa app
            </button>
          )}
          {update ? (
            <button className="secondary" onClick={update}>
              Applica aggiornamento
            </button>
          ) : (
            <p className="metadata">App aggiornata</p>
          )}
          <p className="metadata">Budget v1.0.0 · Database v1</p>
        </article>
      </div>
      <article className="card reset-card">
        <div>
          <h2>Reset del dispositivo</h2>
          <p className="metadata">
            Elimina il piano e tutti i promemoria locali.
          </p>
        </div>
        <button className="danger" onClick={onReset} disabled={budget.busy}>
          <Icon name="trash" />
          Elimina dati
        </button>
      </article>
    </>
  );
}
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function App() {
  const budget = useBudget(),
    input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null),
    [notice, setNotice] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [installEvent, setInstallEvent] = useState<InstallEvent | null>(null),
    [swError, setSwError] = useState(false),
    [shellReady, setShellReady] = useState(false),
    [registration, setRegistration] =
      useState<ServiceWorkerRegistration | null>(null);
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: () => setSwError(true),
    onRegisteredSW: (_url, value) => setRegistration(value ?? null),
  });
  useEffect(() => {
    if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;
    let active = true;
    void navigator.serviceWorker.ready.then((registration) => {
      if (active && registration.active?.state === "activated")
        setShellReady(true);
    });
    const changed = () => {
      setShellReady(!!navigator.serviceWorker.controller);
      setNeedRefresh(false);
    };
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    return () => {
      active = false;
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
    };
  }, [setNeedRefresh]);
  const updateReady =
    needRefresh && registration?.waiting?.state === "installed";
  const offlineAvailable = offlineReady || shellReady;
  useEffect(() => {
    if (budget.ready) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [
    budget.ready,
    budget.preferences.view,
    budget.preferences.month,
    budget.plan?.planId,
  ]);
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false),
      install = (e: Event) => {
        e.preventDefault();
        setInstallEvent(e as InstallEvent);
      };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", install);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", install);
    };
  }, []);
  const importFile = async (file: File) => {
    try {
      if (file.size > 5_000_000)
        throw new Error("File troppo grande. Limite: 5 MB.");
      const value = parseImport(await file.text());
      setPending(value);
    } catch (e) {
      budget.setError(
        e instanceof Error ? e.message : "Importazione non riuscita.",
      );
    }
  };
  const confirm = async () => {
    if (!pending) return;
    const success =
      "reset" in pending
        ? await budget.reset()
        : await budget.replace(pending.plan, pending.backup);
    if (success) setPending(null);
  };
  const demo = async () => {
    if (await budget.replace(demoPlan()))
      setNotice(
        "Piano dimostrativo caricato. Scegli la fase del mese per esplorarlo.",
      );
  };
  const pwa = swError
    ? "Offline non disponibile: registrazione non riuscita."
    : offlineAvailable
      ? "App pronta per funzionare offline."
      : import.meta.env.DEV
        ? "Modalità sviluppo: offline disponibile nella build di produzione."
        : "Preparazione della modalità offline…";
  if (!budget.ready)
    return <div className="loading">Apertura dell’archivio locale…</div>;
  return (
    <div className="app">
      <Nav budget={budget} />
      <main>
        {budget.busy && (
          <span className="save-state" role="status">
            Salvataggio locale…
          </span>
        )}
        <input
          ref={input}
          className="file-input"
          type="file"
          accept=".json,application/json"
          aria-label="Importa file JSON"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importFile(file);
            e.target.value = "";
          }}
        />
        {budget.error && (
          <div role="alert" className="error">
            {budget.error}
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button
              aria-label="Chiudi messaggio"
              className="icon-button"
              onClick={() => setNotice("")}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
        {!online && (
          <div className="offline-state">
            <Icon name="offline" />
            Offline ·{" "}
            {offlineAvailable
              ? "puoi continuare a usare il piano"
              : "cache non ancora pronta"}
          </div>
        )}
        {budget.plan && !budget.plan.privacy.containsPersonalFinancialData && (
          <div className="demo-banner">
            <Icon name="info" />
            Piano dimostrativo<span>Dati interamente fittizi</span>
          </div>
        )}
        {budget.preferences.view === "Dati" ? (
          <Data
            plan={budget.plan}
            budget={budget}
            onImport={() => input.current?.click()}
            onReset={() => setPending({ reset: true })}
            pwa={pwa}
            update={
              updateReady ? () => void updateServiceWorker(true) : undefined
            }
            install={
              installEvent
                ? () => {
                    void installEvent
                      .prompt()
                      .then(() => installEvent.userChoice)
                      .then(() => setInstallEvent(null));
                  }
                : undefined
            }
          />
        ) : budget.plan ? (
          budget.preferences.view === "Mese" ? (
            <Month plan={budget.plan} budget={budget} />
          ) : (
            <Plan plan={budget.plan} />
          )
        ) : (
          <section className="welcome">
            <span className="welcome-mark">
              <Icon name="brand" />
            </span>
            <p className="eyebrow">BUDGET</p>
            <h1>
              Il tuo piano,
              <br />
              solo sul tuo dispositivo.
            </h1>
            <p>
              Un mese alla volta. Le operazioni in ordine,
              <br />i promemoria al posto giusto.
            </p>
            <p className="metadata">
              Importa il file del tuo piano per iniziare.
              <br />I dati vengono salvati localmente e non inviati a un server.
            </p>
            <button
              className="primary"
              onClick={() => input.current?.click()}
              disabled={budget.busy || !budget.storageAvailable}
            >
              <Icon name="upload" />
              Importa piano
            </button>
            <button
              className="secondary"
              onClick={() => void demo()}
              disabled={budget.busy || !budget.storageAvailable}
            >
              <Icon name="plan" />
              Apri piano demo
            </button>
            <details className="how">
              <summary>Come funziona?</summary>
              <p>
                Verifica gli accrediti e spunta le operazioni eseguite. Scegli
                manualmente la fase di ogni mese. Il riepilogo segue il piano,
                indipendentemente dalle checkbox. Esporta un backup dalla
                sezione Dati per conservare una copia.
              </p>
            </details>
          </section>
        )}
        {pending && (
          <Confirm
            pending={pending}
            busy={budget.busy}
            onConfirm={() => void confirm()}
            onCancel={() => setPending(null)}
          />
        )}
      </main>
    </div>
  );
}
