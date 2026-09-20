# Capi MedUNIDAVI

**Projeto educacional em desenvolvimento para o Curso de Medicina da UNIDAVI.**

O Capi MedUNIDAVI é concebido como um ambiente longitudinal de formação médica. Seu eixo é a trajetória que conecta currículo, competências e experiências no ciclo **aprender → praticar → receber feedback → revisar → integrar à trajetória**. As ferramentas apoiam esse percurso; não definem, isoladamente, o produto.

## Estágio atual

Este repositório estabelece a fundação canônica pública do projeto: governança, princípios de produto e design, decisões arquiteturais, contratos conceituais e registro sanitizado das fontes de verdade. **Ainda não há shell de produção implementado neste repositório.**

O princípio fundador é **recuperar antes de recriar**: preservar o patrimônio pedagógico, os dados, os contratos e as decisões existentes, independentemente das implementações provisórias que hoje os hospedam.

O e-Portfólio longitudinal integra o planejamento como domínio transversal futuro. Ele deverá conectar experiências, evidências, feedback, reflexão, ações e revisões ao longo do curso, sem constituir nesta fase um aplicativo, runtime, schema ou repositório de anexos.

## Arquitetura progressiva

A direção adotada é uma arquitetura híbrida progressiva, seguindo o padrão *strangler*. O Capi começa como casa de governança, contratos compartilhados, fontes de verdade e identidade comum. Um shell e capacidades realmente transversais poderão ser incorporados em fases futuras, após os respectivos gates.

Os módulos especializados existentes permanecem inicialmente em seus próprios repositórios:

- `Treino-enamed`;
- `sessao-questoes-unidavi`;
- `virtual-patient-pal`;
- `xi-sam-unidavi-v2`.

Eles não são copiados para este repositório nesta fase.

## Documentos da fundação

- [Princípios de produto](CAPI_PRODUCT.md)
- [Princípios de design](CAPI_DESIGN.md)
- [Fundação arquitetural](docs/architecture/foundation.md)
- [Síntese pública A0–A1](docs/archaeology/A0-A1-public-summary.md)
- [ADR 0001 — arquitetura híbrida progressiva](docs/adr/0001-progressive-hybrid.md)
- [ADR 0002 — destino canônico de dados](docs/adr/0002-canonical-supabase.md)
- [Sequência e gates de migração](docs/migration/sequence-and-gates.md)
- Contratos conceituais: [identidade](contracts/identity/README.md), [conteúdo](contracts/content/README.md), [eventos](contracts/events/README.md), [lançamento de módulos](contracts/module-launch/README.md) e [IA](contracts/ai/README.md)
- Registros sanitizados: [sistemas](registry/systems.json) e [fontes](registry/sources.json)

Este repositório não representa implantação oficial ou integração operacional com sistemas institucionais da UNIDAVI.
