import { createClient } from '@supabase/supabase-js';
import { canonicalURL, storageKey, resolveIdentity } from './auth-contract.mjs';
import { loginDestination, clearDestination } from './login-destination.mjs';
import { activitiesFor } from './activities.mjs';
import { anyEmail, institutionalEmail, passwordProblem, enrollmentMessage, loginErrorMessage, returnURL } from './account-flow.mjs';

// Porta única do Capi: entrar (Google ou senha), criar conta, recuperar e
// definir senha. A autorização real fica no banco (matrícula, docentes
// autorizados, RLS); esta tela só conduz o fluxo.
let destination = loginDestination(location.search, sessionStorage);
const $ = selector => document.querySelector(selector);
const message = $('#auth-message');
const account = $('#account');
const launch = $('#launch-module');
const logout = $('#logout');
const activities = $('#activities');
const forms = { login: $('#login-form'), signup: $('#signup-form'), forgot: $('#forgot-form'), newpass: $('#newpass-form') };
launch.href = destination;
let client, config;
let generation = 0;
let recovery = false;
let amrigsOn = false;
let chosenView = 'login';

class UserError extends Error {}
function show(text) { message.textContent = text; }
function view(name) {
  for (const [key, form] of Object.entries(forms)) form.hidden = key !== name;
}
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
async function refresh() {
  const turn = ++generation;
  launch.hidden = true;
  try {
    const identity = await resolveIdentity(client);
    if (turn !== generation) return;
    logout.hidden = !identity;
    account.textContent = identity ? `${identity.name} · ${identity.label}` : '';
    $('#account-about').href = identity?.perspective ? '/sobre?papel=' + identity.perspective : '/sobre';
    // Link de recuperação ou senha inicial ainda não trocada: nada abre antes da senha nova.
    if (identity && (recovery || identity.senhaDefinida === false)) {
      renderActivities(null); view('newpass');
      $('#newpass-why').textContent = recovery ? 'Você abriu o link de recuperação. Escolha uma senha nova para continuar.'
        : 'Antes de continuar, troque a senha inicial por uma senha só sua.';
      show('Defina sua senha para continuar.');
      return;
    }
    if (identity) {
      view(null); renderActivities(identity);
      // Sem destino específico, a lista por papel substitui o salto direto à Sessão.
      launch.hidden = destination === '/questoes/' && !activities.hidden;
      show('Sua conta está conectada. Escolha uma atividade.');
      return;
    }
    renderActivities(null); view(chosenView);
    // Não apaga avisos das ações (ex.: "confira seu e-mail") a cada foco da janela.
    if (/^(Verificando|Sua conta está conectada|Defina sua senha|Não foi possível validar)/.test(message.textContent)) show('Entre com a sua conta.');
  } catch {
    if (turn !== generation) return;
    account.textContent = ''; renderActivities(null); view(null);
    logout.hidden = false;
    show('Não foi possível validar sua conta e seu acesso. Tente novamente ou saia para entrar de novo.');
  }
}
async function busy(action) {
  const buttons = [...document.querySelectorAll('button')];
  buttons.forEach(b => b.disabled = true);
  try { await action(); }
  catch (error) { show(error instanceof UserError ? error.message : 'Não foi possível concluir agora. Tente novamente em instantes.'); }
  finally {
    for (const id of ['#password', '#signup-password', '#signup-confirm', '#newpass', '#newpass-confirm']) $(id).value = '';
    buttons.forEach(b => b.disabled = false);
  }
}
function emailFrom(selector, { institucional = false } = {}) {
  const email = (institucional ? institutionalEmail : anyEmail)($(selector).value);
  if (!email) throw new UserError(institucional ? 'Use o seu e-mail institucional (@unidavi.edu.br).' : 'Confira o e-mail digitado.');
  return email;
}
function choose(name, text) { chosenView = name; view(name); show(text); $('#resend-wrap').hidden = true; }

try {
  const response = await fetch('/auth-config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error();
  config = await response.json();
  amrigsOn = !!config.amrigsPilot;
  const local = /^http:\/\/127\.0\.0\.1:\d+$/.test(config.url) && config.storageKey === 'sb-capi-local-auth-token';
  if (!local && (config.url !== canonicalURL || config.storageKey !== storageKey)) throw new Error();
  if (destination === '/amrigs/' && !config.amrigsPilot) destination = '/questoes/';
  launch.href = destination;
  launch.textContent = destination === '/amrigs/' ? 'Abrir Treino AMRIGS →' : 'Abrir Sessão de Questões →';
  $('#google').hidden = !config.googleEnabled;
  $('#google-sep').textContent = config.googleEnabled ? 'ou entre com e-mail e senha' : 'Entre com e-mail e senha.';
  client = createClient(config.url, config.key, { auth: { flowType: 'pkce', storageKey: config.storageKey, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  client.auth.onAuthStateChange(event => {
    if (event === 'PASSWORD_RECOVERY') recovery = true;
    if (event === 'SIGNED_OUT') { clearDestination(sessionStorage); destination = '/questoes/'; launch.href = destination; }
    // Do not await another auth method while the SDK's auth lock is held.
    setTimeout(refresh, 0);
  });

  forms.login.addEventListener('submit', event => {
    event.preventDefault();
    busy(async () => {
      const email = emailFrom('#email');
      const { error } = await client.auth.signInWithPassword({ email, password: $('#password').value });
      if (error) { const r = loginErrorMessage(error); $('#resend-wrap').hidden = !r.resend; throw new UserError(r.message); }
      await refresh();
    });
  });
  $('#google').addEventListener('click', () => busy(async () => {
    if (!config.googleEnabled) return;
    const { error } = await client.auth.signInWithOAuth({ provider: 'google',
      options: { redirectTo: returnURL(location.origin), queryParams: { prompt: 'select_account', hd: 'unidavi.edu.br' } } });
    if (error) throw new UserError('O login com Google não está disponível agora. Use e-mail e senha.');
  }));
  $('#show-signup').addEventListener('click', () => choose('signup', 'Crie a sua conta com o e-mail institucional.'));
  $('#show-forgot').addEventListener('click', () => choose('forgot', 'Informe o seu e-mail institucional.'));
  for (const back of document.querySelectorAll('button.back')) back.addEventListener('click', () => choose('login', 'Entre com a sua conta.'));

  forms.signup.addEventListener('submit', event => {
    event.preventDefault();
    busy(async () => {
      const email = emailFrom('#signup-email', { institucional: true });
      const problem = passwordProblem($('#signup-password').value, $('#signup-confirm').value);
      if (problem) throw new UserError(problem);
      const { data: status, error: rpcError } = await client.rpc('rpc_status_matricula', { p_email: email });
      if (rpcError) throw new UserError(enrollmentMessage(null));
      const blocked = enrollmentMessage(status);
      if (blocked) { $('#email').value = email; throw new UserError(blocked); }
      const { data, error } = await client.auth.signUp({ email, password: $('#signup-password').value,
        options: { data: { autocadastro: true }, emailRedirectTo: returnURL(location.origin) } });
      if (error) throw new UserError(/registered|já/i.test(error.message) ? enrollmentMessage('conta_existente') : 'Não foi possível criar a conta agora. Tente de novo em instantes.');
      if (data.session) { chosenView = 'login'; await refresh(); return; }
      $('#email').value = email; chosenView = 'login'; view('login');
      show(`Conta criada. Enviamos um e-mail para ${email}: abra o link para confirmar e depois entre aqui com a sua senha.`);
    });
  });
  forms.forgot.addEventListener('submit', event => {
    event.preventDefault();
    busy(async () => {
      const email = emailFrom('#forgot-email');
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: returnURL(location.origin) });
      if (error) throw new UserError('Não foi possível enviar o link agora. Tente de novo em instantes.');
      chosenView = 'login'; view('login'); $('#email').value = email;
      show(`Se ${email} tiver conta, você receberá um link para definir uma senha nova. Abra-o neste mesmo navegador.`);
    });
  });
  $('#resend').addEventListener('click', () => busy(async () => {
    const email = emailFrom('#email');
    const { error } = await client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: returnURL(location.origin) } });
    if (error) throw new UserError(/already|confirmed/i.test(error.message) ? 'Este e-mail já está confirmado. Entre com a sua senha.' : 'Não foi possível reenviar agora.');
    $('#resend-wrap').hidden = true;
    show(`Reenviamos a confirmação para ${email}.`);
  }));
  forms.newpass.addEventListener('submit', event => {
    event.preventDefault();
    busy(async () => {
      const problem = passwordProblem($('#newpass').value, $('#newpass-confirm').value);
      if (problem) throw new UserError(problem);
      const { error } = await client.auth.updateUser({ password: $('#newpass').value });
      if (error) throw new UserError('Não foi possível salvar a senha. Abra de novo o link recebido por e-mail.');
      // Marca a senha como definida (mesma regra da Sessão de Questões).
      const { error: markError } = await client.rpc('rpc_confirmar_senha_definida');
      if (markError) throw new UserError('Senha salva, mas não conseguimos registrar a troca. Tente entrar de novo.');
      recovery = false;
      await refresh();
      show('Senha salva. Escolha uma atividade.');
    });
  });
  logout.addEventListener('click', () => busy(async () => {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw error;
    recovery = false; chosenView = 'login';
    clearDestination(sessionStorage);
    destination = '/questoes/'; launch.href = destination;
    await refresh();
  }));
  $('#retry').addEventListener('click', () => busy(refresh));
  window.addEventListener('pageshow', () => refresh());
  window.addEventListener('focus', () => refresh());
  launch.addEventListener('click', event => {
    event.preventDefault();
    busy(async () => { if (await resolveIdentity(client)) location.assign(destination); else await refresh(); });
  });
  await refresh();
} catch {
  view(null);
  show('A entrada integrada não está disponível agora.');
}
