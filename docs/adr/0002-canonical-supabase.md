# ADR 0002 — Destino canônico de dados

- **Status:** aceita para o projeto
- **Escopo do status:** direção futura condicionada a gates; não constitui autorização de produção

## Contexto

Os módulos existentes operam com responsabilidades e estados próprios. A convergência precisa evitar uma terceira fonte concorrente e preservar a continuidade operacional durante a transição.

## Decisão

O ambiente Supabase atualmente associado à Sessão de Questões será o destino canônico futuro. O Treino permanece preservado e operacional enquanto cada domínio atravessa seus gates de migração. Não será criado um terceiro Supabase para desempenhar a mesma função.

A identidade será convergida em fase própria, com mapeamento explícito de legados. O hardening de segurança precede qualquer convergência estrutural.

## Consequências

- Nenhum dado é movido por esta decisão documental.
- Migrações serão graduais, verificáveis e autorizadas por domínio.
- Configurações, referências de infraestrutura e detalhes de segurança não pertencem ao registro público.
