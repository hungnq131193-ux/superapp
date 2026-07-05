import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';

const files = [];
function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (['node_modules', 'dist', '.git'].includes(f)) continue;
    statSync(p).isDirectory() ? walk(p) : files.push(p);
  }
}
walk('src');

const forbidden = [
  [/innerHTML/, 'unsafe HTML rendering forbidden (innerHTML)'],
  [/document\.write/, 'unsafe HTML rendering forbidden (document.write)'],
  [/dangerouslySetInnerHTML/, 'unsafe HTML rendering forbidden (dangerouslySetInnerHTML)'],
  [/\beval\s*\(/, 'dynamic code execution forbidden (eval)'],
  [/new\s+Function\s*\(/, 'dynamic code execution forbidden (new Function)'],
  [/try\s*{\s*import/, 'try/catch around import']
];

let bad = [];
for (const f of files) {
  const s = readFileSync(f, 'utf8');
  for (const [re, msg] of forbidden) if (re.test(s)) bad.push(`${f}: ${msg}`);
}
if (bad.length) {
  console.error(bad.join('\n'));
  process.exit(1);
}
console.log(`Static check OK (${files.length} source files)`);
