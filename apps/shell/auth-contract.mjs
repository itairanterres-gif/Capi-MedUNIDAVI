export const canonicalURL = 'https://ggjxbumtnizaeomioves.supabase.co';
export const storageKey = 'sb-ggjxbumtnizaeomioves-auth-token';
const roles = Object.freeze({ aluno: 'Estudante', professor: 'Docente', admin: 'Administrador da Sessão de Questões' });

// Presentation only. Data authorization stays in the module's RLS/RPCs.
export async function resolveIdentity(client) {
  const { data: cached, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw new Error('SESSION_UNAVAILABLE');
  if (!cached.session) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('SESSION_REJECTED');
  const { data: profile, error: profileError } = await client.from('profiles')
    .select('id,nome,role,senha_definida').eq('id', data.user.id).single();
  if (profileError || !profile || profile.id !== data.user.id || !Object.hasOwn(roles, profile.role))
    throw new Error('PROFILE_UNAVAILABLE');
  return { subject: profile.id, name: profile.nome || 'Sua conta', role: profile.role,
    label: roles[profile.role], perspective: profile.role === 'aluno' ? 'estudante' : profile.role === 'professor' ? 'docente' : null };
}
