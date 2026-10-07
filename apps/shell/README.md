# Shell inicial do Capi MedUNIDAVI

Primeira entrada navegável no repositório canônico: Início → Sobre público por papel → retorno; acesso direto à Sessão de Questões. Não é ainda o shell longitudinal completo. Sem publicação nesta entrega.

```text
node apps/shell/server.mjs
```

Abrir `http://127.0.0.1:43130`. O comando escuta somente no computador local. Node 22+, sem instalação de dependências.

## Comportamento

- `/`: apresentação aprovada e acesso à Sessão de Questões em seu endereço conhecido. A conta é acessada no módulo; não se anuncia SSO.
- `/sobre`: artigo aprovado, navegação permanente e seletor editorial público por papel. Sem sessão própria, começa em visão geral.
- Um futuro host pode fornecer `resolveAudience(req)` a partir de contexto validado. Falha nessa leitura mantém acesso público à visão geral.
- Somente GET/HEAD e assets explicitamente listados. Não há formulários, APIs de autenticação, banco, cookies, importação do piloto de contas ou repasse de token/contexto para módulos.

O shell consome `packages/public-about/`. A prévia anterior também consome o mesmo pacote, sem duplicação do artigo ou dos assets. Não foram introduzidos estados fictícios de Retomar ou Trajetória como se fossem dados reais; a continuidade longitudinal depende de integrações posteriores.

## Origem e limites

Base A4: `7e7e32d`. Sobre aprovado: `09362de`. Branch desta etapa: `feat/capi-shell-entry`, derivada da branch de identidade aprovada, sem merge automático.

O protótipo histórico de Treino-enamed foi localizado como referência experimental, com dependências globais e telas simuladas; seu runtime não foi copiado. A3v.1 permanece referência experimental a recuperar especificamente. Este shell inicial reutiliza os estilos da prévia aprovada, sem reivindicar reprodução de A3v.1 ou revisão do personagem.

## Verificação

```text
node --test prototypes/identity-about/test/*.test.mjs apps/shell/test/*.test.mjs
```

Os testes comparam o artigo do shell com o artigo aprovado; verificam acesso público, contexto editorial opcional e falha segura, rotas internas indisponíveis, ausência de APIs/cookies e destino externo fixo sem repasse de query. Não testam login real ou operações no módulo externo.

Antes de publicar: revisão desta primeira entrada, configuração do host de destino e validação do fluxo de navegação. SSO, vínculo canônico, histórico de continuidade e inclusão dos demais módulos dependem de gates próprios. O próximo incremento funcional deverá escolher um fluxo real de continuidade e seu contrato de origem, sem criar um histórico paralelo no shell.
# Entrada compartilhada opcional

Na branch `feat/capi-shared-login`, o host também pode servir `/entrar` e o build separado do módulo em `/questoes/`. Ver [decisão, evidências e gates](../../docs/architecture/shared-login-pilot.md). Sem `CAPI_SHARED_LOGIN=1`, o comportamento público original permanece.

Com Node 22 ou superior, execute nesta pasta:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd test
```

Copie `.env.example` para `.env`, defina somente a chave **publishable** e o caminho absoluto do `dist` integrado, e inicie:

```powershell
node --env-file=.env server.mjs
```

O módulo precisa ser compilado em seu próprio repositório com `VITE_CAPI_INTEGRATED=1`, `VITE_DATA_MODE=supabase`, URL do projeto canônico e chave publishable. O manifesto gerado comprova compatibilidade de configuração, não assinatura/autenticidade do fornecedor; use exclusivamente builds revisados. O host não importa fontes nem node_modules do módulo.

Google fica desligado no shell até `CAPI_GOOGLE_ENABLED=1`, após revisão dos callbacks exatos. Senha usa Auth nativo e não requer callback. Recuperação/cadastro permanecem na interface do módulo e seus retornos precisam ser validados na nova origem antes de publicação.

Não usar esta prévia como endpoint público de produção. O servidor escuta somente loopback. A implantação requer origem HTTPS e revisão conjunta do build do shell/módulo. Tokens do SDK ficam no armazenamento nativo de navegador, nunca em URLs entre páginas.
