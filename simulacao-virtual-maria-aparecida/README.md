# Simulação clínica virtual — Maria Aparecida

Estação de simulação clínica **virtual**, com paciente virtual gerado por IA, para o
internato da 12ª fase do Curso de Medicina da UNIDAVI. Caso: mulher de 61 anos com
DM2, alto risco cardiovascular e doença renal do diabetes, em consulta de retorno no SUS.

Trabalho acadêmico do Mestrado Profissional em Saúde e Gestão do Trabalho (UNIVALI-UNIDAVI),
disciplina Tópico Especial III — Uso de simulação no ensino.
Autores: Itairan da Silva Terres e Silvia Rozauria Froes Toniazzo.

> **Uso formativo.** Esta estação não produz nota. A pré-marcação do checklist é
> feita por IA e só tem valor depois de revisada por um preceptor humano. O
> debriefing é humano, conduzido pelo professor.

---

## O que a estação faz

Cinco telas, na ordem em que o interno as percorre:

1. **Briefing** — tarefa, regras de segurança psicológica e confidencialidade, aviso
   de registro formativo, aviso de que a paciente é uma IA e de que nenhum dado real
   deve ser digitado.
2. **Consulta (15 min)** — conversa com a paciente virtual, painel lateral com o laudo
   de exames (atual e de 4 meses atrás) e a cartela de medicamentos, cronômetro visível.
   Ao zerar, a paciente encerra a cena conforme o roteiro. Modo de voz opcional
   (Web Speech API, pt-BR), com retorno para texto quando o navegador não suporta.
3. **Feedback** — a paciente sai de cena. Uma chamada separada, em papel de avaliador,
   pré-marca os 12 itens do checklist em NR/I/PA/A. Cada marcação cita um trecho
   literal da transcrição ou declara `sem evidência na transcrição`. O cabeçalho da
   tela diz: *Pré-marcação para revisão docente — não é nota*.
4. **Segunda tentativa (5 min)** — o interno escolhe um dos três momentos e o refaz.
   A paciente retoma a cena a partir daquele gatilho, sem memória da tentativa anterior.
5. **Exportação** — transcrição das duas tentativas, checklist (IA × docente) e falhas
   técnicas, em `.md` e `.json`.

E uma tela para o docente:

- **`/preceptor`** — transcrição ao vivo e checklist editável. O docente sobrescreve as
  pré-marcações da IA e registra falhas técnicas em campo próprio.

---

## Como rodar localmente

Requer Node 20 ou superior.

```bash
npm install
cp .env.example .env.local        # e preencha ANTHROPIC_API_KEY
npm run dev                       # http://localhost:3000
```

Abra `http://localhost:3000` para o interno e `http://localhost:3000/preceptor` em
outra aba **do mesmo navegador, na mesma máquina**, para o preceptor.

Outros comandos:

```bash
npm run build       # build de produção
npm run typecheck   # tsc --noEmit
npm run testes      # consultas de teste contra a API (ver abaixo)
```

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Para quê |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | sim | — | Autenticação na API da Anthropic. **Só no servidor.** |
| `ANTHROPIC_MODEL` | não | `claude-sonnet-5` | Modelo usado pela paciente e pelo avaliador. |
| `MAX_TOKENS_PACIENTE` | não | `400` | Teto de tokens por turno da paciente. |
| `MAX_TOKENS_AVALIADOR` | não | `2000` | Teto de tokens da pré-marcação. |

A chave **nunca chega ao navegador**: ela é lida apenas em `lib/anthropic.ts`, que só é
importado pelas rotas `app/api/chat` e `app/api/avaliador`. Não existe nenhuma variável
`NEXT_PUBLIC_*` neste projeto, e o cliente conversa apenas com as rotas internas.

## Deploy na Vercel

1. Importar o repositório na Vercel. Se o projeto estiver dentro de um monorepo,
   apontar o **Root Directory** para `simulacao-virtual-maria-aparecida/`.
2. Em *Settings → Environment Variables*, criar `ANTHROPIC_API_KEY` (e, se quiser,
   `ANTHROPIC_MODEL`). Não marcar como variável exposta ao cliente.
3. Deploy. O framework é detectado automaticamente (Next.js App Router).

Sem banco de dados: não há nada para provisionar.

---

## Consultas de teste

`npm run testes` roda quatro consultas contra a API usando **exatamente os mesmos
prompts da aplicação** (`lib/persona.ts` e `lib/avaliador.ts`), com falas de interno
escritas em `testes/roteiros.ts`. Cada consulta gera uma transcrição em
`testes/transcricoes/` e um resumo em `testes/transcricoes/RESUMO.md`.

Os quatro perfis:

- **(a) interno excelente** — acolhe o medo, faz o raciocínio cardiorrenal, nomeia a
  classe, resolve o acesso, fecha com síntese;
- **(b) interno glicocêntrico** — só olha a HbA1c;
- **(c) interno que ignora o medo da diálise** — vai direto à prescrição;
- **(d) interno que pede dica à paciente** e tenta arrancar dados fora do roteiro.

Verificações automáticas em cada transcrição (`testes/verificacoes.ts`):

- a paciente **não inventa dado clínico** (nenhum número fora do caso nas falas dela);
- a paciente **não ensina** (nenhum termo técnico nem sugestão de conduta nas falas dela);
- a paciente **não sai do personagem**;
- os **gatilhos esperados disparam** (1, 2 e 3 nos roteiros a–c; ao menos o 1 no roteiro d,
  que nunca chega a propor tratamento);
- o **avaliador cita evidência literal** em cada um dos 12 itens, ou declara
  `sem evidência na transcrição` — o texto citado é procurado na transcrição real.

```bash
ANTHROPIC_API_KEY=... npm run testes
ANTHROPIC_API_KEY=... npm run testes -- a-interno-excelente   # um roteiro só
```

<!-- TRECHOS-TESTES -->

---

## Como a coerência do arco é mantida

O estado dos três momentos (disparado, acolhido, compreendido, resolvido) vive em
**estrutura no servidor** (`lib/sessao.ts`), não apenas no histórico da conversa. A cada
turno, a paciente emite uma última linha de controle (`[[ESTADO: ...]]`) que o servidor
lê e **remove antes de qualquer texto chegar ao interno**; o estado consolidado é
reinjetado no prompt do turno seguinte.

Em ambiente serverless, a memória do processo pode ser perdida entre requisições. Por
isso o cliente também devolve o último estado conhecido e o servidor funde os dois,
sempre pelo máximo: um momento já disparado nunca "desdispara". O cliente não é a fonte
da verdade — ele é apenas uma rede de segurança.

## Decisões registradas

- **Onde o projeto vive.** O enunciado pede um app independente, fora de repositório de
  produto. O acesso desta sessão de trabalho está limitado ao repositório `Capi-MedUNIDAVI`,
  então o app foi criado como um diretório **autônomo** dentro dele: `package.json`,
  `tsconfig.json`, dependências, build e deploy próprios, sem importar nada do repositório
  hospedeiro e sem ser importado por ele. Ele pode ser extraído para um repositório próprio
  com um `git subtree split`, sem alterações de código. **Não é parte do produto CAPI.**
- **Marcador de estado em vez de tool use.** O arco poderia ser mantido com *tool use* ou
  saída estruturada, ao custo de uma segunda chamada ou de um esquema maior por turno. O
  marcador de uma linha resolve o mesmo problema dentro da mesma chamada e é removido antes
  de exibir. O custo é ter de confiar no modelo para emiti-lo; quando ele não vem, o estado
  anterior é preservado, e o pior caso é um gatilho que demora um turno a mais.
- **Prefill `{` no avaliador.** A resposta do avaliador é forçada a começar por `{` para
  reduzir a chance de texto fora do JSON. O parser ainda tolera cerca de código.
- **Verificação local da evidência.** O sistema confere se o trecho citado pela IA existe
  literalmente na transcrição e marca com ⚠ quando não existe. Isso não substitui o
  preceptor: é um alerta de que aquela linha merece atenção.
- **Sem banco de dados.** Não há persistência em servidor. A transcrição vive na memória do
  navegador e sai como arquivo. Isso é uma decisão de minimização de dados, não uma
  simplificação.
- **A segunda tentativa não herda o histórico.** Ela retoma o gatilho escolhido com estado
  zerado, para que o interno refaça o momento — e não continue a mesma consulta.
- **Primeira fala do interno pré-preenchida.** A abertura ("Bom dia. Sou o médico que vai te
  atender hoje. Como a senhora está?") é enviada automaticamente para que a paciente já entre
  em cena tensa e o cronômetro comece a valer. O interno assume a consulta do segundo turno
  em diante.

## Limites da modalidade

- **Fidelidade ambiental e não verbal: baixa.** A estação não captura postura corporal,
  expressão facial, silêncio, olhar, ritmo de fala. O que era gesto virou marcador verbal;
  o modo de voz recupera prosódia, e só.
- **Fidelidade psicológica e conceitual: moderada a alta.** O conflito da cena e a verdade
  clínica são preservados.
- **Variabilidade.** O modelo não é um paciente padronizado. Duas sessões não são idênticas.
  O estado estruturado reduz a variação do arco, não a elimina.
- **O modelo erra**, inclusive na pré-marcação do checklist. Por isso ela é sempre
  apresentada como pré-marcação, com evidência citada e com verificação local do trecho.
- **Dependência técnica.** A estação exige internet e uma API externa; uma indisponibilidade
  interrompe a cena. Falhas técnicas são registradas em campo separado das dificuldades do
  estudante, e essa separação é deliberada: latência e erro de API não são desempenho do interno.
- **`/preceptor` funciona na mesma máquina.** A ponte é `BroadcastChannel` com espelho em
  `localStorage`; não há servidor de estado. Para o preceptor acompanhar de outro computador
  seria preciso um canal de rede, que este projeto deliberadamente não tem.

## Estrutura

```
app/
  page.tsx               orquestra briefing → consulta → feedback → 2ª tentativa → exportação
  preceptor/page.tsx     transcrição ao vivo + checklist editável
  api/chat/route.ts      paciente virtual (servidor)
  api/avaliador/route.ts pré-marcação do checklist (chamada separada, servidor)
components/              Briefing, Chat, Cronometro, PainelExames, Feedback, ChecklistEditavel
lib/
  caso.ts                verdade clínica do caso — fonte única
  persona.ts             system prompt da paciente + estado estruturado do arco
  avaliador.ts           prompt do avaliador + leitura e verificação das marcações
  checklist.ts           os 12 itens
  sessao.ts              estado por sessão no servidor, custo, durações
  exportar.ts            .md e .json
  canal.ts               ponte interno ↔ preceptor
  voz.ts                 Web Speech API (pt-BR)
testes/                  roteiros, verificações, runner e transcrições
```

## Custo

Cada resposta da paciente é limitada por `MAX_TOKENS_PACIENTE` (400 por padrão) e a
pré-marcação por `MAX_TOKENS_AVALIADOR`. A aplicação conta chamadas, tokens de entrada e
saída e tempo de API, exibe o total na tela de fechamento e na tela do preceptor, e inclui
esses números na exportação. Uma consulta completa de 15 minutos costuma ficar na ordem de
15 a 25 chamadas, mais uma do avaliador.
