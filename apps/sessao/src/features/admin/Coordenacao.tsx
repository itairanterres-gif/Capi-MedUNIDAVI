import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Btn, Card, ErrorBanner, PageHeader, Spinner } from '../../ui/kit'
import { client } from '../../lib/client'
import { useAuth } from '../auth/AuthContext'
import { SEMESTRE_VIGENTE, turmaSugerida } from '../../lib/semestre'
import type { Papel } from '../../lib/api'
import type { Autorizacao, Pessoa, Turma } from '../../lib/types'

// Tela da COORDENAÇÃO (admin) — condição inicial do projeto que estava
// faltando: *"a inserção de professores precisa ser por uma tela dos
// administradores/coordenadores"*. Antes disto, promover alguém a professor
// exigia um UPDATE no editor SQL do Supabase, e a lista de turmas era uma
// constante no código (T13/T14/T15), o que impedia professor de outra fase de
// abrir sessão.
//
// PRIVACIDADE: esta tela mostra dado pessoal nominal de docentes E alunos
// (nome, e-mail, turma). Por isso é restrita a admin no cliente (RequireAdmin)
// E no servidor (todas as RPCs checam fn_is_admin — migration 10). Nunca é
// projetada e não é alcançável por professor comum.

type Aba = 'docentes' | 'pessoas' | 'turmas'

const ROTULO_PAPEL: Record<Papel, string> = {
  admin: 'Coordenação',
  professor: 'Professor',
  aluno: 'Aluno',
}

function ChipPapel({ papel }: { papel: Papel }) {
  const tone = papel === 'admin' ? 'terra' : papel === 'professor' ? 'blue' : 'green'
  return <Badge tone={tone}>{ROTULO_PAPEL[papel]}</Badge>
}

export function Coordenacao() {
  const navigate = useNavigate()
  const { identidade } = useAuth()
  const [aba, setAba] = useState<Aba>('docentes')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null)
  const [autorizacoes, setAutorizacoes] = useState<Autorizacao[] | null>(null)
  const [turmas, setTurmas] = useState<Turma[] | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroPapel, setFiltroPapel] = useState<Papel | ''>('')

  // formulário de autorização
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [papelNovo, setPapelNovo] = useState<'professor' | 'admin'>('professor')

  const carregar = useCallback(async () => {
    setErro(null)
    try {
      const [ps, as, ts] = await Promise.all([
        client.listarPessoas({ busca: busca || undefined, role: filtroPapel || undefined }),
        client.listarAutorizacoes(),
        client.turmas(SEMESTRE_VIGENTE),
      ])
      setPessoas(ps)
      setAutorizacoes(as)
      setTurmas(ts)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar')
    }
  }, [busca, filtroPapel])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function acao(fn: () => Promise<void>, mensagem?: string) {
    setErro(null)
    setAviso(null)
    setOcupado(true)
    try {
      await fn()
      await carregar()
      if (mensagem) setAviso(mensagem)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro')
    } finally {
      setOcupado(false)
    }
  }

  async function autorizar() {
    const e = email.trim()
    if (!e) return
    await acao(async () => {
      const r = await client.autorizarDocente(e, papelNovo, nome.trim() || undefined)
      setEmail('')
      setNome('')
      setAviso(
        r === 'aplicado'
          ? `${e} já tinha conta e passou a ${ROTULO_PAPEL[papelNovo].toLowerCase()} agora.`
          : `${e} autorizado. No primeiro acesso pelo link no e-mail, já entra como ${ROTULO_PAPEL[papelNovo].toLowerCase()} — não precisa avisar ninguém.`
      )
    })
  }

  if (!pessoas || !autorizacoes || !turmas) {
    return erro ? (
      <div className="max-w-md mx-auto p-6">
        <ErrorBanner message={erro} />
      </div>
    ) : (
      <Spinner />
    )
  }

  const docentes = pessoas.filter((p) => p.role !== 'aluno')

  return (
    <div className="max-w-4xl mx-auto p-6 pb-16">
      <PageHeader
        title="Coordenação"
        subtitle={`${identidade?.nome ?? ''} · ${SEMESTRE_VIGENTE}`}
        action={
          <Btn variant="secondary" onClick={() => navigate('/professor')}>
            Minhas sessões
          </Btn>
        }
      />

      <div className="flex gap-1 mb-5 border-b border-border">
        {(
          [
            ['docentes', `Docentes (${docentes.length})`],
            ['pessoas', `Todas as pessoas (${pessoas.length})`],
            ['turmas', `Turmas (${turmas.length})`],
          ] as [Aba, string][]
        ).map(([id, rotulo]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${
              aba === id
                ? 'border-blue text-blue'
                : 'border-transparent text-textSec hover:text-text'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {erro && <ErrorBanner message={erro} />}
      {aviso && (
        <div className="rounded-lg bg-greenLight text-green text-sm px-4 py-3 mb-4 leading-relaxed">
          {aviso}
        </div>
      )}

      {/* ================= DOCENTES ================= */}
      {aba === 'docentes' && (
        <>
          <Card className="p-5 mb-5">
            <div className="font-semibold text-text mb-1">Incluir um professor</div>
            <p className="text-sm text-textSec mb-4 leading-relaxed">
              Informe o e-mail institucional. A pessoa não precisa ter entrado antes: na primeira
              vez que ela acessar pelo link enviado ao e-mail, já entra com o papel definido aqui.
              Se já tiver conta, o papel muda na hora.
            </p>
            <div className="flex gap-3 flex-wrap items-end">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-semibold text-textSec mb-1">
                  E-mail institucional
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@unidavi.edu.br"
                  className="w-full rounded border border-border px-3 py-2.5 text-sm"
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-semibold text-textSec mb-1">
                  Nome (opcional)
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Prof. Dimas"
                  className="w-full rounded border border-border px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSec mb-1">Papel</label>
                <select
                  value={papelNovo}
                  onChange={(e) => setPapelNovo(e.target.value as 'professor' | 'admin')}
                  className="rounded border border-border px-3 py-2.5 text-sm"
                >
                  <option value="professor">Professor</option>
                  <option value="admin">Coordenação</option>
                </select>
              </div>
              <Btn onClick={autorizar} disabled={ocupado || !email.trim()}>
                Incluir
              </Btn>
            </div>
          </Card>

          <div className="text-sm font-semibold text-textSec mb-2">
            Docentes com acesso ({docentes.length})
          </div>
          <Card className="mb-5 overflow-hidden">
            {docentes.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-borderLight last:border-0 flex-wrap"
              >
                <div className="flex-1 min-w-[180px]">
                  <div className="text-sm font-medium text-text">
                    {p.nome} {p.eu && <span className="text-xs text-textMuted">(você)</span>}
                  </div>
                  <div className="text-xs text-textMuted">{p.email}</div>
                </div>
                <ChipPapel papel={p.role} />
                <select
                  value={p.role}
                  disabled={ocupado || p.eu}
                  title={p.eu ? 'Você não pode alterar o seu próprio papel' : undefined}
                  onChange={(e) =>
                    acao(
                      () => client.definirPapel(p.id, e.target.value as Papel),
                      `${p.nome} agora é ${ROTULO_PAPEL[e.target.value as Papel].toLowerCase()}.`
                    )
                  }
                  className="rounded border border-border px-2 py-1.5 text-xs disabled:opacity-40"
                >
                  <option value="admin">Coordenação</option>
                  <option value="professor">Professor</option>
                  <option value="aluno">Aluno</option>
                </select>
              </div>
            ))}
          </Card>

          <div className="text-sm font-semibold text-textSec mb-2">
            Convites aguardando primeiro acesso
          </div>
          <Card className="overflow-hidden">
            {autorizacoes.filter((a) => !a.usado_em).length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-textMuted">
                Nenhum convite pendente.
              </div>
            ) : (
              autorizacoes
                .filter((a) => !a.usado_em)
                .map((a) => (
                  <div
                    key={a.email}
                    className="flex items-center gap-3 px-4 py-3 border-b border-borderLight last:border-0 flex-wrap"
                  >
                    <div className="flex-1 min-w-[180px]">
                      <div className="text-sm text-text">{a.email}</div>
                      {a.observacao && (
                        <div className="text-xs text-textMuted">{a.observacao}</div>
                      )}
                    </div>
                    <Badge tone="amber">aguardando 1º acesso</Badge>
                    <ChipPapel papel={a.papel} />
                    <button
                      disabled={ocupado}
                      onClick={() =>
                        acao(
                          () => client.revogarAutorizacao(a.email),
                          `Convite de ${a.email} cancelado.`
                        )
                      }
                      className="text-xs text-terra font-semibold underline disabled:opacity-40"
                    >
                      cancelar
                    </button>
                  </div>
                ))
            )}
          </Card>
        </>
      )}

      {/* ================= TODAS AS PESSOAS ================= */}
      {aba === 'pessoas' && (
        <>
          <div className="rounded-lg bg-amberLight text-amber text-xs px-4 py-2.5 mb-4 font-medium">
            Dado pessoal nominal de docentes e alunos. Não projete esta tela.
          </div>
          <div className="flex gap-3 mb-4 flex-wrap">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail…"
              className="flex-1 min-w-[220px] rounded border border-border px-3 py-2.5 text-sm"
            />
            <select
              value={filtroPapel}
              onChange={(e) => setFiltroPapel(e.target.value as Papel | '')}
              className="rounded border border-border px-3 py-2.5 text-sm"
            >
              <option value="">Todos os papéis</option>
              <option value="admin">Coordenação</option>
              <option value="professor">Professores</option>
              <option value="aluno">Alunos</option>
            </select>
          </div>
          <Card className="overflow-hidden">
            {pessoas.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-textMuted">
                Ninguém encontrado com esse filtro.
              </div>
            ) : (
              pessoas.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-borderLight last:border-0 flex-wrap"
                >
                  <div className="flex-1 min-w-[180px]">
                    <div className="text-sm font-medium text-text">{p.nome}</div>
                    <div className="text-xs text-textMuted">{p.email}</div>
                  </div>
                  <ChipPapel papel={p.role} />
                  {p.role === 'aluno' ? (
                    <>
                      <select
                        value={p.fase ?? ''}
                        disabled={ocupado}
                        onChange={(e) => {
                          const f = e.target.value ? Number(e.target.value) : null
                          acao(() =>
                            client.definirTurmaFase(
                              p.id,
                              f ? turmaSugerida(f) : p.turma,
                              f
                            )
                          )
                        }}
                        className="rounded border border-border px-2 py-1.5 text-xs"
                      >
                        <option value="">fase —</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((f) => (
                          <option key={f} value={f}>
                            {f}ª fase
                          </option>
                        ))}
                      </select>
                      <span className="text-xs font-mono text-textSec w-10">{p.turma ?? '—'}</span>
                    </>
                  ) : (
                    <span className="text-xs text-textMuted w-[132px] text-right">docente</span>
                  )}
                </div>
              ))
            )}
          </Card>
        </>
      )}

      {/* ================= TURMAS ================= */}
      {aba === 'turmas' && (
        <>
          <Card className="p-5 mb-5">
            <div className="font-semibold text-text mb-1">Turmas de {SEMESTRE_VIGENTE}</div>
            <p className="text-sm text-textSec leading-relaxed">
              Uma turma por fase. Em {SEMESTRE_VIGENTE} o número da turma é <strong>20 menos a
              fase</strong> — 4ª fase é a T16, 5ª a T15, e assim por diante até a 8ª, que é a T12.
              A regra sobe um a cada semestre, porque cada turma avança uma fase. As cinco
              confirmadas pela coordenação são da 4ª à 8ª fase; as demais foram derivadas da mesma
              regra e você pode desativar as que não existem.
            </p>
          </Card>
          <Card className="overflow-hidden">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((fase) => {
              const t = turmas.find((x) => x.fase === fase)
              return (
                <div
                  key={fase}
                  className="flex items-center gap-3 px-4 py-3 border-b border-borderLight last:border-0"
                >
                  <div className="w-20 text-sm text-textSec">{fase}ª fase</div>
                  <input
                    type="text"
                    defaultValue={t?.codigo ?? turmaSugerida(fase)}
                    onBlur={(e) => {
                      const codigo = e.target.value.trim().toUpperCase()
                      if (!codigo || codigo === t?.codigo) return
                      acao(
                        () =>
                          client.definirTurma({
                            semestre: SEMESTRE_VIGENTE,
                            codigo,
                            fase,
                            ativa: true,
                          }),
                        `Turma da ${fase}ª fase definida como ${codigo}.`
                      )
                    }}
                    className="w-24 rounded border border-border px-2 py-1.5 text-sm font-mono"
                  />
                  {fase >= 4 && fase <= 8 ? (
                    <Badge tone="green">confirmada</Badge>
                  ) : (
                    <Badge tone="amber">derivada — conferir</Badge>
                  )}
                  <div className="flex-1" />
                  {t && (
                    <button
                      disabled={ocupado}
                      onClick={() =>
                        acao(
                          () => client.definirTurma({ ...t, ativa: false }),
                          `Turma ${t.codigo} desativada.`
                        )
                      }
                      className="text-xs text-terra font-semibold underline disabled:opacity-40"
                    >
                      desativar
                    </button>
                  )}
                </div>
              )
            })}
          </Card>
        </>
      )}
    </div>
  )
}
