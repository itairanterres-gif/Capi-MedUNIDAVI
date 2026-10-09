// Capi integrado LOCAL: login Capi/Sessão + Sessão (/questoes/) + AMRIGS (/amrigs/)
// + SAM (/sam/), todos na mesma origem e contra a stack Supabase de loopback.
//   node scripts/local-integrado.mjs [porta]
// Lê URL e chave pública da stack local na hora; nada é gravado em arquivo.
// O SAM é pré-compilado antes (apps/sam/dist), como na publicação.
import { execFileSync, spawn } from 'node:child_process';
import { buildSam } from '../apps/sam/build.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOMOL = 'C:/Users/Itair/Documents/Codex/2026-10-02/task/integration-local/homologacao-local';
const porta = process.argv[2] || '43142';

const saida = execFileSync(path.join(HOMOL, 'node_modules/.bin/supabase.cmd'), ['stack', 'status', '--output-format', 'json'],
  { cwd: path.join(HOMOL, 'stacks/sessao'), encoding: 'utf8', shell: true });
const stack = JSON.parse(saida.slice(saida.indexOf('{'))).env;
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(stack.API_URL)) throw new Error('Somente stack de loopback');

const env = {
  ...process.env,
  PORT: porta,
  CAPI_SHARED_LOGIN: '1',
  CAPI_LOCAL_SUPABASE_URL: stack.API_URL,
  CAPI_SUPABASE_PUBLISHABLE_KEY: stack.PUBLISHABLE_KEY,
  CAPI_QUESTOES_DIST: path.join(HOMOL, 'apps/sessao/sessao-questoes/dist'),
  CAPI_AMRIGS_PILOT: '1',
  CAPI_SAM_ENABLED: '1',
  CAPI_SAM_EDICAO: 'xii',
};
await buildSam();
console.log(`Capi integrado local: http://127.0.0.1:${porta}  (Sessão /questoes/, AMRIGS /amrigs/, SAM /sam/)`);
spawn(process.execPath, [path.join(raiz, 'apps/shell/server.mjs')], { env, stdio: 'inherit' });
