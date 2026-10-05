import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts', 'src/migrate-cli.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node22',
  clean: true,
  // Workspace contracts ship as TypeScript source; bundle them, keep real npm deps external.
  noExternal: ['@nano/contracts'],
});
