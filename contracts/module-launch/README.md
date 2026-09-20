# Contrato conceitual de lançamento de módulos

Durante a transição, módulos podem exigir reautenticação própria. A navegação entre eles não deve ser apresentada como SSO enquanto uma federação real, validada e autorizada não existir.

## Direção futura

O lançamento integrado deverá usar contrato ou ticket apropriado, de curta duração, finalidade limitada e validação explícita. O desenho concreto pertence a uma fase posterior de segurança e identidade.

Invariantes:

- nunca passar token em URL;
- não confiar em contexto de navegação como prova de identidade;
- cada módulo continua responsável por validar autenticação e autorização;
- falhas devem resultar em estado seguro e possibilidade clara de nova autenticação;
- telemetria e correlação não devem expor credenciais ou dados pessoais.

Este documento não cria mecanismo de lançamento, sessão compartilhada ou configuração OAuth.
