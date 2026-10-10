import { canonicalURL } from './auth-contract.mjs';

export function pagesHeaders(url) {
  if (url !== canonicalURL) throw new Error('Canonical Supabase required');
  return `/*
  Cache-Control: no-store
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  X-Robots-Tag: noindex, nofollow
  ! Access-Control-Allow-Origin
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ${url} ${url.replace('https:', 'wss:')}; frame-ancestors 'none'; form-action 'self'; base-uri 'none'
`;
}

// SAM: mesma política do Capi, mais as fontes do Google (IBM Plex Sans) e as
// figuras dos trabalhos no Storage do Supabase. Scripts continuam só 'self'.
export function samCSP(url) {
  return `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: ${url}; connect-src 'self' ${url} ${url.replace('https:', 'wss:')}; frame-ancestors 'self'; form-action 'self'; base-uri 'none'`;
}
export function samPagesHeaders(url) {
  if (url !== canonicalURL) throw new Error('Canonical Supabase required');
  return `/sam/*
  ! Content-Security-Policy
  Content-Security-Policy: ${samCSP(url)}
  ! X-Frame-Options
  X-Frame-Options: SAMEORIGIN
`;
}
export const samRedirects = '/sam /sam/ 302\n';

// HashRouter uses fragment URLs. No wildcard rewrite is needed; missing assets
// must be a real 404 instead of HTML, and paths outside this slice stay closed.
export const pagesRedirects = `# Static directories; keep query strings and browser fragments.
/entrar /entrar/ 302
/sobre /sobre/ 302
/amrigs /amrigs/ 302
/questoes /questoes/ 302
`;

export const notFoundHTML = '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Página não encontrada</title><h1>Página não encontrada</h1><a href="/">Voltar ao início</a></html>\n';
