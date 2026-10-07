import { useNavigate } from 'react-router-dom'
import { Btn, Card, PageHeader } from '../../ui/kit'

export function Importacao() {
  const navigate = useNavigate()
  return (
    <div className="max-w-2xl mx-auto p-6">
      <PageHeader title="Importar questões" subtitle="Duas portas de entrada para o banco institucional" />
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <h2 className="font-semibold text-text mb-1">Porta A — arquivo já estruturado</h2>
          <p className="text-sm text-textSec mb-4">
            Cole ou envie um JSON no schema canônico (uma questão, ou um array/lote). Para quem já tem
            as questões prontas no formato institucional.
          </p>
          <Btn variant="primary" onClick={() => navigate('/importacao/porta-a')}>
            Ir para a Porta A
          </Btn>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-text mb-1">Porta B — colar do formato da coordenação</h2>
          <p className="text-sm text-textSec mb-4">
            Cole o texto do documento de questões e o do gabarito (o formato real usado hoje — dois
            .docx por SP, casados pelo número da questão). O app estrutura automaticamente.
          </p>
          <Btn variant="primary" onClick={() => navigate('/importacao/porta-b')}>
            Ir para a Porta B
          </Btn>
        </Card>
      </div>
      <p className="text-xs text-textMuted mt-6">
        Toda questão importada nasce <strong>pendente</strong> — some campos de curadoria (tema, área
        clínica, nível de Bloom, competências) podem ser completados na conferência antes de confirmar,
        ou depois. Nenhuma questão fica disponível para sessão sem passar por aqui.
      </p>
    </div>
  )
}
