// Atividades oferecidas depois do login, por papel. Apenas navegação: quem
// pode ver ou gravar cada dado continua decidido no servidor (RLS) e nas
// guardas de cada módulo.
export function activitiesFor(role, { amrigs = false, sam = false } = {}) {
  const lista = [];
  if (role === 'aluno' || role === 'egresso') {
    if (amrigs) lista.push({ label: 'Treino AMRIGS', href: '/amrigs/', hint: 'Questões das provas AMRIGS com correção comentada e caderno de erros.' });
  }
  if (role === 'aluno') {
    lista.push({ label: 'Sessão de Questões', href: '/questoes/#/aluno', hint: 'Entre com o código da sessão de sala.' });
    lista.push({ label: 'Capi-Cards', href: '/questoes/#/cards', hint: 'Revisão espaçada dos seus cards.' });
  }
  if (sam && role === 'aluno') {
    lista.push({ label: 'Semana Acadêmica (SAM)', href: '/sam/submissao.html', hint: 'Preencha e acompanhe o seu trabalho da SAM.' });
  }
  if (role === 'professor' || role === 'admin') {
    lista.push({ label: 'Conduzir sessão de questões', href: '/questoes/#/professor', hint: 'Montar, abrir e conduzir sessões em sala.' });
    lista.push({ label: 'Importar questões', href: '/questoes/#/importacao', hint: 'Trazer questões para o banco da Sessão.' });
  }
  if (sam && (role === 'professor' || role === 'admin')) {
    // A curadoria confere no banco quem é curador; os demais docentes veem o site público.
    lista.push({ label: 'Semana Acadêmica (SAM)', href: '/sam/curadoria.html', hint: 'Curadoria dos trabalhos da SAM.' });
  }
  if (role === 'admin') {
    lista.push({ label: 'Coordenação', href: '/questoes/#/coordenacao', hint: 'Pessoas, turmas e acompanhamento.' });
  }
  return lista;
}
