# Para a frente principal do SAM

Esta pasta não está ligada ao app. Guarda o que foi feito e testado nesta
branch para ser levado à branch principal do SAM, quando for decidido.

## Revisão para o painel (submissão e curadoria)

- `revisao.js`: vai em `apps/sam/site/`. Só aponta, nunca altera o texto nem
  impede o envio: campos não preenchidos, parágrafo colado em dobro (25+
  palavras), extensão fora de 250–400 palavras, objetivo longo para a vitrine,
  figura pequena para o painel ou sem título/legenda.
- `ligacao-submissao-curadoria.patch`: as quatro mudanças que ligam a caixa de
  avisos no formulário (acima de "Enviar trabalho") e na ficha da curadoria
  (acima da decisão editorial). Feito sobre o `main` em 9de114a; se não
  aplicar limpo, refazer à mão: são 4 trechos curtos.
- Testado: build do `/sam/` passa; caixa de avisos testada no formulário; nos
  pôsteres do XI achou os 2 parágrafos em dobro e 7 figuras com menos de
  600 px. A ficha da curadoria não foi testada (exige login).

## Decisões em aberto (aguardando o Merhan)

- **Tamanho:** 55", 65" ou 75", em pé. O software não muda se forem 4K. Em
  65"/75" a navegação deve ir para a metade de baixo da tela (o topo de um 75"
  em pedestal passa de 2 m).
- **Quantidade:** 8 painéis (um pôster por painel, o dia todo; o XI teve 6–7
  pôsteres por dia) ou mínimo de 4 (2 pôsteres por painel por dia, como na
  edição passada; os dois precisam se apresentar em horários diferentes).
- **A implementar depois da decisão:** modo de painel fixo. Com 8 painéis,
  cada painel abre no pôster atribuído e volta a ele quando ocioso; com 4,
  abre numa escolha entre os 2 do dia. A atribuição painel × pôster × dia sai
  da programação no banco.
- **Confirmar no equipamento:** 4K, sistema e navegador (modo quiosque), toque
  múltiplo para a pinça, e conteúdo guardado no próprio painel, sem depender
  da rede do auditório.
