// Explicit public assets only. Editorial files and historical contracts are never served.
export const publicAssets = new Map([
  ['/style.css', { file: new URL('./public/style.css', import.meta.url), type: 'text/css; charset=utf-8' }],
  ['/identity.css', { file: new URL('./public/identity.css', import.meta.url), type: 'text/css; charset=utf-8' }],
  ['/capi-portrait.webp', { file: new URL('./public/capi-portrait.webp', import.meta.url), type: 'image/webp' }],
]);
