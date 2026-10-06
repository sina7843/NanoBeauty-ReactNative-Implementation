import type { Queryable } from './db';

/**
 * Value reconciliation (NFR 03, LEG 03, ADMIN 09): checks the ledger against itself and against orders and refunds.
 * Read-only; returns one line per discrepancy (ids and amounts only, no personal data) for staff to own and resolve.
 * Run before and after cutover; a scheduled run comes with hosting (NANO-11). A void must zero the card with a ledger
 * entry, so a voided instrument with value left is always flagged.
 */
export async function reconcile(db: Queryable): Promise<{ check: string; ref: string; detail: string }[]> {
  const out: { check: string; ref: string; detail: string }[] = [];
  const add = (check: string, rows: { ref: string; detail: string }[]) => rows.forEach((r) => out.push({ check, ...r }));

  // Balances never go below zero (money or sessions).
  add(
    'negative_balance',
    await db.query(
      `SELECT instrument_id::text AS ref, 'amount ' || COALESCE(SUM(amount_cents), 0) || ' / sessions ' || COALESCE(SUM(sessions), 0) AS detail FROM ledger_entries
        GROUP BY instrument_id HAVING COALESCE(SUM(amount_cents), 0) < 0 OR COALESCE(SUM(sessions), 0) < 0`,
    ),
  );
  // A paid order created exactly one instrument with one purchase entry for the amount paid.
  add(
    'paid_order_without_value',
    await db.query(
      `SELECT o.reference AS ref, 'paid ' || o.amount_cents AS detail FROM orders o
        WHERE o.status IN ('paid', 'refunded', 'partially_refunded')
          AND NOT EXISTS (SELECT 1 FROM ledger_entries l WHERE l.order_id = o.id AND l.kind = 'purchase')`,
    ),
  );
  add(
    'gift_purchase_mismatch',
    await db.query(
      `SELECT o.reference AS ref, 'order ' || o.amount_cents || ' / ledger ' || l.amount_cents AS detail FROM orders o
         JOIN ledger_entries l ON l.order_id = o.id AND l.kind = 'purchase'
        WHERE o.kind = 'gift' AND l.amount_cents <> (o.gift->>'amountCents')::integer`,
    ),
  );
  // Succeeded refunds that held wallet value have a matching ledger 'refund'; failed ones were reversed.
  add(
    'refund_failed_not_reversed',
    await db.query(
      `SELECT r.reference AS ref, 'failed refund ' || r.amount_cents AS detail FROM refunds r
        WHERE r.status = 'failed'
          AND EXISTS (SELECT 1 FROM ledger_entries l WHERE l.idempotency_key = 'refund:' || r.id)
          AND NOT EXISTS (SELECT 1 FROM ledger_entries l WHERE l.idempotency_key = 'reverse:' || r.id)`,
    ),
  );
  add(
    'refund_over_payment',
    await db.query(
      `SELECT a.reference AS ref, 'paid ' || a.amount_cents || ' / refunded ' || SUM(r.amount_cents) AS detail FROM refunds r JOIN payment_attempts a ON a.id = r.attempt_id
        WHERE r.status <> 'failed' GROUP BY a.id, a.reference, a.amount_cents HAVING SUM(r.amount_cents) > a.amount_cents`,
    ),
  );
  // A voided gift card holds nothing.
  add(
    'voided_with_balance',
    await db.query(
      `SELECT w.id::text AS ref, 'balance ' || COALESCE(SUM(l.amount_cents), 0) AS detail FROM wallet_instruments w JOIN ledger_entries l ON l.instrument_id = w.id
        WHERE w.status = 'voided' GROUP BY w.id HAVING COALESCE(SUM(l.amount_cents), 0) <> 0`,
    ),
  );
  return out;
}
