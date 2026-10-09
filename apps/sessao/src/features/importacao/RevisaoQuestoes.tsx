// Tela de conferência — comum às duas portas. Nenhuma questão vai para o
// banco sem passar por aqui: o docente vê erro/aviso por questão, pode
// excluir da leva e completar tema/área/nível/competências antes de
// confirmar (§6 do brief: "colar + IA + conferência" — a IA não está
// wireada nesta fatia, mas a conferência humana é o portão real).
import { useMemo, useState } from 'react'
import { Btn, Card, ErrorBanner } from '../../ui/kit'
import type { AreaClinica, NivelBloom, QuestaoRascunho } from '../../lib/types'
import { validarRascunho } from '../../lib/validacaoQuestao'

const AREA_CLINICA_OPCOES: AreaClinica[] = [
  'ciclo_basico',
  'clinica_medica',
  'cirurgia',
  'ginecologia_obstetricia',
  'pediatria',
  'medicina_familia_comunidade',
  'saude_mental',
  'urgencia_emergencia',
]

const NIVEL_BLOOM_OPCOES: NivelBloom[] = ['conhecimento', 'compreensao', 'aplicacao', 'analise', 'sintese', 'avaliacao']

interface Props {
  rascunhos: QuestaoRascunho[]
  onVoltar: () => void
  onConfirmar: (selecionados: QuestaoRascunho[]) => void
  confirmando: boolean
  erro?: string | null
}

export function RevisaoQuestoes({ rascunhos: iniciais, onVoltar, onConfirmar, confirmando, erro }: Props) {
  const [rascunhos, setRascunhos] = useState(iniciais)
  const validacoes = useMemo(() => rascunhos.map((r) => validarRascunho(r)), [rascunhos])
  const [incluidas, setIncluidas] = useState<boolean[]>(() => validacoes.map((v) => v.erros.length === 0))

  function editar(idx: number, patch: Partial<QuestaoRascunho>) {
    setRascunhos((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const total = rascunhos.length
  const validas = validacoes.filter((v) => v.erros.length === 0).length
  const selecionadasCount = incluidas.filter(Boolean).length

  return (
    <div className="max-w-3xl mx-auto p-6 pb-28">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Conferir antes de importar</h1>
        <p className="text-textSec mt-1">
          {total} questão(ões) reconhecida(s) · {validas} sem erro de estrutura · {selecionadasCount} selecionada(s) para importar
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {rascunhos.map((r, idx) => {
          const v = validacoes[idx]
          const marcada = incluidas[idx]
          return (
            <Card key={idx} className={`p-4 ${marcada ? '' : 'opacity-60'}`}>
              <div className="flex items-start gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={marcada}
                  disabled={v.erros.length > 0}
                  onChange={(e) =>
                    setIncluidas((prev) => prev.map((x, i) => (i === idx ? e.target.checked : x)))
                  }
                  className="mt-1 h-5 w-5 accent-blue"
                  title={v.erros.length > 0 ? 'Corrija os erros ou remova esta questão da leva' : 'Incluir na importação'}
                />
                <div className="flex-1">
                  <div className="text-xs text-textMuted mb-1">
                    Questão {idx + 1} · fase {r.fase_alvo} · {r.uc_slug || '(uc_slug ausente)'}
                    {r.dificuldade_editorial && ` · ${r.dificuldade_editorial}`}
                  </div>
                  <div className="text-sm text-text">{r.enunciado || <em className="text-textMuted">(enunciado ausente)</em>}</div>
                </div>
              </div>

              {r.alternativas.length > 0 && (
                <ul className="text-xs text-textSec ml-8 mb-3 flex flex-col gap-1">
                  {r.alternativas.map((a) => (
                    <li key={a.letra} className={a.correta ? 'font-semibold text-green' : ''}>
                      ({a.letra}) {a.texto} {a.correta && '✓'}
                    </li>
                  ))}
                </ul>
              )}

              {v.erros.length > 0 && (
                <div className="ml-8 mb-3 text-xs text-red">
                  {v.erros.map((e, i) => (
                    <div key={i}>⚠ {e}</div>
                  ))}
                </div>
              )}
              {v.avisos.length > 0 && (
                <div className="ml-8 mb-3 text-xs text-amber">
                  {v.avisos.map((a, i) => (
                    <div key={i}>ⓘ {a}</div>
                  ))}
                </div>
              )}

              <details className="ml-8">
                <summary className="text-xs font-semibold text-blue cursor-pointer select-none">
                  Completar curadoria (tema, área, nível, competências) — opcional agora
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-textSec mb-1">Tema</label>
                    <input
                      value={r.tema ?? ''}
                      onChange={(e) => editar(idx, { tema: e.target.value || null })}
                      className="w-full rounded border border-border px-2 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-textSec mb-1">Subtema</label>
                    <input
                      value={r.subtema ?? ''}
                      onChange={(e) => editar(idx, { subtema: e.target.value || null })}
                      className="w-full rounded border border-border px-2 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-textSec mb-1">Área clínica</label>
                    <select
                      value={r.area_clinica ?? ''}
                      onChange={(e) => editar(idx, { area_clinica: (e.target.value || null) as AreaClinica | null })}
                      className="w-full rounded border border-border px-2 py-2 text-sm"
                    >
                      <option value="">—</option>
                      {AREA_CLINICA_OPCOES.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-textSec mb-1">Nível de Bloom</label>
                    <select
                      value={r.nivel_bloom ?? ''}
                      onChange={(e) => editar(idx, { nivel_bloom: (e.target.value || null) as NivelBloom | null })}
                      className="w-full rounded border border-border px-2 py-2 text-sm"
                    >
                      <option value="">—</option>
                      {NIVEL_BLOOM_OPCOES.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-textSec mb-1">
                      Competências DCN 2025 (slugs separados por vírgula, ex.: dcn2025_comp_03)
                    </label>
                    <input
                      value={r.competencia_dcn_2025.join(', ')}
                      onChange={(e) =>
                        editar(idx, {
                          competencia_dcn_2025: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full rounded border border-border px-2 py-2 text-sm"
                    />
                  </div>
                </div>
              </details>
            </Card>
          )
        })}
      </div>

      {erro && (
        <div className="mt-4">
          <ErrorBanner message={erro} />
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-4 flex justify-between">
        <Btn variant="ghost" onClick={onVoltar} disabled={confirmando}>
          Voltar
        </Btn>
        <Btn
          variant="primary"
          disabled={confirmando || selecionadasCount === 0}
          onClick={() => onConfirmar(rascunhos.filter((_, i) => incluidas[i]))}
        >
          {confirmando ? 'Importando…' : `Importar ${selecionadasCount} questão(ões)`}
        </Btn>
      </div>
    </div>
  )
}
