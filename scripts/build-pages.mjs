import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { buildPlan } from './build-plan.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = process.argv.includes('--local-fixture');
const plan = buildPlan(root, process.env, { fixture });
// Validate inputs before installation. Paths are computed from this checkout.
for (const name of ['apps/sessao/package-lock.json', 'apps/shell/package-lock.json', 'build-inputs/amrigs/manifest.json'])
  await access(path.join(root, name));
function run(args, relative) {
  const result = spawnSync(process.execPath, args, { cwd: path.join(root, relative), env: plan.env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Build command failed: ' + args[0]);
}
for (const dir of plan.installs) {
  if (!process.env.npm_execpath) throw new Error('Use npm run build:pages');
  run([process.env.npm_execpath, 'ci', '--include=dev', '--no-audit', '--no-fund'], dir);
}
run(['node_modules/typescript/bin/tsc', '-b'], 'apps/sessao');
run(['node_modules/vite/bin/vite.js', 'build', '--outDir', 'dist-pages'], 'apps/sessao');
run(['build-pages.mjs'], 'apps/shell');
console.log(fixture ? 'Local fixture build; not ready for production login.' : 'Integrated Git build completed.');
