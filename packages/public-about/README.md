# Camada pública compartilhada

Conteúdo aprovado por Itairan em 22/09/2026, após a correção que retirou pendências do Canon. A revisão visual ocorre em outra conversa; o retrato existente é preservado, sem nova decisão visual nesta etapa.

`index.mjs` mantém o renderer do Sobre e a exportação da redação integral. Fonte textual única: `docs/product/about-content.json`. Não importa `canon-catalogue.json` nem contratos históricos. `assets.mjs` declara somente as três rotas públicas de CSS e retrato.

Consumidores: `apps/shell/` e o adaptador de compatibilidade `prototypes/identity-about/about.mjs`. O shell fornece navegação e rótulo do estágio, mantendo o artigo aprovado idêntico. O parâmetro `navigation` é HTML produzido pelo host confiável, nunca entrada do usuário; textos e perspectivas são escapados/validados.

`selectPerspective(requested, contextual)` recebe contexto editorial opcional do host. A escolha do leitor só muda o texto; não autentica, atribui papéis ou autoriza ações. Um host futuro deve obter `contextual` do seu contexto validado, nunca inferir coordenação de `admin`.

As URLs dos assets e da navegação assumem montagem na raiz do host. Um adaptador para subdiretório deverá definir esse contrato explicitamente. O pacote não consulta Supabase, não cria sessões e não seleciona referências históricas por IA.
