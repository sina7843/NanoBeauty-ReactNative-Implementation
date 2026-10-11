import type { Queryable } from './db';

/**
 * Test helper: finishes sign-up (terms + transactional consents, a first name) for a number, so customer writes pass
 * the API-14 onboarding gate. Consents are dated in the past so a test's own consent records stay the latest.
 */
export async function onboard(db: Queryable, e164: string): Promise<void> {
  await db.query(
    `WITH c AS (UPDATE customers SET first_name = COALESCE(first_name, 'Client') WHERE phone_e164 = $1 RETURNING id)
     INSERT INTO consents (customer_id, purpose, granted, version, channel, recorded_at)
     SELECT c.id, p, true, 'test', 'app', '2000-01-01' FROM c, unnest(ARRAY['terms', 'transactional']) AS p`,
    [e164],
  );
}
