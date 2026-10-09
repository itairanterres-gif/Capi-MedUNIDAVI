// Regras da porta única do Capi (/entrar): sem acesso a rede, para testar.
// A autorização real continua no banco: o gancho de cadastro/Google só aceita
// e-mails com matrícula ou docentes autorizados (rpc_status_matricula,
// professores_autorizados), e as políticas RLS decidem o que cada um vê.
export const DOMINIO = '@unidavi.edu.br';
export const SENHA_MINIMA = 8;

export function institutionalEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@unidavi\.edu\.br$/.test(email) ? email : null;
}

// Entrar, recuperar senha e reenviar confirmação aceitam contas já existentes
// de qualquer domínio (há contas antigas fora de @unidavi.edu.br); quem decide
// o acesso é o banco. Só o autocadastro exige o e-mail institucional.
export function anyEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function passwordProblem(senha, confirmacao) {
  const s = String(senha || '');
  if (s.length < SENHA_MINIMA) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (s.length > 128) return 'A senha pode ter no máximo 128 caracteres.';
  if (confirmacao !== undefined && s !== String(confirmacao)) return 'As duas senhas não são iguais.';
  return null;
}

// Resposta de rpc_status_matricula → mensagem (null = pode criar a conta).
export function enrollmentMessage(status) {
  if (status === 'disponivel') return null;
  if (status === 'conta_existente') return 'Este e-mail já tem conta. Use "Entrar" ou "Esqueci minha senha". Se você criou a conta e não confirmou o e-mail, reenvie a confirmação.';
  if (status === 'nao_encontrada') return 'Não encontramos este e-mail na matrícula atual. Se você é aluno(a) matriculado(a) ou docente, procure a coordenação.';
  return 'Não foi possível verificar a matrícula agora. Tente de novo em instantes.';
}

// Erro do signInWithPassword → mensagem e se vale oferecer reenvio da confirmação.
export function loginErrorMessage(error) {
  const msg = String(error?.message || '').toLowerCase();
  if (msg.includes('email not confirmed')) return { message: 'Sua conta existe, mas o e-mail ainda não foi confirmado. Abra o link que enviamos ou reenvie a confirmação.', resend: true };
  if (msg.includes('invalid')) return { message: 'E-mail ou senha incorretos. Se esqueceu a senha, use "Esqueci minha senha".', resend: false };
  return { message: 'Não foi possível entrar agora. Tente de novo em instantes.', resend: false };
}

// Para onde o Supabase devolve depois de Google, confirmação de e-mail ou
// recuperação de senha. Precisa estar em Authentication → Redirect URLs.
export function returnURL(origin) { return origin + '/entrar/'; }
