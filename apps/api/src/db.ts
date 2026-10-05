import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

/** Minimal surface shared by node-postgres and PGlite so tests run real Postgres SQL without Docker. */
export interface Db {
  query<T>(text: string, params?: unknown[]): Promise<T[]>;
  /** Multi-statement SQL, no parameters. Runs as one implicit transaction. */
  exec(sql: string): Promise<void>;
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
    close: () => db.close(),
  };
}
