import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Btn, Card, ErrorBanner, PageHeader, Spinner } from '../../ui/kit'
import { client } from '../../lib/client'
import { useAuth } from '../auth/AuthContext'
import { rotuloSP, rotuloUC } from '../../lib/rotulos'
import type { ItemAluno, Sessao } from '../../lib/types'

// Banco de questões da SP liberado ao aluno depois da sessão.
//
// Não precisou de nada novo no banco: a RLS `fn_questao_liberada_para_aluno`
// (migration 2) já libera a questão completa ao participante depois que o item
// foi travado, e `rpc_ver_item` devolve gabarito e justificativas nesse estado.
// Esta tela só percorre os itens da sessão e pede cada um.
export function RevisaoSP() {
  const { sessaoId } = useParams<{ sessaoId: string }>()
  const navigate = useNavigate()
  const { identidade } = useAuth()

  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [itens, setItens] = useState<ItemAluno[]>([])
  const [aberta, setAberta] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!sessaoId || !identidade) return
    try {
      setSessao(await client.getSessao(sessaoId))
      const lista = await client.listarItens(sessaoId)
      const detalhes: ItemAluno[] = []
      for (const i of lista) {
        try {
          detalhes.push(await client.verItem(i.id, identidade.id))
        } catch {
          // item que nunca foi aberto não é liberado — simplesmente não entra
        }
      }
      setItens(detalhes)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar as questões')
    }
  }, [sessaoId, identidade])

  useEffect(() => {
    carregar()
  }, [carregar])

  if (erro) {
    return (
      <div className="max-w-md mx-auto p-5">
        <ErrorBanner message={erro} />
      </div>
    )
  }
  if (!sessao) return <Spinner />

  return (
    <div className="max-w-md mx-auto p-5 pb-10">
      <PageHeader
        title="Questões da SP"
        subtitle={`${rotuloUC(sessao.uc_slug)} · ${rotuloSP(sessao.sp_referencia)}`}
      />

      <p className="text-sm text-textSec mb-4">
        As {itens.length} questões desta Situação-Problema, com gabarito e justificativas. Ficam
        disponíveis para você revisar quando quiser.
      </p>

      <div className="flex flex-col gap-2">
        {itens.map((it, i) => {
          const expandida = aberta === it.sessao_questao_id
          const acertou = it.acertei
          return (
            <Card key={it.sessao_questao_id} className="p-4">
              <button
                className="w-full text-left flex items-start gap-3"
                onClick={() => setAberta(expandida ? null : it.sessao_questao_id)}
              >
                <span
                  className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                    it.minha_resposta === undefined
                      ? 'bg-blueLight text-blue'
                      : acertou
                        ? 'bg-greenLight text-green'
                        : 'bg-redLight text-red'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-text">{it.enunciado}</span>
              </button>

              {expandida && (
                <div className="mt-3 pt-3 border-t border-borderLight flex flex-col gap-2">
                  {it.texto_base && (
                    <p className="text-sm text-textSec whitespace-pre-wrap">{it.texto_base}</p>
                  )}
                  {[...it.alternativas].sort((a, b) => a.letra.localeCompare(b.letra)).map((a) => {
                    const correta = it.gabarito === a.letra
                    const minhaErrada = it.minha_resposta === a.letra && !correta
                    return (
                      <div
                        key={a.letra}
                        className={`rounded border px-3 py-2 text-sm ${
                          correta
                            ? 'border-green bg-greenLight'
                            : minhaErrada
                              ? 'border-red bg-redLight'
                              : 'border-border'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <strong className="shrink-0">{a.letra}</strong>
                          <span className="flex-1">
                            {a.texto}
                            {it.justificativas?.[a.letra] && (
                              <span className="block text-xs text-textSec mt-1">
                                {it.justificativas[a.letra]}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <Btn variant="secondary" className="w-full mt-5" onClick={() => navigate(`/aluno/${sessaoId}`)}>
        Voltar
      </Btn>
    </div>
  )
}
