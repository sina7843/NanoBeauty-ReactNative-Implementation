// NANO-10 secret scan: tracked files only (git ls-files), excluding the read-only handover and binaries.
// Flags credential-shaped strings and files that must never be committed. Exits 1 on any finding.
//   node scripts/scan-secrets.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const FORBIDDEN_FILE = /(^|\/)\.env(\.(?!example$)[^/]+)?$|\.(pem|p12|p8|key|keystore|jks|mobileprovision)$|google-services\.json$|GoogleService-Info\.plist$/i;
const PATTERNS = [
  ['stripe key', /\b(sk|rk)_(live|test)_[A-Za-z0-9]{16,}/],
  ['aws key', /\bAKIA[0-9A-Z]{16}\b/],
  ['private key', /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ['github token', /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ['google api key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['expo token', /\bEXPO_TOKEN\s*=\s*\S{10,}/],
  ['generic secret assignment', /\b(api[_-]?key|secret|password|token)\s*[:=]\s*['"][A-Za-z0-9/+_=-]{20,}['"]/i],
];
const findings = [];
for (const f of files) {
  if (f.startsWith('reference/') || /\.(png|jpe?g|webp|gif|ttf|otf|woff2?|ico|lock)$/i.test(f) || f.endsWith('package-lock.json')) continue;
  if (FORBIDDEN_FILE.test(f)) findings.push(`${f}: file type must not be committed`);
  let text;
  try {
    text = readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  text.split('\n').forEach((line, i) => {
    // Record IDs (UUIDs) in fixtures aren't secrets.
    const clean = line.replace(/['"][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['"]/gi, "''");
    for (const [name, re] of PATTERNS) if (re.test(clean)) findings.push(`${f}:${i + 1}: ${name}`);
  });
}
console.log(findings.length ? findings.join('\n') : `No secrets found in ${files.length} tracked files.`);
process.exitCode = findings.length ? 1 : 0;
