# Sessão Semanal de Questões — Medicina UNIDAVI

App enxuto para a sessão semanal de ~20 questões ENAMED em sala: professor projeta, turma responde pelo celular, sistema trava, mostra distribuição, professor discute. Formativo, sem nota. Piloto 2026/2 com T15, T14 e T13.

Fatia do ecossistema MED-UNIDAVI 2027 — o que precisa nascer certo é o **schema de dados** (`supabase/migrations/`).

## Estado atual

**Passo 3 de 4** (conforme plano de trabalho): fluxo da sessão de ponta a ponta (passo 2) construído e verificado — professor monta e abre, aluno entra pelo código, responde, professor trava, distribuição aparece (professor/projeção/aluno), avança, encerra. Importação (passo 3) construída e verificada — Porta A (JSON no schema canônico) e Porta B (colar do formato real da coordenação, estruturação determinística sem IA), ambas convergindo numa tela de conferência antes de gravar no banco. Roda em modo demo (dados em memória, sem Supabase) com **799 questões reais** das 4ª, 5ª e 6ª fases (as 3 UCs PBL de cada fase; ver `docs/passo-3-importacao.md` para o detalhamento por UC/SP) + o que for importado. Leia `docs/passo-2-fluxo-sessao.md` e `docs/passo-3-importacao.md`.

O schema foi **realinhado ao contrato institucional** `schema_questao_med_unidavi.json` (o `SCHEMA_OUTPUT` da §10, encontrado dentro da skill `capi-questoes-enamed`) — que prevalece sobre o rascunho da §5. Leia `docs/revisao-schema.md`: a reconciliação com o SCHEMA_OUTPUT, as decisões, o que foi resolvido pelo coordenador e as perguntas em aberto. Fontes de verdade curriculares em `docs/anexos/schema-institucional/`.

## Stack (fechada)

React + Vite + TypeScript · Tailwind · Supabase `sa-east-1` com RLS · magic link (e-mail institucional) · Supabase Realtime · Vercel · Anthropic API (só estruturação de texto colado na importação).

## Estrutura de pastas proposta

```
sessao-questoes/
├── README.md
├── docs/
│   ├── revisao-schema.md          # decisões e perguntas em aberto
│   ├── passo-2-fluxo-sessao.md    # como rodar; o que foi verificado
│   ├── passo-3-importacao.md      # Porta A/B; como rodar; o que foi verificado
│   └── anexos/                    # amostra real, SCHEMA_OUTPUT, tokens visuais
├── supabase/
│   ├── migrations/
│   │   ├── 20260724100000_schema_inicial.sql        # tipos e tabelas
│   │   ├── 20260724100100_funcoes_triggers.sql      # versão, código, profile
│   │   ├── 20260724100200_rls.sql                   # políticas
│   │   ├── 20260724100300_rpcs_realtime.sql         # mecânica da sessão
│   │   └── 20260724100400_contagem_participantes.sql # gap achado no passo 2
│   └── seed.sql                   # admins reais + domínio institucional
├── index.html · vite.config.ts · tsconfig*.json · tailwind.config.js
└── src/
    ├── lib/                       # api.ts (contrato), demoClient, supabaseClient,
    │                               # client.ts (seleção), types, identity, questoes-seed
    ├── ui/                        # kit.tsx — componentes base (tokens UNIDAVI, sem persona)
    └── features/
        ├── Home.tsx
        ├── sessao-professor/      # nova sessão, conduzir (abrir/avançar/travar/encerrar)
        ├── projecao/              # tela projetada: código, item, distribuição
        ├── sessao-aluno/          # entrar por código, responder, revisão
        ├── importacao/            # Porta A (JSON) e Porta B (colar, sem IA) + conferência
        │
        │  # ——— próximos passos ———
        ├── auth/                  # magic link real (hoje: identity.ts faz as vezes)
        ├── dashboards/            # professor/admin (agregados), aluno (próprio) e curadoria
        └── cards/                 # flashcards FSRS do aluno
```

Racional: organização por *feature* (não por tipo de arquivo) porque cada perfil usa um recorte distinto do app; quando o módulo for absorvido pelo ecossistema 2027, cada pasta de `features/` é uma unidade transplantável. `projecao/` separada de `sessao-professor/` porque são duas telas com critérios opostos (legibilidade da última fileira × controle do condutor) que podem rodar em janelas diferentes. `lib/api.ts` define o contrato único (`SessaoClient`); `demoClient` e `supabaseClient` são duas implementações — as telas não sabem qual está ativa.

Deploy: projeto Vercel próprio com *root directory* `sessao-questoes/` (este repositório hospeda também o app CCEM na raiz).

## Como rodar

```bash
cd sessao-questoes
npm install
npm run dev   # modo demo por padrão — ver docs/passo-2-fluxo-sessao.md
```

## Como aplicar as migrations (produção)

```bash
supabase link --project-ref <ref-do-projeto>   # projeto em sa-east-1
supabase db push
```

Depois: gerar tipos com `supabase gen types typescript`, trocar os `as any` em `supabaseClient.ts`, e definir `VITE_DATA_MODE=supabase` + `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (ver `.env.example`).

## Ordem de trabalho combinada

1. ✅ Estrutura + migrations — schema aprovado
2. ✅ Fluxo da sessão de ponta a ponta com dados de teste (as 40 questões reais)
3. ✅ Importação (Porta A: JSON no `SCHEMA_OUTPUT`; Porta B: colar + estruturar + conferir)
4. Dashboards e cards
