import { escapeHTML } from '../../packages/public-about/index.mjs';

// Destination established in this task; no credentials or identity context are appended.
export const sessionModule = Object.freeze({
  name: 'Sessão de Questões',
  url: 'https://sessao-questoes-unidavi.vercel.app/',
});
// Existing standalone origin recovered from Treino/docs/ENAMED2026-DESEMPENHO-GOOGLE.md.
export const trainingModules = Object.freeze([
  {name:'Treino ENAMED',url:'https://treino-enamed.onrender.com/#/enamed'},
  {name:'Treino AMRIGS',url:'https://treino-enamed.onrender.com/#/amrigs'},
]);
export function trainingLinks(amrigsPilot=false, hosted=false){
  if (hosted) return '<section class="start-experience" aria-labelledby="training-title"><h2 id="training-title">Treino AMRIGS</h2><a class="module-link" href="/amrigs/">Abrir AMRIGS com o login do Capi</a><p class="access-note">Use sua conta institucional autorizada. Seu histórico anterior continua no Treino legado.</p></section>';
  const pilot=amrigsPilot?'<a class="module-link" href="/amrigs/">Abrir AMRIGS com o login do Capi · piloto local →</a><p class="access-note">Este piloto contém apenas dados sintéticos. O histórico do Treino continua no sistema legado.</p>':'';
  return `<section class="start-experience" aria-labelledby="training-title"><h2 id="training-title">Treino ENAMED e AMRIGS</h2><p>Continue sua prática com a conta que você já usa no Treino.</p>${pilot}${trainingModules.map(module=>`<a class="module-link" href="${escapeHTML(module.url)}" rel="noreferrer">Abrir ${escapeHTML(module.name)}</a>`).join('')}<p class="access-note">Cada atividade conserva seu histórico. O acesso acontece no Treino.</p></section>`;
}
export function navigation(active) {
  return `<nav class="shell-nav" aria-label="Navegação principal"><a href="/"${active === 'home' ? ' aria-current="page"' : ''}>Início</a><a href="/sobre"${active === 'about' ? ' aria-current="page"' : ''}>Sobre o Capi MedUNIDAVI</a></nav>`;
}
export function moduleLink() {
  return `<a class="module-link" href="${escapeHTML(sessionModule.url)}" rel="noreferrer">Abrir ${escapeHTML(sessionModule.name)} <span aria-hidden="true">→</span></a>`;
}
