Operações remotas futuras — proposta para uma aprovação única, ainda não executada.

1. No Supabase existente `ggjxbumtnizaeomioves`, confirmar com leitura o schema
   AMRIGS, helper `capi_amrigs_authorized()` e RLS revisados. Se ausentes, aplicar
   somente o candidato AMRIGS já revisado pelo responsável, identificado por seu
   hash; não executar os upgrades de fixtures usados nos ensaios locais. Não
   alterar M0a/Auth, matrículas, status, ENAMED ou promover os 477 drafts.
2. Conferir políticas Storage existentes, suporte a
   `storage.allow_only_operation('object.get_authenticated')`, capacidade/cota
   disponível e inexistência de conflito com o nome proposto. Aplicar exatamente
   a proposta `private-images.sql` revisada: manifesto de 31 hashes, política de
   leitura e guarda restritiva. Abortará se dependências estiverem ausentes.
3. Criar pelo Storage API um único bucket `capi-amrigs-private`, `public=false`,
   somente PNG, limite 10 MB por objeto. Com acesso confiável já existente,
   carregar os 31 arquivos originais sob prefixo do SHA256 do pacote, sem
   transformação e sem upsert/reescrita silenciosa. Não criar chaves ou grants
   de upload para o navegador. Conferir SHA256 dos downloads.
4. Verificar com sessões autorizadas existentes: aluno elegível + questão
   liberada recebe objeto; sem matrícula, staff/egresso, anônimo, sessão expirada,
   draft ou outro contexto são negados. Listagem, URL pública, assinatura e
   INSERT/UPDATE/DELETE pelo cliente devem ser negados. O manifesto nasce com
   `delivery_enabled=false`: habilitar cada objeto somente se todo conteúdo
   embutido estiver liberado. A página integral q060 contém questões 59–62;
   liberar apenas a questão vinculada não autoriza o restante da página.
   Sem correspondência completa, manter esse objeto negado e a resposta bloqueada. Não publicar itens só
   para realizar esse teste; usar fixture controlada/conta de ensaio existente
   dentro do escopo aprovado, ou manter gate se isso não for possível.
5. Só após evidência hospedada: registrar contrato verificado (bucket/prefixo),
   revisar e substituir a trava de produção local. Remover cópia estática de
   imagens do caminho de produção; a fixture continua somente local. Reconstruir
   com a publishable existente e verificar output sem qualquer PNG reservado.
6. Na conta UNIDAVI, criar/configurar o Pages com os campos de
   `CLOUDFLARE-GIT-FIELDS.md`, origem confirmada e branch revisada. Ajustar somente
   os callbacks/redirect allowlist necessários da origem no Auth existente, sem
   novo provedor. Executar o primeiro deploy somente sob esta aprovação futura,
   depois validar login por senha, sessão compartilhada, rotas e Storage real.

O envio da branch de código é autorizado separadamente e não executa os itens
acima. Não há garantia geral de inexistência de webhooks; não foi identificado
trigger, e o usuário confirmou que nunca publicou Capi deste repositório.
Nenhum custo adicional/plano pago é aprovado por este documento: se a cota
existente for insuficiente, interromper antes de contratar ou ampliar serviço.

Limites do recorte local: 31 imagens e manifesto preservados; nenhuma questão
publicada. Os testes simulam Auth/Storage/DOM. Não certificam RLS, schema SQL,
revogação de JWT já emitido ou funcionamento no Cloudflare. Revogar Blob URLs
remove o acesso da interface, mas não recupera pixels já vistos por um usuário.
