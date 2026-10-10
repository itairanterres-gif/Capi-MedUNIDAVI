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

## Rodar

Precisa ser servido por HTTP (o JSON é carregado com `fetch`):

    python3 -m http.server -d apps/sam 8080
    # abrir http://localhost:8080/painel-touch/

Fora do painel, o palco é reduzido para caber na janela; `?real=1` mostra em
tamanho real. `?dados=` e `?imagens=` trocam a fonte dos trabalhos.

## Verificação

    node apps/sam/painel-touch/verificar.mjs [pasta-de-capturas]

Abre cada pôster no tamanho real e:

1. **Integridade (bloqueia):** todo nó com texto do aluno (`data-campo`) é
   comparado caractere por caractere com o JSON, e o texto completo tem de
   aparecer inteiro na leitura. Qualquer diferença reprova e o script sai com
   erro.
2. **Sinalizações (não corrigem nada):** seções que não deu para separar,
   vitrine que precisa rolar, figura em baixa resolução, trecho repetido.
   Ficam para o aluno ou a curadoria decidir.

Resultado com o XI: `relatorio-xi.md`.

## Limitação conhecida dos dados do XI

As quatro seções chegaram unidas por linha em branco em `resumo`. Quando há
exatamente quatro blocos, cada um vai para sua seção; senão o texto aparece
inteiro, num bloco só, e o pôster é sinalizado (5 de 33). Na XII as seções já
devem ser gravadas em campos separados.
