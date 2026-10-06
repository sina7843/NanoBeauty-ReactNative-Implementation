// NANO-11 release gate: run before any EAS cloud build. Refuses a build whose prerequisites aren't real yet, so a
// placeholder API URL, unconfirmed app IDs or missing legal URLs never reach a store. Never prints secret values.
//   node scripts/release-gate.mjs <development|qa|testflight|production>
import { readFileSync } from 'node:fs';

const profile = process.argv[2];
const eas = JSON.parse(readFileSync(new URL('../apps/mobile/eas.json', import.meta.url), 'utf8'));
const release = JSON.parse(readFileSync(new URL('../apps/mobile/release.json', import.meta.url), 'utf8'));
const problems = [];
const p = eas.build[profile];
if (!p) {
  console.error(`Unknown EAS profile "${profile}". Use one of: ${Object.keys(eas.build).join(', ')}`);
  process.exit(2);
}
const env = { ...(p.extends ? eas.build[p.extends]?.env : {}), ...p.env };

// Every cloud build needs the EAS project (push tokens, credentials); the CLI login is checked by `eas build` itself.
if (!process.env.EAS_PROJECT_ID) problems.push('EAS_PROJECT_ID is not set (run `eas init` once, then set it in the build environment)');

if (env.APP_VARIANT !== 'development') {
  const url = env.EXPO_PUBLIC_API_URL ?? '';
  if (!url.startsWith('https://')) problems.push(`${profile}: EXPO_PUBLIC_API_URL must be https`);
  if (/\.invalid(\/|$)/.test(url)) problems.push(`${profile}: EXPO_PUBLIC_API_URL is still a placeholder (${new URL(url).host}); set the hosted API in eas.json`);
}
if (p.distribution === 'store') {
  if (!release.appIdsConfirmed) problems.push('store build: the clinic has not confirmed the bundle ID / package name (release.json appIdsConfirmed)');
  for (const [name, value] of Object.entries(release.urls)) {
    if (name === 'marketing') continue;
    if (!value) problems.push(`store build: ${name} URL is missing (release.json urls.${name})`);
    else if (!String(value).startsWith('https://')) problems.push(`store build: ${name} URL must be https`);
  }
  if (!release.domains.domainConfirmed) problems.push('store build: the link domain is not confirmed (gift and deletion pages, text/email links)');
  if (!release.contacts.reviewNotesReady) problems.push('store build: App Review notes / demo sign-in not ready (docs/store/review-notes.md)');
}

if (problems.length) {
  console.error(`Release gate FAILED for "${profile}":\n- ${problems.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`Release gate passed for "${profile}".`);
}
