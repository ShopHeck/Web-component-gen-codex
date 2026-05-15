import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'coverage']);
const SKIP_FILES = new Set(['package-lock.json']);
const MARKER = /^(<{7}|={7}|>{7})( .*)?$/m;

function walk(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const rel = full.slice(ROOT.length + 1);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, results);
    else if (!SKIP_FILES.has(rel)) results.push(rel);
  }
  return results;
}

const files = walk(ROOT);
const offenders = [];
for (const file of files) {
  const txt = readFileSync(file, 'utf8');
  if (MARKER.test(txt)) offenders.push(file);
}

if (offenders.length) {
  console.error('Merge markers found in:');
  for (const f of offenders) console.error(` - ${f}`);
  process.exit(1);
}

console.log(`Checked ${files.length} files: no merge markers found.`);
