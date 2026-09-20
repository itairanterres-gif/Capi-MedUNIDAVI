# Contrato conceitual de identidade

Este documento define vocabulário e invariantes; não é schema executável.

## Conceitos

- **Pessoa canônica:** representação longitudinal da pessoa no produto, independente de um mecanismo específico de autenticação.
- **Identidade de origem:** vínculo verificável entre uma pessoa canônica e uma identidade mantida por um sistema de origem.
- **Papel:** responsabilidade contextual, como estudante, docente ou coordenação. Uma pessoa pode ter múltiplos papéis.

Papéis não se fundem automaticamente. Sua atribuição, escopo e vigência exigem regras próprias.

Uma identidade legada é identificada conceitualmente pelo par **sistema de origem + UUID local**. O identificador local não deve ser interpretado isoladamente nem publicado como dado pessoal.

## Transição

Os mecanismos de Auth atuais continuam locais a cada módulo durante a transição. Isso não representa identidade unificada ou SSO.

Futuras integrações com Mentor e Google Workspace devem ocorrer por adapters. Seus identificadores podem contribuir para vínculos autorizados, mas não se tornam a identidade nuclear do Capi.

## Papéis e visibilidade no e-Portfólio

Estudante, docente ou preceptor da atividade, docente de referência e coordenação podem coexistir como papéis distintos e acumuláveis. Isso não concede automaticamente o mesmo alcance de acesso a todos.

A visibilidade depende de papel, contexto e finalidade. Um preceptor que oferece feedback pontual pode receber acesso somente ao registro pertinente, sem acesso ao portfólio completo. O domínio deverá distinguir conteúdo pessoal, conteúdo compartilhado e registro institucional, com atribuições futuras representadas por contratos de papel, não por fusão entre pessoa e Auth.

Notas internas de trabalho não podem ser reveladas inadvertidamente. Decisões e ações que afetem o estudante devem ser comunicadas de modo compreensível. Evidências devem receber orientação e proteção contra inclusão de dados identificáveis de pacientes.
