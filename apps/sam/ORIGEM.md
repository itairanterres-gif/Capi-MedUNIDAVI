# SAM (Semana Acadêmica) dentro do Capi

## Origem

Trazido em 09/10/2026 do repositório `itairanterres-gif/xi-sam-unidavi-v2`:
- base: `main` em `8496824eb671455ef079ef04347c7977c877874f` (inclui as correções de segurança do PR #1 e a do telão);
- mais o trabalho de integração com o Capi (clone local `sam-integracao-local`,
  branch `integracao-capi-supabase`, `c8335543984049990371e30f4f0db9d157db490c`): adaptador `sam-backend.js`,
  `sam-config.js`, `vendor/supabase-js-2.110.8.js` e telas no modo Capi.

A partir daqui, `apps/sam/` é a fonte do SAM. O site antigo continua publicado
à parte até a aprovação da XII no Capi.

## Como funciona

- `site/`: o site original (JSX compilado no navegador, como no Claude Design).
- `build.mjs`: pré-compila para `dist/` (ignorado no Git). Troca Babel e CDN por
  JS pronto e por `site/vendor/` (React 18.3.1, KaTeX 0.16.11, qrcode-generator
  1.4.4 e supabase-js 2.110.8), tira scripts inline e o login Google próprio do
  SAM. Assim o `/sam/` segue a CSP do Capi; só as fontes do Google ficam liberadas.
- Publica só as páginas `index`, `edicao`, `submissao`, `curadoria`, `telao` e
  `material`. Painéis de LED, prévias, bateria e demonstrações ficam fora.
- Ligado por `CAPI_SAM_ENABLED=1` (desligado na publicação até o banco existir).
  `sam-config.js` é escrito pelo Capi: mesmo Supabase, mesma sessão do `/entrar`.
- Local: `node scripts/local-integrado.mjs` (stack Supabase de loopback, porta 43142).

## Banco

`supabase/20261008120000_sam_xii.sql` é a proposta (ainda não aplicada em
produção) e `supabase/testes_acesso_sam.sql` os testes de acesso, sempre dentro
de `begin; … rollback;`. Dados de origem e contas de teste não entram aqui.
