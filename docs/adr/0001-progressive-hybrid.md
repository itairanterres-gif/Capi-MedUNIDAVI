# ADR 0001 — Arquitetura híbrida progressiva

- **Status:** aceita para o projeto
- **Escopo do status:** direção do projeto; não constitui aprovação institucional de produção

## Contexto

O patrimônio do Capi está distribuído em módulos especializados que já representam experiências, conteúdos e decisões relevantes. A fundação precisa permitir unidade de produto sem exigir uma migração abrupta ou apagar o que existe.

## Decisão

Adotar arquitetura híbrida progressiva, no padrão *strangler*. Este repositório concentra inicialmente governança, contratos compartilhados, fontes de verdade e identidade de produto. Capacidades transversais e um shell poderão migrar para cá quando seus gates forem satisfeitos. Módulos especializados permanecem operacionais e evoluem por contratos explícitos.

## Consequências

- A percepção de um produto único pode avançar antes da unificação física dos runtimes.
- Migrações podem ocorrer por domínio, com responsabilidades e critérios de retirada explícitos.
- Compatibilidade temporária e mapeamento de legados são responsabilidades arquiteturais.
- “Tecnicamente pronto” não significa “autorizado para produção”.

## Alternativas não adotadas nesta fase

- **Monorepo imediato:** acoplaria a fundação à movimentação prematura de código e operação.
- **Copiar todos os runtimes:** duplicaria implementações e confundiria fontes de verdade.
- **Manter apps isolados permanentemente sem contratos comuns:** impediria continuidade longitudinal e governança coerente.
