// Fails when src/index.ts drifts from the handover export. `--write` re-copies it.
// Tokens are never hand-edited here: change the handover (design) first, then sync.
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(
  new URL('../../../reference/nano-beauty-dev-handover-v1.2.1/design-system/export/nano-tokens.ts', import.meta.url),
);
const target = fileURLToPath(new URL('../src/index.ts', import.meta.url));
const normalize = (s) => s.replace(/\r\n/g, '\n');

if (!existsSync(source)) {
  console.log('Handover reference not present; skipping token drift check.');
  process.exit(0);
}
if (process.argv.includes('--write')) {
  copyFileSync(source, target);
  console.log('Synced design tokens from the handover.');
} else if (normalize(readFileSync(source, 'utf8')) !== normalize(readFileSync(target, 'utf8'))) {
  console.error('packages/design-tokens/src/index.ts differs from the handover nano-tokens.ts. Run: npm run sync -w @nano/design-tokens');
  process.exit(1);
} else {
  console.log('Design tokens match the handover export.');
}
