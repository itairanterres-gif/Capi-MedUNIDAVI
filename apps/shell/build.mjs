import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const absWorkingDir = fileURLToPath(new URL('.', import.meta.url));
for (const [entryPoint, outfile] of [['./auth-browser.mjs', './dist/auth.js'], ['./amrigs-browser.mjs', './dist/amrigs.js']]) {
  await build({ absWorkingDir, entryPoints: [entryPoint], bundle: true, format: 'esm', platform: 'browser', outfile, minify: true, sourcemap: false });
}
