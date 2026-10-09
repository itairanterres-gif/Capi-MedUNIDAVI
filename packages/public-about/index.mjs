import { readFileSync } from 'node:fs';

// One editorial source serves the preview and the reviewable Markdown.
export const content = JSON.parse(readFileSync(new URL('../../docs/product/about-content.json', import.meta.url), 'utf8'));
export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
export function selectPerspective(requested, contextual) {
  const candidate = requested === null ? contextual : requested;
  return Object.hasOwn(content.roles, candidate ?? '') ? candidate : null;
}
const paragraphs = values => (values ?? []).map(text => `<p>${escapeHTML(text)}</p>`).join('\n');
const portrait = '<img class="capi-portrait" src="/capi-portrait.webp" width="256" height="256" alt="Capi, professor médico capivara, de óculos e jaleco branco." decoding="async">';
function section(value, showPortrait = false) {
  const credits = value.credits ? `<dl class="credits">${value.credits.map(credit => `<dt>${escapeHTML(credit.role)}</dt><dd>${escapeHTML(credit.name)}${credit.detail ? `<br><span>${escapeHTML(credit.detail)}</span>` : ''}</dd>`).join('')}</dl>` : '';
  return `<section id="${escapeHTML(value.id)}">${showPortrait ? portrait : ''}<h2>${escapeHTML(value.title)}</h2>${paragraphs(value.paragraphs)}${credits}</section>`;
}
export function homeIntro() {
  return `<aside class="product-intro" aria-label="Sobre este ambiente"><p><strong>${escapeHTML(content.home.tagline)}</strong> ${escapeHTML(content.home.description)}</p><a href="/sobre">${escapeHTML(content.home.link)}</a></aside>`;
}
export function renderAbout(perspective, { navigation = '', stageLabel = 'Em desenvolvimento' } = {}) {
  const role = Object.hasOwn(content.roles, perspective ?? '') ? content.roles[perspective] : null;
  const links = Object.entries(content.roles).map(([key, value]) => `<a href="/sobre?papel=${key}"${key === perspective ? ' aria-current="page"' : ''}>${escapeHTML(value.label)}</a>`).join('');
  const roleSection = role ? `<section id="papel" class="role-reading">${portrait}<p class="eyebrow">${escapeHTML(role.label)}</p><h2>${escapeHTML(role.title)}</h2>${paragraphs(role.paragraphs)}<p class="principle">${escapeHTML(role.principle)}</p><p>${escapeHTML(role.limits)}</p></section>` : '';
  const sections = [content.common[0], ...(role ? [{ id: 'papel', title: role.title }] : []), ...content.common.slice(1), ...content.shared];
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHTML(content.title)}${role ? ' · ' + escapeHTML(role.label) : ''}</title><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/identity.css"></head>
<body><a class="skip-link" href="#conteudo">Ir ao conteúdo</a>
<header><a class="brand" href="/">Capi Med<span>UNIDAVI</span></a><span class="stage">${escapeHTML(stageLabel)}</span></header>${navigation}
<main class="about-page" id="conteudo"><a class="back-link" href="/">← Voltar ao ambiente</a><p class="eyebrow">IDENTIDADE E ORIENTAÇÃO</p><h1>${escapeHTML(content.title)}</h1>
<p class="lead">Uma identidade comum. Diferentes formas de apoiar a formação.</p>
<nav class="perspectives" aria-label="Ler na perspectiva de"><p>Ler na perspectiva de</p><div><a href="/sobre?papel=geral"${!role ? ' aria-current="page"' : ''}>Visão geral</a>${links}</div></nav>
<p class="perspective-note">${role ? 'Você está lendo a perspectiva de ' + escapeHTML(role.label).toLowerCase() + '. ' : 'Escolha uma perspectiva para conhecer o papel de Capi no seu contexto. '}Esta escolha muda apenas a apresentação do texto, sem alterar seus acessos.</p>
<div class="about-layout"><nav class="about-index" aria-label="Nesta página"><p>Nesta página</p>${sections.map(item => `<a href="#${escapeHTML(item.id)}">${escapeHTML(item.title)}</a>`).join('')}</nav>
<article>${section(content.common[0])}${roleSection}${content.common.slice(1).map(value => section(value, !role && value.id === 'origem')).join('')}${content.shared.map(value => section(value)).join('')}<p class="back-top"><a href="#conteudo">Voltar ao início ↑</a></p></article></div></main>
<footer>Capi MedUNIDAVI · Ambiente educacional em desenvolvimento · <a href="/">Voltar ao ambiente</a></footer></body></html>`;
}

function markdownSection(value) {
  return `## ${value.title}\n\n${(value.paragraphs ?? []).join('\n\n')}${value.credits ? value.credits.map(credit => `**${credit.role}**\n\n${credit.name}${credit.detail ? '\n\n' + credit.detail : ''}`).join('\n\n') : ''}\n\n`;
}
export function renderEditorialMarkdown() {
  const home = `# Apresentação pública do Capi MedUNIDAVI\n\nTexto gerado de [about-content.json](about-content.json). Atualizar a fonte estruturada e executar \`node prototypes/identity-about/export-content.mjs\`.\n\n## Apresentação curta da Home\n\n**${content.home.name}**\n\n${content.home.tagline}\n\n${content.home.description}\n\n${content.home.link}\n\n`;
  return (home + Object.values(content.roles).map(role => `# Sobre o Capi MedUNIDAVI — ${role.label}\n\n` + markdownSection(content.common[0]) + `## ${role.title}\n\n${role.paragraphs.join('\n\n')}\n\n**${role.principle}**\n\n${role.limits}\n\n` + content.common.slice(1).map(markdownSection).join('') + content.shared.map(markdownSection).join('')).join('---\n\n')).trimEnd() + '\n';
}
