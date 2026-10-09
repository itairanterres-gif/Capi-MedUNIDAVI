import { createClient } from '@supabase/supabase-js';
import { canonicalURL, storageKey, resolveIdentity } from './auth-contract.mjs';

import {loginDestination,clearDestination} from './login-destination.mjs';
import { activitiesFor } from './activities.mjs';
let destination=loginDestination(location.search,sessionStorage);
const message = document.querySelector('#auth-message');
const form = document.querySelector('#login-form');
const account = document.querySelector('#account');
const launch = document.querySelector('#launch-module');
launch.href=destination;
const logout = document.querySelector('#logout');
let client;
let generation = 0;
let recovery = false;
let amrigsOn = false;
const activities = document.querySelector('#activities');
// Lista de atividades por papel, montada com DOM (sem HTML injetado).
function renderActivities(identity) {
  activities.replaceChildren();
  const lista = identity ? activitiesFor(identity.role, { amrigs: amrigsOn }) : [];
  for (const item of lista) {
    const a = document.createElement('a'); a.href = item.href; a.className = 'activity';
    const t = document.createElement('strong'); t.textContent = item.label;
    const h = document.createElement('span'); h.textContent = item.hint;
    a.append(t, h); activities.append(a);
  }
  activities.hidden = lista.length === 0;
}
function show(text) { message.textContent = text; }
async function refresh() {
  const turn = ++generation;
  launch.hidden = true;
  try {
    const identity = await resolveIdentity(client);
    if (turn !== generation) return;
    form.hidden = !!identity;
    logout.hidden = !identity;
    account.textContent = identity ? `${identity.name} · ${identity.label}` : '';
    renderActivities(identity);
    // Sem destino específico, a lista por papel substitui o salto direto à Sessão.
    launch.hidden = !identity || (destination === '/questoes/' && !activities.hidden);
    show(identity ? 'Sua conta está conectada. Você pode abrir suas atividades.' : 'Entre com sua conta já existente.');
    document.querySelector('#account-about').href = identity?.perspective ? '/sobre?papel=' + identity.perspective : '/sobre';
    if (recovery && identity) window.location.replace('/questoes/?capi_recovery=1');
  } catch {
    if (turn !== generation) return;
    account.textContent = '';
    renderActivities(null);
    form.hidden = true;
    logout.hidden = false;
    show('Não foi possível validar sua conta e seu acesso. Tente novamente ou saia para entrar de novo.');
  }
}
async function busy(action) {
  const buttons = [...document.querySelectorAll('button')];
  buttons.forEach(b => b.disabled = true);
  try { await action(); } catch { show('Não foi possível concluir. Confira seus dados e tente novamente.'); }
  finally { document.querySelector('#password').value = ''; buttons.forEach(b => b.disabled = false); }
}
try {
  const response = await fetch('/auth-config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error();
  const config = await response.json();
  amrigsOn = !!config.amrigsPilot;
  const local = /^http:\/\/127\.0\.0\.1:\d+$/.test(config.url) && config.storageKey === 'sb-capi-local-auth-token';
  if (!local && (config.url !== canonicalURL || config.storageKey !== storageKey)) throw new Error();
  if (destination === '/amrigs/' && !config.amrigsPilot) destination = '/questoes/';
  launch.href = destination;
  launch.textContent = destination === '/amrigs/' ? 'Abrir Treino AMRIGS →' : 'Abrir Sessão de Questões →';
  document.querySelector('#google').hidden = !config.googleEnabled;
  document.querySelector('#google').nextElementSibling.textContent = config.googleEnabled ? 'ou entre com sua senha' : 'Entre com sua senha.';
  client = createClient(config.url, config.key, { auth: { flowType: 'pkce', storageKey: config.storageKey, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  client.auth.onAuthStateChange(event => {
    if (event === 'PASSWORD_RECOVERY') recovery = true;
    if (event === 'SIGNED_OUT') {
      clearDestination(sessionStorage);
      destination='/questoes/';
      launch.href=destination;
    }
    // Do not await another auth method while the SDK's auth lock is held.
    setTimeout(refresh, 0);
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    busy(async () => {
      const { error } = await client.auth.signInWithPassword({ email: document.querySelector('#email').value.trim().toLowerCase(), password: document.querySelector('#password').value });
      if (error) throw error;
      await refresh();
    });
  });
  document.querySelector('#google').addEventListener('click', () => busy(async () => {
    if (!config.googleEnabled) return;
    const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/entrar', queryParams: { prompt: 'select_account', hd: 'unidavi.edu.br' } } });
    if (error) throw error;
  }));
  logout.addEventListener('click', () => busy(async () => {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw error;
    recovery = false;
    clearDestination(sessionStorage);
    destination='/questoes/';
    launch.href=destination;
    await refresh();
  }));
  document.querySelector('#retry').addEventListener('click', () => busy(refresh));
  window.addEventListener('pageshow', () => refresh());
  window.addEventListener('focus', () => refresh());
  launch.addEventListener('click', event => {
    event.preventDefault();
    busy(async () => { if (await resolveIdentity(client)) location.assign(destination); else await refresh(); });
  });
  await refresh();
} catch {
  form.hidden = true;
  show('A entrada integrada não está disponível agora.');
}
