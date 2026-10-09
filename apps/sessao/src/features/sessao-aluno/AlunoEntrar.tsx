import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Btn, Card, ErrorBanner, PageHeader } from '../../ui/kit'
import { client } from '../../lib/client'
import { alunoDemo } from '../../lib/identity'
import { useAuth } from '../auth/AuthContext'

const PERSONAS_DEMO = [1, 2, 3, 4]

export function AlunoEntrar() {
  const navigate = useNavigate()
  const { identidade, modo, entrarComoDemo } = useAuth()
  const ehDemo = modo === 'demo'

  const [personaEscolhida, setPersonaEscolhida] = useState(
    identidade?.role === 'aluno' ? identidade.id : ''
  )
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  async function entrar() {
    if (codigo.trim().length < 6) return setErro('Digite o código de 6 caracteres da sessão.')

    // Modo demo: a persona é escolhida aqui (uma aba = um aluno). Modo
    // produção: a identidade já veio do login por magic link.
    let alunoId: string
    if (ehDemo) {
      if (!personaEscolhida) return setErro('Escolha quem você é (modo demo).')
      const identidadeDemo = alunoDemo(Number(personaEscolhida.replace('aluno_', '')))
      entrarComoDemo(identidadeDemo)
      alunoId = identidadeDemo.id
    } else {
      if (!identidade) return setErro('Sessão de login expirada — entre novamente.')
      alunoId = identidade.id
    }

    setErro(null)
    setEntrando(true)
    try {
      const { sessaoId } = await client.entrarSessao(codigo, alunoId)
      navigate(`/aluno/${sessaoId}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao entrar')
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <PageHeader title="Entrar na sessão" subtitle="Digite o código mostrado na projeção" />
        <Card className="p-5 flex flex-col gap-5">
          {ehDemo ? (
            <div>
              <label className="block text-sm font-semibold text-textSec mb-2">
                Você é (modo demo — abra uma aba por aluno)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PERSONAS_DEMO.map((n) => {
                  const id = `aluno_${n}`
                  const ativo = personaEscolhida === id
                  return (
                    <button
                      key={id}
                      onClick={() => setPersonaEscolhida(id)}
                      className={`rounded-lg border-2 py-3 text-sm font-bold min-h-[44px] ${
                        ativo ? 'border-blue bg-blueLight text-blue' : 'border-border text-textSec'
                      }`}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            identidade && (
              <p className="text-sm text-textSec">
                Entrando como <strong>{identidade.nome}</strong>.
              </p>
            )
          )}

          <div>
            <label className="block text-sm font-semibold text-textSec mb-2">Código da sessão</label>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              inputMode="text"
              autoCapitalize="characters"
              className="w-full text-center text-3xl font-mono font-black tracking-[0.3em] uppercase rounded-lg border-2 border-border px-3 py-4 focus:outline-none focus:ring-2 focus:ring-blueAcc"
            />
          </div>

          {erro && <ErrorBanner message={erro} />}

          <Btn onClick={entrar} disabled={entrando} className="w-full text-lg py-4">
            {entrando ? 'Entrando…' : 'Entrar'}
          </Btn>
        </Card>
      </div>
    </div>
  )
}
