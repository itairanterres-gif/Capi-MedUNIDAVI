import { useState } from 'react'
import { Btn, Card, ErrorBanner, PageHeader } from '../../ui/kit'
import { useAuth } from './AuthContext'

// Troca obrigatória da senha inicial. Bloqueia o app inteiro: os guards de
// rota chamam esta tela enquanto `senhaDefinida` for false.
//
// Por que é obrigatória: a senha inicial é gerada pela importação e trafega
// fora do app (numa lista que a coordenação distribui). Enquanto ela valer,
// quem tiver a lista pode entrar como o aluno e responder no lugar dele — o
// que não estraga nota (a atividade é formativa), mas contamina o dado
// diagnóstico que justifica a ferramenta existir.
const MINIMO = 8

export function TrocarSenha({ motivo = 'primeiro-acesso' }: { motivo?: 'primeiro-acesso' | 'recuperacao' }) {
  const { identidade, trocarSenha, sair } = useAuth()
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    if (nova.length < MINIMO) return setErro(`A senha precisa ter pelo menos ${MINIMO} caracteres.`)
    if (nova !== confirma) return setErro('As duas senhas não são iguais.')
    setErro(null)
    setOcupado(true)
    try {
      await trocarSenha(nova)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível trocar a senha.')
      setOcupado(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <PageHeader
          title={motivo === 'recuperacao' ? 'Defina a sua nova senha' : 'Crie a sua senha'}
          subtitle={identidade?.nome ?? ''}
        />
        <Card className="p-6 flex flex-col gap-4">
          <p className="text-sm text-textSec leading-relaxed">
            {motivo === 'recuperacao'
              ? 'Você pediu para redefinir a senha e o link do e-mail já validou o seu acesso. Escolha uma senha nova para concluir.'
              : 'Este é o seu primeiro acesso. A senha que a coordenação entregou é provisória e precisa ser trocada agora — só você deve saber a sua senha.'}
          </p>
          <div>
            <label className="block text-sm font-semibold text-textSec mb-2">Nova senha</label>
            <input
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              type="password"
              autoComplete="new-password"
              className="w-full rounded-lg border-2 border-border px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blueAcc"
            />
            <p className="text-xs text-textMuted mt-1">Pelo menos {MINIMO} caracteres.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-textSec mb-2">Repita a nova senha</label>
            <input
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && salvar()}
              type="password"
              autoComplete="new-password"
              className="w-full rounded-lg border-2 border-border px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blueAcc"
            />
          </div>
          {erro && <ErrorBanner message={erro} />}
          <Btn onClick={salvar} disabled={ocupado} className="w-full text-lg py-4">
            {ocupado ? 'Salvando…' : 'Salvar e entrar'}
          </Btn>
          <button className="text-sm text-textMuted underline" onClick={() => sair()}>
            Sair
          </button>
        </Card>
      </div>
    </div>
  )
}
