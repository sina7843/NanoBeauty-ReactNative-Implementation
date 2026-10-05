import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Db } from './db';

// Resolves to apps/api/migrations from both src/ (tsx) and dist/ (bundled build).
const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations/', import.meta.url));
const NAME = /^\d{4}_[a-z0-9_]+\.sql$/;

/**
 * Applies pending forward-only SQL migrations in filename order. Each file and its bookkeeping row
 * run as one implicit transaction (single simple-protocol query).
 * ponytail: no cross-process lock — run migrations as a single deploy step, not from every instance.
 */
export async function migrate(db: Db, dir = MIGRATIONS_DIR): Promise<string[]> {
  await db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());',
  );
  const applied = new Set((await db.query<{ name: string }>('SELECT name FROM schema_migrations')).map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const ran: string[] = [];
  for (const file of files) {
    if (!NAME.test(file)) throw new Error(`Migration file name not allowed: ${file}`);
    if (applied.has(file)) continue;
    const sql = await readFile(`${dir}/${file}`, 'utf8');
    await db.exec(`${sql}\nINSERT INTO schema_migrations (name) VALUES ('${file}');`);
    ran.push(file);
  }
  return ran;
}
