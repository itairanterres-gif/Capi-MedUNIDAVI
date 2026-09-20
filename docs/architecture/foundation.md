# Fundação arquitetural

## Direção

O Capi MedUNIDAVI evolui por uma arquitetura híbrida progressiva, no padrão *strangler*. A intenção é produzir a percepção de um único ambiente longitudinal enquanto capacidades são integradas por etapas seguras e reversíveis.

Este repositório começa como casa de governança, identidade comum do produto, contratos compartilhados e registro das fontes de verdade. Um shell progressivo poderá nascer aqui em fase futura; sua existência não é pressuposta nesta fundação.

## Especialização e contratos

Os sistemas `Treino-enamed`, `sessao-questoes-unidavi`, `virtual-patient-pal` e `xi-sam-unidavi-v2` permanecem inicialmente especializados. Eles não são copiados integralmente nem convertidos agora em monorepo.

A integração deve ocorrer por contratos explícitos. Cada domínio possui um escritor responsável por seu estado canônico — **um escritor por domínio** — e pode oferecer leituras ou eventos a outros contextos sem criar múltiplas autoridades concorrentes.

## Identidade e contexto institucional

Pessoa, identidade de autenticação e papel são conceitos diferentes: **pessoa ≠ Auth ≠ papel**. A convergência será progressiva e preservará vínculos com identidades de origem.

Uma futura integração com Mentor, Google Workspace ou outros sistemas institucionais deverá ocorrer por adapters e contratos. Identificadores externos não se tornam automaticamente a identidade nuclear do Capi.

## Preservação

O patrimônio pedagógico — conteúdo, proveniência, relações curriculares, experiências e decisões — deve permanecer independente da implementação provisória que o hospeda. Por isso, a regra fundadora é recuperar antes de recriar.

## E-Portfólio como domínio transversal planejado

Os módulos produzem fatos e evidências; o e-Portfólio ajuda o estudante e responsáveis autorizados a interpretá-los longitudinalmente. Ele será consumidor e organizador de eventos e não precisa ser o proprietário original de todos os fatos.

O domínio conecta experiência ou avaliação, evidência, feedback ou reflexão, ação combinada, nova experiência ou reavaliação e revisão do progresso. Não se devem centralizar todos os dados no portfólio apenas para facilitar a interface. Vínculos à origem, autoria, versão, contexto curricular e visibilidade devem sobreviver à composição longitudinal.

O e-Portfólio não existe ainda como runtime e sua futura implementação depende dos contratos anteriores de identidade, papéis, conteúdo, eventos e autorização.
