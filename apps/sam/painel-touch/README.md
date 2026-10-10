# SAM · painel touch 55" (protótipo)

Exibição dos pôsteres em painel touch de 55" em pé (palco 1080×1920, 4K em
escala 2×), testada com os 33 pôsteres do XI SAM (`../site/xi_sam.json`).

**Regra inegociável:** o texto do aluno aparece exatamente como foi submetido.
Nenhuma IA ou código resume, corta ou reescreve texto, e a fonte não encolhe
para caber. O que não cabe rola ou abre com um toque.

## Telas

- **Galeria:** todos os pôsteres, com filtro por área.
- **Vitrine:** título, autores, figura principal ★ e objetivo, legíveis a
  distância. Botões para a leitura completa e para as figuras.
- **Leitura:** texto completo por seção, figuras na seção escolhida pelo aluno,
  palavras-chave e referências. Atalhos por seção e "A / A+" (dois tamanhos
  fixos, escolhidos pelo visitante).
- **Figura ampliada:** pinça, arrasto, toque duplo e botões + / −.
- Depois de 2 minutos sem toque, volta à galeria.

## Revisão: antes, na submissão e na curadoria

A revisão acontece antes do painel. `../site/revisao.js` mostra avisos:

- na **submissão**, acima do botão de enviar, enquanto o aluno preenche;
- na **ficha da curadoria**, acima da decisão editorial.

Os avisos são campos não preenchidos, parágrafo colado em dobro (25+ palavras
repetidas), extensão fora de 250–400 palavras, objetivo longo demais para a
vitrine, figura pequena para o 55" ou sem título ou legenda. Eles nunca alteram
o texto nem impedem o envio: o aluno corrige se quiser e a curadora decide
entre liberar e devolver.

O painel exibe só trabalhos com `statusCuradoria` igual a `publicado`.

## Rodar

Precisa ser servido por HTTP (o JSON é carregado com `fetch`):

    python3 -m http.server -d apps/sam 8080
    # abrir http://localhost:8080/painel-touch/

Fora do painel, o palco é reduzido para caber na janela; `?real=1` mostra em
tamanho real. `?dados=` e `?imagens=` trocam a fonte dos trabalhos.

## Verificação

    node apps/sam/painel-touch/verificar.mjs [pasta-de-capturas] [--dados=site/outro.json]

É a última barreira antes do evento: abre cada pôster liberado no tamanho
real e:

1. **Integridade (bloqueia):** todo nó com texto do aluno (`data-campo`) é
   comparado caractere por caractere com o JSON, e o texto completo tem de
   aparecer inteiro na leitura. Qualquer diferença reprova e o script sai com
   erro.
2. **Sinalizações (não corrigem nada):** seções que não deu para separar,
   vitrine que precisa rolar, figura em baixa resolução, trecho repetido.
   Ficam para o aluno ou a curadoria decidir.

Resultado com o XI: `relatorio-xi.md`.

## Seções

A XII grava cada seção no seu campo (`introducao`, `objetivos`, `metodos`,
`resultados`, `conclusao`), e o painel usa esses campos. No arquivo do XI as
seções chegaram unidas por linha em branco em `resumo`: quando há exatamente
quatro blocos, cada um vai para sua seção; senão o texto aparece inteiro, num
bloco só, e o pôster é sinalizado (5 de 33).
