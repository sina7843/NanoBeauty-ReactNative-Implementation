import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

export interface Queryable {
  query<T>(text: string, params?: unknown[]): Promise<T[]>;
}

/** Minimal surface shared by node-postgres and PGlite so tests run real Postgres SQL without Docker. */
export interface Db extends Queryable {
  /** Multi-statement SQL, no parameters. Runs as one implicit transaction. */
  exec(sql: string): Promise<void>;
  /** Runs `fn` in one transaction on one connection; rolls back if it throws. */
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export async function openDb(databaseUrl: string | undefined): Promise<Db> {
  if (!databaseUrl) return openPglite();
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
  return {
    query: async <T>(text: string, params?: unknown[]) => (await pool.query(text, params)).rows as T[],
    exec: async (sql) => {
      await pool.query(sql);
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn({ query: async <T>(text: string, params?: unknown[]) => (await client.query(text, params)).rows as T[] });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

/** In-memory Postgres (WASM). Data is lost on exit — development/test only. */
export async function openPglite(): Promise<Db> {
  const db = new PGlite();
  await db.waitReady;
  return {
    query: async <T>(text: string, params?: unknown[]) => (await db.query<T>(text, params)).rows,
    exec: async (sql) => {
      await db.exec(sql);
    },
    transaction: (fn) => db.transaction((tx) => fn({ query: async <T>(text: string, params?: unknown[]) => (await tx.query<T>(text, params)).rows })),
    close: () => db.close(),
  };
}
