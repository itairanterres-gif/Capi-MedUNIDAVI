"use client";

export function Briefing({ aoIniciar }: { aoIniciar: () => void }) {
  return (
    <div>
      <h1>Simulação clínica virtual — consulta ambulatorial</h1>
      <p className="sub">
        Internato, 12ª fase — Curso de Medicina da UNIDAVI. Uso formativo.
      </p>

      <div className="cartao">
        <h2 style={{ marginTop: 0 }}>Sua tarefa</h2>
        <p>
          Você é o médico responsável pela consulta de retorno de uma paciente
          com diabetes tipo 2 na atenção ambulatorial do SUS. Exames foram
          realizados recentemente e estão na tela, ao lado da conversa. Conduza
          a consulta e estabeleça o plano de cuidado.
        </p>
        <p>
          Você tem <strong>15 minutos</strong>. Ao final, haverá um feedback
          curto e uma <strong>segunda tentativa de 5 minutos</strong> sobre o
          momento que você escolher refazer. Depois, o debriefing é conduzido
          pelo professor.
        </p>
      </div>

      <div className="cartao">
        <h2 style={{ marginTop: 0 }}>Segurança psicológica e confidencialidade</h2>
        <ul>
          <li>
            Ambiente de ficção assumida e sem julgamento: erro aqui é material
            de aprendizagem, não falta.
          </li>
          <li>
            O preceptor acompanha a transcrição ao vivo em outra tela e{" "}
            <strong>não intervém durante a consulta</strong>. Qualquer dado
            clínico de que você precise está no laudo ou deve ser obtido
            perguntando à paciente.
          </li>
          <li>
            O que acontece nesta estação não é comentado fora do grupo. Não
            comente o caso com colegas que ainda vão realizar a simulação.
          </li>
        </ul>
      </div>

      <div className="aviso">
        <strong>Registro formativo.</strong> A conversa é registrada e um
        checklist é pré-marcado automaticamente para apoiar o debriefing. A
        pré-marcação não é nota: ela só tem valor depois de revisada pelo
        preceptor.
      </div>

      <div className="aviso">
        <strong>A paciente é uma IA.</strong> Maria Aparecida é um paciente
        virtual gerado por modelo de linguagem. Ela pode errar. Não digite
        nenhum dado real: nenhum nome de paciente real, nenhum dado de
        prontuário, nenhum dado pessoal seu ou de terceiros.
      </div>

      <button onClick={aoIniciar}>Iniciar consulta</button>
    </div>
  );
}
