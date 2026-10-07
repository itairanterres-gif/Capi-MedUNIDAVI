# Campos Pages Git import — candidato local, não publicado

Conta escolhida: UNIDAVI. Repositório selecionado informado pelo usuário:
`itairanterres-gif/Capi-MedUNIDAVI`. A leitura institucional confirmou `main`
em `7e7e32df95a27dfabea6ac3a9d4d73cdf30f5a31`, base deste checkout isolado.
`capi-medunidavi.pages.dev` é nome proposto na tela, não hostname criado/verificado.

| Campo | Valor para este candidato, após envio autorizado das alterações |
|---|---|
| Framework preset | None |
| Root directory (advanced) | vazio — raiz do repositório |
| Build command | `npm run build:pages` |
| Build output directory | `apps/shell/hosted-dist` |
| Production branch | a branch que contiver o candidato revisado; não foi verificada remotamente |
| `SKIP_DEPENDENCY_INSTALL` | `1` |
| `NODE_VERSION` | `22.23.2` (também fixado em `.node-version`) |
| `CAPI_PUBLIC_ORIGIN` | `https://capi-medunidavi.pages.dev`, somente se essa origem proposta for confirmada/aprovada |
| `CAPI_APPROVED_PUBLIC_ORIGIN` | a mesma origem exata confirmada/aprovada |
| `CAPI_SUPABASE_PUBLISHABLE_KEY` | chave `sb_publishable_…` já existente do Supabase Sessão; valor não consultado nem configurado |

Não usar saída `/`, build vazio, `sb_publishable_fixture`, `sb_secret_…`,
service_role ou flags de homologação. Não selecionar `build:pages:fixture`
no Cloudflare. O script recusa fixture em CI/Pages e chave fixture no build Git.
Não deriva aprovação da variável automática `CF_PAGES_URL`.

## Estrutura preparada

O comando da raiz instala dependências com `npm ci --include=dev` em
`apps/sessao` e `apps/shell`, usando os dois locks preservados. Depois executa
TypeScript/Vite integrado e o gerador Pages do Capi. Só as instalações futuras
do builder precisam do registry npm; a verificação local usou dependências
já copiadas, sem executar npm ci ou baixar ferramentas.

Todos os caminhos de insumos são calculados a partir deste checkout:
`apps/sessao/dist-pages`, `build-inputs/amrigs/images` e
`build-inputs/amrigs/manifest.json`. Não há submodule, fetch Git, mirror externo
ou caminho absoluto do computador configurado no build.

O manifesto aprovado contém apenas hashes das 31 figuras, contagem/status de
477 drafts e SHA256 do pacote original; não contém questões ou respostas.
Seu hash é conferido no código e o arquivo usa LF explícito via `.gitattributes`.
O pacote completo de 477 questões continua intacto no diretório original.

O seed legado da Sessão não foi incluído nesta cópia de hospedagem: resta
apenas seu contrato de tipos e array vazio. O build integrado mantém os
adapters demo desabilitados; fonte e comportamento standalone dos repositórios
originais não foram editados. Auth, storageKey, Supabase e dados continuam
canônicos. O script usa uma única publishable para os dois bundles e força
modo Supabase, `/questoes/`, Google desabilitado e as regras Pages já verificadas.

## Verificações e bloqueios

Comando local: `npm run build:pages:fixture`. Testes: `npm run test:pages`.
O modo fixture é apenas para revisão; mantém origem reservada `.invalid`.
Build final e hashes são registrados em `RESULTADOS-GIT-LOCAL.json`.

Ainda bloqueiam Save and Deploy:

1. Este candidato existe somente no computador, em branch local de preparação;
   não houve push nem confirmação da árvore final no GitHub. O Git import não recebe estes
   arquivos enquanto não houver envio autorizado.
2. A publishable existente não foi fornecida/configurada. Fixture não autentica.
3. Origem real e escopo de publicação precisam de confirmação/aprovação.
4. O recorte AMRIGS ainda tem a etapa de banco/ativação pendente no STATUS
   anterior; não foi executada nem autorizada por esta preparação.

Instalação limpa no registry/Linux e execução efetiva no Cloudflare não foram
testadas. Foram conferidos os locks, inclusive o esbuild Linux, e o build local
com as dependências copiadas. Nenhuma credencial, conta, projeto, SQL ou produção
foi alterado. Save and Deploy publica; não é um botão de mera revisão.

Documentação oficial consultada:
https://developers.cloudflare.com/pages/configuration/build-configuration/
https://developers.cloudflare.com/pages/configuration/build-image/

## Publicação das imagens — pendência concreta

As 31 imagens aprovadas por hash são recortes de questões de prova, com
enunciados e alternativas; `2024/q060_pagina17_integral.png` contém a página
inteira, incluindo as questões 59–62. Não são apenas diagramas sem texto.
O arquivo JSON das 477 questões não está no commit, mas enviar esses PNG a
um repositório público torna seu conteúdo público independentemente do
status draft/RLS do catálogo. O preparo local mantém os arquivos intactos;
a decisão de envio público precisa considerar essa exposição concreta.
Não foi refeita uma auditoria editorial ou jurídica.
