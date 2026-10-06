import { loadConfig } from './config';
import { openDb } from './db';
import { reconcile } from './reconcile';

// `npm run reconcile -w @nano/api` — prints discrepancies (ids and amounts only); exit 1 when any are found.
const config = loadConfig();
if (!config.DATABASE_URL) {
  console.error('DATABASE_URL is not set: nothing to reconcile in an in-memory database.');
  process.exit(1);
}
const db = await openDb(config.DATABASE_URL);
try {
  const found = await reconcile(db);
  for (const f of found) console.log(`${f.check}\t${f.ref}\t${f.detail}`);
  console.log(found.length ? `${found.length} discrepancies` : 'Ledger reconciles.');
  process.exitCode = found.length ? 1 : 0;
} finally {
  await db.close();
}
