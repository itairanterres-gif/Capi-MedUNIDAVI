import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Btn, Card, ErrorBanner, PageHeader } from '../../ui/kit'
import { enqueteClient } from '../../lib/enqueteClient'
import { useAuth } from '../auth/AuthContext'

// Igual a AlunoEntrar, com uma diferença: aceita ?c=CODIGO na URL (o que o
// QR da projeção codifica), pré-preenchendo o campo — quem escaneia só
// confere e toca "Entrar", sem digitar nada. Preenche mas não envia
// sozinho: entrar é uma ação intencional do participante, não algo que uma
// leitura de câmera deve disparar sem confirmação.
export function EnqueteEntrar() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { identidade } = useAuth()

  const [codigo, setCodigo] = useState(() => (params.get('c') ?? '').toUpperCase().slice(0, 6))
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  useEffect(() => {
    const c = params.get('c')
    if (c) setCodigo(c.toUpperCase().slice(0, 6))
  }, [params])

  async function entrar() {
    if (codigo.trim().length < 6) return setErro('Digite o código de 6 caracteres da enquete.')
    if (!identidade) return setErro('Sessão de login expirada — entre novamente.')

    setErro(null)
    setEntrando(true)
    try {
      const { enqueteId } = await enqueteClient.entrarEnquete(codigo, identidade.id)
      navigate(`/enquete/${enqueteId}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao entrar')
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <PageHeader title="Entrar na enquete" subtitle="Digite o código mostrado na projeção, ou escaneie o QR" />
        <Card className="p-5 flex flex-col gap-5">
          {identidade && (
            <p className="text-sm text-textSec">
              Entrando como <strong>{identidade.nome}</strong>.
            </p>
          )}

          <div>
            <label className="block text-sm font-semibold text-textSec mb-2">Código da enquete</label>
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

          <Btn variant="terra" onClick={entrar} disabled={entrando} className="w-full text-lg py-4">
            {entrando ? 'Entrando…' : 'Entrar'}
          </Btn>
        </Card>
      </div>
    </div>
  )
}
