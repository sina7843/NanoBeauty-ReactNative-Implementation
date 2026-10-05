import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required=['CLAUDE.md','Requirements.md','IMPLEMENTATION_DECISIONS.md','PROJECT_STATUS.md','DECISIONS.md','IMPLEMENTATION_STATUS.md','REQUIREMENTS_TRACEABILITY.md','.claude/settings.json','prompts/prompt-manifest.json','prompts/requirements-traceability.json','tools/Copy-DragonPrompt.ps1','tools/Setup-Project.ps1','01-INSTALL-TOOLS.cmd','02-SETUP-PROJECT.cmd','03-CHECK-PACKAGE.cmd','04-COPY-NEXT-PROMPT.cmd','05-START-CLAUDE.cmd','06-CREATE-LOCAL-ENV.cmd'];
for(const r of required) assert.ok(fs.existsSync(path.join(root,r)),`Missing required file: ${r}`);
const prompts=fs.readdirSync(path.join(root,'prompts')).filter(n=>/^\d{2}-.*\.md$/.test(n)).sort();
assert.equal(prompts.length,12,'Expected exactly 12 NANO implementation prompts.');
for(let i=0;i<12;i++){assert.ok(prompts[i].startsWith(String(i).padStart(2,'0')+'-')); const t=fs.readFileSync(path.join(root,'prompts',prompts[i]),'utf8'); assert.match(t,/```text\s*\r?\n[\s\S]+?\r?\n```/); assert.match(t,new RegExp(`NANO-${String(i).padStart(2,'0')}`));}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'prompts/prompt-manifest.json'),'utf8')); assert.equal(manifest.prompt_count,12);
const status=fs.readFileSync(path.join(root,'PROJECT_STATUS.md'),'utf8'); for(let i=0;i<12;i++) assert.match(status,new RegExp(`^- \\[ \\] NANO-${String(i).padStart(2,'0')}$`,'m'));
const inspected=[path.join(root,'CLAUDE.md'),path.join(root,'IMPLEMENTATION_DECISIONS.md'),...prompts.map(n=>path.join(root,'prompts',n))].map(n=>fs.readFileSync(n,'utf8')).join('\n');
const copy=fs.readFileSync(path.join(root,'tools/Copy-DragonPrompt.ps1'),'utf8'); assert.match(copy,/Get-Content .* -Raw -Encoding UTF8/); assert.match(copy,/NANO-/);
const fontExt=new Set(['.woff','.woff2','.ttf','.otf']); function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else assert.ok(!fontExt.has(path.extname(e.name).toLowerCase()),`Font binary must not be distributed in starter: ${path.relative(root,p)}`);}} walk(root);
console.log('Package validation passed: 12 NANO prompts, protected starter files, no bundled font binaries.');
