# Contrato conceitual de conteúdo

Este contrato descreve objetos duráveis sem prescrever banco, API ou implementação.

## Questões e organização

- **Question:** identidade estável do objeto pedagógico.
- **QuestionVersion:** conteúdo e metadados de uma revisão específica, preservando histórico.
- **Provenance:** origem, autoria, transformação e base que permitem interpretar e auditar o conteúdo.
- **Curriculum links:** relações com competências, objetivos e estruturas curriculares.
- **Collections:** agrupamentos editoriais ou pedagógicos sem criar novos tipos incompatíveis de questão.
- **Usage context:** circunstância em que o conteúdo é apresentado, praticado ou avaliado.

ENAMED, AMRIGS, Revalida, aula e Morfo são contextos, proveniências ou coleções conforme o caso; não são bancos conceitualmente incompatíveis.

## Flashcards e revisão

- **Flashcard:** identidade estável de um objeto de recuperação ativa.
- **FlashcardVersion:** conteúdo de uma revisão específica do flashcard.
- **ReviewEvent:** registro imutável de uma interação de revisão, com escala e contexto próprios.
- **SchedulingState:** estado derivado que orienta a próxima revisão e pertence ao domínio responsável pelo agendamento.

Versões e proveniência devem sobreviver à migração entre implementações.

## Objetos conceituais futuros do e-Portfólio

Os nomes físicos poderão mudar e esta lista não congela schema:

- **PortfolioEvidence:** referência contextualizada a uma evidência, preferencialmente vinculada à fonte.
- **PortfolioReflection:** reflexão autoral do estudante; não é obrigatória para toda evidência.
- **FeedbackRecord:** feedback com autoria, data, contexto, origem, visibilidade e histórico.
- **DevelopmentGoal:** objetivo de desenvolvimento acordado ou registrado.
- **DevelopmentAction:** ação, prazo, responsável e evidência esperada, sem presumir que conclusão demonstre competência.
- **ProgressReview:** revisão humana registrada que relaciona evidências, objetivos e próximos passos.
- **RemediationPlan:** intervenção formal, quando indicada, contendo objetivo, atividade prevista, prazo, responsável, evidência esperada, critérios de recuperação, reavaliação e revisão humana final.

O domínio separa registros institucionais, produções do estudante e acompanhamento compartilhado. Correções de registros assinados preservam versão, autoria e histórico. Melhoria habitual não equivale a remediação formal, e remediação não nasce automaticamente de uma nota isolada.
