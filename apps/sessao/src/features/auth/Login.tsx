import { useState } from 'react'
import { Btn, Card, ErrorBanner, PageHeader } from '../../ui/kit'
import { useAuth } from './AuthContext'
import { emailInstitucionalValido } from '../../lib/supabaseAuth'

// Alunos: Google institucional é o caminho preferencial. E-mail + senha fica
// como alternativa e para contas já existentes. Docentes mantêm link mágico.
type Aba = 'aluno' | 'docente'

const SENHA_MINIMA = 8

export function Login() {
  const {
    entrarComGoogle,
    enviarMagicLink,
    entrarComSenha,
    enviarRecuperacaoSenha,
    statusMatricula,
    reenviarConfirmacao,
    autocadastrar,
  } = useAuth()
  const [aba, setAba] = useState<Aba>('aluno')
  const [modoAluno, setModoAluno] = useState<'entrar' | 'cadastrar'>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [senhaConfirma, setSenhaConfirma] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [cadastroEnviado, setCadastroEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).has('error') || new URLSearchParams(window.location.hash.slice(1)).has('error')
      ? 'O login externo não foi concluído. Tente novamente ou use e-mail e senha.' : null
  )
  const [recuperado, setRecuperado] = useState(false)
  const [contaExistente, setContaExistente] = useState(false)
  const [confirmacaoReenviada, setConfirmacaoReenviada] = useState(false)

  function limparEstadoCadastro() {
    setErro(null)
    setContaExistente(false)
    setConfirmacaoReenviada(false)
  }

  async function entrarGoogle() {
    setErro(null)
    setOcupado(true)
    try {
      await entrarComGoogle()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível entrar com Google.')
      setOcupado(false)
    }
  }

  async function entrar() {
    const e = email.trim().toLowerCase()
    if (!emailInstitucionalValido(e)) {
      return setErro('Use o seu e-mail institucional (@unidavi.edu.br).')
    }
    if (!senha) return setErro('Informe a senha.')
    setErro(null)
    setOcupado(true)
    try {
      await entrarComSenha(e, senha)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setOcupado(false)
    }
  }

  async function cadastrar() {
    const e = email.trim().toLowerCase()
    if (!emailInstitucionalValido(e)) {
      return setErro('Use o seu e-mail institucional (@unidavi.edu.br).')
    }
    if (senha.length < SENHA_MINIMA) {
      return setErro(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`)
    }
    if (senha !== senhaConfirma) {
      return setErro('As duas senhas não são iguais.')
    }
    limparEstadoCadastro()
    setOcupado(true)
    try {
      const status = await statusMatricula(e)
      if (status === 'nao_encontrada') {
        setErro(
          'Não encontramos este e-mail institucional na lista atual de alunos. Se você está matriculado(a), procure a coordenação.'
        )
        return
      }
      if (status === 'conta_existente') {
        setContaExistente(true)
        setErro(
          'Este e-mail já tem uma conta. Entre com Google institucional ou volte para “Já tenho conta”. Se você criou a conta e não confirmou o e-mail, pode reenviar a confirmação abaixo.'
        )
        return
      }
      await autocadastrar(e, senha)
      setCadastroEnviado(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível criar a conta.')
    } finally {
      setOcupado(false)
    }
  }

  async function reenviarConfirmacaoCadastro() {
    const e = email.trim().toLowerCase()
    if (!emailInstitucionalValido(e)) {
      return setErro('Use o seu e-mail institucional (@unidavi.edu.br).')
    }
    setErro(null)
    setOcupado(true)
    try {
      await reenviarConfirmacao(e)
      setConfirmacaoReenviada(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível reenviar a confirmação.')
    } finally {
      setOcupado(false)
    }
  }

  async function recuperar() {
    const e = email.trim().toLowerCase()
    if (!emailInstitucionalValido(e)) {
      return setErro('Digite o seu e-mail institucional acima e clique de novo.')
    }
    setErro(null)
    setOcupado(true)
    try {
      await enviarRecuperacaoSenha(e)
      setRecuperado(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar o e-mail.')
    } finally {
      setOcupado(false)
    }
  }

  async function enviarLink() {
    const e = email.trim().toLowerCase()
    if (!emailInstitucionalValido(e)) {
      return setErro('Use o seu e-mail institucional (@unidavi.edu.br).')
    }
    setErro(null)
    setOcupado(true)
    try {
      await enviarMagicLink(e)
      setEnviado(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar o link.')
    } finally {
      setOcupado(false)
    }
  }

  const campoEmail = (
    <div>
      <label className="block text-sm font-semibold text-textSec mb-2">E-mail institucional</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        inputMode="email"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="username"
        placeholder="nome@unidavi.edu.br"
        className="w-full rounded-lg border-2 border-border px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blueAcc"
      />
    </div>
  )

  const googleButton = (
    <Btn onClick={entrarGoogle} disabled={ocupado} variant="secondary" className="w-full text-base py-3">
      Entrar com Google institucional
    </Btn>
  )

  const separador = (
    <div className="flex items-center gap-3 text-xs text-textMuted">
      <div className="h-px bg-border flex-1" />
      <span>ou</span>
      <div className="h-px bg-border flex-1" />
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <PageHeader title="Sessão de Questões" subtitle="Curso de Medicina · UNIDAVI Rio do Sul" />

        <div className="flex gap-1 mb-4 border-b border-border">
          {(
            [
              ['aluno', 'Sou aluno'],
              ['docente', 'Sou docente'],
            ] as [Aba, string][]
          ).map(([id, rotulo]) => (
            <button
              key={id}
              onClick={() => {
                setAba(id)
                setErro(null)
                setEnviado(false)
                setModoAluno('entrar')
                setCadastroEnviado(false)
                setContaExistente(false)
                setConfirmacaoReenviada(false)
              }}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${
                aba === id ? 'border-blue text-blue' : 'border-transparent text-textSec'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {aba === 'aluno' && modoAluno === 'entrar' && (
          <Card className="p-6 flex flex-col gap-4">
            <p className="text-sm text-textSec leading-relaxed">
              Use de preferência a sua conta Google institucional da UNIDAVI. O acesso é liberado
              apenas para alunos da matrícula atual.
            </p>
            {googleButton}
            {separador}
            {campoEmail}
            <div>
              <label className="block text-sm font-semibold text-textSec mb-2">Senha</label>
              <input
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && entrar()}
                type="password"
                autoComplete="current-password"
                className="w-full rounded-lg border-2 border-border px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blueAcc"
              />
            </div>
            {erro && <ErrorBanner message={erro} />}
            <Btn onClick={entrar} disabled={ocupado} className="w-full text-lg py-4">
              {ocupado ? 'Entrando…' : 'Entrar com senha'}
            </Btn>
            {recuperado ? (
              <div className="rounded-lg bg-greenLight text-green text-sm px-4 py-3 leading-relaxed">
                Enviamos um link para <strong>{email.trim().toLowerCase()}</strong>. Abra o e-mail
                e clique nele: você volta para cá e escolhe a senha nova. O link pode demorar
                alguns minutos.
              </div>
            ) : (
              <button
                onClick={recuperar}
                disabled={ocupado}
                className="text-xs text-blue underline text-center disabled:opacity-40"
              >
                Esqueci minha senha
              </button>
            )}
            <button
              onClick={() => {
                setModoAluno('cadastrar')
                limparEstadoCadastro()
                setSenha('')
                setSenhaConfirma('')
              }}
              className="text-xs text-textMuted underline text-center"
            >
              Primeiro acesso com senha? Criar minha conta
            </button>
          </Card>
        )}

        {aba === 'aluno' && modoAluno === 'cadastrar' && (
          <Card className="p-6 flex flex-col gap-4">
            {cadastroEnviado ? (
              <div className="text-center flex flex-col gap-3">
                <div className="text-green font-semibold">Quase lá!</div>
                <p className="text-sm text-textSec leading-relaxed">
                  Enviamos um e-mail de confirmação para <strong>{email.trim().toLowerCase()}</strong>.
                  Abra-o e toque no link — ao voltar, você já entra com a senha que acabou de escolher.
                </p>
                <button
                  className="text-sm text-blue underline mt-1"
                  onClick={() => {
                    setModoAluno('entrar')
                    setCadastroEnviado(false)
                    setSenha('')
                    setSenhaConfirma('')
                    limparEstadoCadastro()
                  }}
                >
                  Voltar para o login
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-textSec leading-relaxed">
                  Você também pode entrar diretamente com a conta Google institucional — sem criar
                  outra senha para este aplicativo.
                </p>
                {googleButton}
                {separador}
                <p className="text-sm text-textSec leading-relaxed">
                  Se preferir senha local, use o seu e-mail institucional e escolha uma senha.
                </p>
                {campoEmail}
                <div>
                  <label className="block text-sm font-semibold text-textSec mb-2">Escolha uma senha</label>
                  <input
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    className="w-full rounded-lg border-2 border-border px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blueAcc"
                  />
                  <p className="text-xs text-textMuted mt-1">Pelo menos {SENHA_MINIMA} caracteres.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-textSec mb-2">Repita a senha</label>
                  <input
                    value={senhaConfirma}
                    onChange={(e) => setSenhaConfirma(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && cadastrar()}
                    type="password"
                    autoComplete="new-password"
                    className="w-full rounded-lg border-2 border-border px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blueAcc"
                  />
                </div>
                {erro && <ErrorBanner message={erro} />}
                {contaExistente && (
                  confirmacaoReenviada ? (
                    <div className="rounded-lg bg-greenLight text-green text-sm px-4 py-3 leading-relaxed">
                      Reenviamos a confirmação para <strong>{email.trim().toLowerCase()}</strong>.
                    </div>
                  ) : (
                    <button
                      onClick={reenviarConfirmacaoCadastro}
                      disabled={ocupado}
                      className="text-sm text-blue underline text-center disabled:opacity-40"
                    >
                      Reenviar e-mail de confirmação
                    </button>
                  )
                )}
                <Btn onClick={cadastrar} disabled={ocupado} className="w-full text-lg py-4">
                  {ocupado ? 'Criando…' : 'Criar minha conta'}
                </Btn>
                <button
                  onClick={() => {
                    setModoAluno('entrar')
                    setSenha('')
                    setSenhaConfirma('')
                    limparEstadoCadastro()
                  }}
                  className="text-xs text-textMuted underline text-center"
                >
                  Já tenho conta
                </button>
              </>
            )}
          </Card>
        )}

        {aba === 'docente' &&
          (enviado ? (
            <Card className="p-6 flex flex-col gap-3 text-center">
              <div className="text-green font-semibold">Link enviado!</div>
              <p className="text-sm text-textSec">
                Enviamos um link de acesso para <strong>{email.trim().toLowerCase()}</strong>. Abra
                o e-mail no mesmo aparelho e toque no link para entrar.
              </p>
              <button
                className="text-sm text-blue underline mt-1"
                onClick={() => {
                  setEnviado(false)
                  setEmail('')
                }}
              >
                Usar outro e-mail
              </button>
            </Card>
          ) : (
            <Card className="p-6 flex flex-col gap-4">
              <p className="text-sm text-textSec">
                Entre com o seu e-mail institucional. Você receberá um link de acesso — sem senha.
              </p>
              {campoEmail}
              {erro && <ErrorBanner message={erro} />}
              <Btn onClick={enviarLink} disabled={ocupado} className="w-full text-lg py-4">
                {ocupado ? 'Enviando…' : 'Receber link de acesso'}
              </Btn>
            </Card>
          ))}

        <p className="text-xs text-textMuted mt-4 text-center">
          Atividade formativa. Não compõe nota.
        </p>
      </div>
    </div>
  )
}
