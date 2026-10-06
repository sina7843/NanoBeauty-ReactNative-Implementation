import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // PGlite compiles a large WASM module; baseline-only compilation keeps that from exhausting
    // memory on constrained dev machines (observed V8 "Zone" OOM). Negligible cost for tiny test DBs.
    execArgv: ['--liftoff-only'],
    // One file at a time: each test starts its own in-process Postgres, so parallel files double peak memory.
    fileParallelism: false,
  },
});
