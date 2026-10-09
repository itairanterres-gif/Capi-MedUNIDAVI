import test from 'node:test';
import assert from 'node:assert/strict';
import { createShell } from '../server.mjs';
import { loginDestination, safeDestination } from '../login-destination.mjs';

async function withShell(amrigsPilot, action) {
  const integration = { root: '.', url: 'http://127.0.0.1:28478', key: 'sb_publishable_synthetic',
    storageKey: 'sb-capi-local-auth-token', amrigsPilot };
  const server = createShell({ integration });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await action(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('AMRIGS route exists only for the explicit local pilot and never forwards credentials', async () => {
  await withShell(false, async base => {
    assert.equal((await fetch(base + '/amrigs/')).status, 404);
    assert.ok(!(await (await fetch(base)).text()).includes('href="/amrigs/"'));
  });
  await withShell(true, async base => {
    const home = await (await fetch(base)).text();
    assert.ok(home.includes('href="/amrigs/"'));
    assert.ok(home.includes('https://treino-enamed.onrender.com/#/amrigs'));
    const response = await fetch(base + '/amrigs/?access_token=synthetic');
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes('Treino AMRIGS'));
    assert.ok(!html.includes('synthetic'));
    assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal((await fetch(base + '/auth-config.json').then(r => r.json())).amrigsPilot, true);
  });
  assert.equal(safeDestination('/amrigs/'), '/amrigs/');
  assert.equal(safeDestination('/amrigs/?token=synthetic'), null);
  const storage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  assert.equal(loginDestination('?next=%2Famrigs%2F', storage), '/amrigs/');
});
