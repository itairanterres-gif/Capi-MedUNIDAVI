import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { publicAssets } from '../../packages/public-about/assets.mjs';
import { selectPerspective } from '../../packages/public-about/index.mjs';
import { renderHome, renderShellAbout, renderLogin, renderAmrigsPilot } from './pages.mjs';
import { loadIntegration, moduleAsset, amrigsImage } from './integration.mjs';

const assets = new Map(publicAssets);
assets.set('/shell.css', { file: new URL('./public/shell.css', import.meta.url), type: 'text/css; charset=utf-8' });

// Audience remains editorial. Optional browser authentication uses hosted Auth
// directly; this server never receives credentials or authorizes module data.
export function createShell({ resolveAudience = async () => null, integration = null } = {}) {
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self'; connect-src 'none'; frame-ancestors 'none'; form-action 'none'; base-uri 'none'");
    const send = (status, body, type = 'text/html; charset=utf-8') => {
      res.writeHead(status, { 'Content-Type': type }); res.end(req.method === 'HEAD' ? undefined : body);
    };
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.setHeader('Allow', 'GET, HEAD'); send(405, 'Método não permitido.', 'text/plain; charset=utf-8'); return;
      }
      const url = new URL(req.url, 'http://localhost');
      if (integration && ((url.pathname === '/entrar' || url.pathname === '/entrar/') || url.pathname.startsWith('/questoes/') || integration.amrigsPilot && url.pathname.startsWith('/amrigs/'))) {
        res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ${integration.url} ${integration.url.replace('https:', 'wss:')}; frame-ancestors 'none'; form-action 'self'; base-uri 'none'`);
      }
      if (integration && (url.pathname === '/entrar' || url.pathname === '/entrar/')) { send(200, renderLogin()); return; }
      if (integration && url.pathname === '/auth-config.json') {
        send(200, JSON.stringify({ url: integration.url, key: integration.key, storageKey: integration.storageKey, googleEnabled: !!integration.googleEnabled, amrigsPilot: !!integration.amrigsPilot, privateImages: integration.privateImages }), 'application/json'); return;
      }
      if (integration && url.pathname === '/auth.js') { send(200, await readFile(new URL('./dist/auth.js', import.meta.url)), 'text/javascript; charset=utf-8'); return; }
      if (integration?.amrigsPilot && url.pathname === '/amrigs') { res.writeHead(302, { Location: '/amrigs/' }); res.end(); return; }
      if (integration?.amrigsPilot && url.pathname === '/amrigs/') { send(200, renderAmrigsPilot(integration.amrigsHosted)); return; }
      if (integration?.amrigsPilot && url.pathname === '/amrigs.js') { send(200, await readFile(new URL('./dist/amrigs.js', import.meta.url)), 'text/javascript; charset=utf-8'); return; }
      if (integration?.amrigsPilot && url.pathname.startsWith('/amrigs/')) {
        const image = await amrigsImage(integration.amrigsAssets, url.pathname);
        if (image) send(200, image, 'image/png'); else send(404, 'Figura não encontrada.', 'text/plain; charset=utf-8');
        return;
      }
      if (integration && url.pathname === '/questoes') { res.writeHead(302, { Location: '/questoes/' }); res.end(); return; }
      if (integration && url.pathname.startsWith('/questoes/')) {
        const asset = await moduleAsset(integration.root, url.pathname);
        if (asset) send(200, asset.body, asset.type); else send(404, 'Página não encontrada.');
        return;
      }
      if (assets.has(url.pathname)) {
        const asset = assets.get(url.pathname); send(200, await readFile(asset.file), asset.type); return;
      }
      if (url.pathname === '/') { send(200, renderHome(!!integration, !!integration?.amrigsPilot, !!integration?.amrigsHosted)); return; }
      if (url.pathname === '/sobre') {
        let audience = null;
        try { audience = await resolveAudience(req); } catch { /* Public reading stays available without context. */ }
        send(200, renderShellAbout(selectPerspective(url.searchParams.get('papel'), audience))); return;
      }
      send(404, '<!doctype html><html lang="pt-BR"><title>Página não encontrada</title><h1>Página não encontrada</h1><a href="/">Voltar ao início</a></html>');
    } catch {
      send(500, 'Não foi possível carregar esta página.', 'text/plain; charset=utf-8');
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const integration = await loadIntegration();
  const port = Number(process.env.PORT || 43130);
  createShell({ integration }).listen(port, '127.0.0.1', () => console.log(`Capi MedUNIDAVI: http://127.0.0.1:${port}`));
}
