// Validates the Expo app config for every variant without secrets: identifiers, schemes, API URL rule.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const expoCli = require.resolve('expo/bin/cli');
const PLACEHOLDER_URL = 'https://api.example.invalid';

function config(variant, apiUrl) {
  const env = { ...process.env, APP_VARIANT: variant };
  delete env.EXPO_PUBLIC_API_URL;
  if (apiUrl) env.EXPO_PUBLIC_API_URL = apiUrl;
  const out = execFileSync(process.execPath, [expoCli, 'config', '--type', 'public', '--json'], {
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(out);
}

const expected = {
  development: { id: 'com.nanobeauty.app.dev', scheme: 'nanobeauty-dev' },
  staging: { id: 'com.nanobeauty.app.staging', scheme: 'nanobeauty-staging' },
  production: { id: 'com.nanobeauty.app', scheme: 'nanobeauty' },
};

for (const [variant, want] of Object.entries(expected)) {
  const c = config(variant, variant === 'development' ? undefined : PLACEHOLDER_URL);
  assert.equal(c.ios.bundleIdentifier, want.id, `${variant} iOS bundle id`);
  assert.equal(c.android.package, want.id, `${variant} Android package`);
  assert.equal(c.scheme, want.scheme, `${variant} scheme`);
  assert.equal(c.orientation, 'portrait');
  assert.equal(c.extra.appVariant, variant);
  console.log(`ok ${variant}: ${c.name} (${want.id})`);
}

// EAS profiles: three Android outcomes (dev build, QA APK, store AAB) and iOS dev/TestFlight/store.
const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
const profiles = {
  development: { developmentClient: true, distribution: 'internal', androidBuildType: 'apk' },
  qa: { distribution: 'internal', androidBuildType: 'apk' },
  testflight: { distribution: 'store', androidBuildType: 'app-bundle' },
  production: { distribution: 'store', androidBuildType: 'app-bundle' },
};
for (const [name, want] of Object.entries(profiles)) {
  const p = eas.build[name];
  assert.ok(p, `eas.json profile ${name}`);
  assert.equal(p.distribution, want.distribution, `${name} distribution`);
  assert.equal(p.android?.buildType, want.androidBuildType, `${name} android.buildType`);
  if (want.developmentClient) assert.equal(p.developmentClient, true, `${name} developmentClient`);
  const c = config(p.env.APP_VARIANT, p.env.EXPO_PUBLIC_API_URL);
  console.log(`ok eas ${name}: ${p.env.APP_VARIANT} → ${c.ios.bundleIdentifier}, android ${want.androidBuildType}`);
}

for (const variant of ['staging', 'production']) {
  assert.throws(() => config(variant, undefined), undefined, `${variant} must require EXPO_PUBLIC_API_URL`);
  console.log(`ok ${variant}: refuses to build without EXPO_PUBLIC_API_URL`);
  assert.throws(() => config(variant, 'http://api.example.invalid'), undefined, `${variant} must require https`);
  console.log(`ok ${variant}: refuses a plain-http API URL`);
}

// Store hygiene (NANO-11): least-privilege Android permissions, no backups, privacy manifest, production push, no
// unused iOS usage strings. Plugin options are checked as configured (the build applies them).
{
  const c = config('production', PLACEHOLDER_URL);
  for (const p of ['android.permission.READ_CALENDAR', 'android.permission.WRITE_CALENDAR', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.RECORD_AUDIO']) {
    assert.ok(c.android.blockedPermissions.includes(p), `blocked ${p}`);
  }
  assert.equal(c.android.allowBackup, false, 'android.allowBackup');
  assert.equal(c.ios.privacyManifests?.NSPrivacyTracking, false, 'privacy manifest: no tracking');
  assert.ok(c.ios.privacyManifests.NSPrivacyAccessedAPITypes.length > 0, 'privacy manifest: required-reason APIs');
  const plugin = (name) => c.plugins.find((p) => (Array.isArray(p) ? p[0] : p) === name);
  assert.deepEqual(plugin('expo-notifications')?.[1], { mode: 'production' }, 'production push environment');
  assert.equal(plugin('expo-secure-store')?.[1]?.faceIDPermission, false, 'no Face ID string');
  assert.equal(plugin('expo-calendar')?.[1]?.remindersPermission, false, 'no Reminders string');
  assert.equal(c.ios.requireFullScreen, true, 'iPad full screen');
  console.log('ok production: permissions, backup, privacy manifest, push mode, usage strings');
}


// D-QA-02 / F-1: the six brand fonts exist, match fontFamily in @nano/design-tokens, are required by fonts.ts and
// are embedded through the expo-font plugin.
{
  const tokens = readFileSync(new URL('../../../packages/design-tokens/src/index.ts', import.meta.url), 'utf8');
  const block = tokens.match(/export const fontFamily = \{([\s\S]*?)\} as const;/)?.[1] ?? '';
  const names = [...block.matchAll(/'([A-Za-z]+-[A-Za-z]+)'/g)].map((m) => m[1]);
  assert.equal(names.length, 6, 'fontFamily lists six faces');
  const fontsTs = readFileSync(new URL('../src/theme/fonts.ts', import.meta.url), 'utf8');
  const c = config('production', PLACEHOLDER_URL);
  const fontPlugin = c.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-font');
  assert.ok(fontPlugin, 'expo-font plugin configured');
  for (const name of names) {
    assert.ok(existsSync(new URL(`../assets/fonts/${name}.ttf`, import.meta.url)), `assets/fonts/${name}.ttf exists`);
    assert.ok(fontsTs.includes(`assets/fonts/${name}.ttf`), `fonts.ts requires ${name}.ttf`);
    assert.ok(fontPlugin[1].fonts.some((f) => f.endsWith(`/${name}.ttf`)), `expo-font plugin embeds ${name}.ttf`);
  }
  console.log('ok brand fonts: six files, fonts.ts require map, expo-font plugin');
}
