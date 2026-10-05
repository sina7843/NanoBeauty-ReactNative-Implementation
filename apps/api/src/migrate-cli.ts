import { loadConfig } from './config';
import { openDb } from './db';
import { migrate } from './migrate';

const config = loadConfig();
if (!config.DATABASE_URL) {
  console.error('DATABASE_URL is not set. In-memory PGlite is migrated on API start; nothing to do.');
  process.exit(1);
}
const db = await openDb(config.DATABASE_URL);
try {
  const ran = await migrate(db);
  console.log(ran.length ? `Applied: ${ran.join(', ')}` : 'Database is up to date.');
} finally {
  await db.close();
}
