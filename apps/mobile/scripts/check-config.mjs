// Validates the Expo app config for every variant without secrets: identifiers, schemes, API URL rule.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
