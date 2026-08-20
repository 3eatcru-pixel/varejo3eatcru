# Feature Flags

Alternadores de funcionalidades ativados pela aba **Feature Flags e Parâmetros (Env)** no HQ.

Essas chaves ativam ou inibem sistemas do aplicativo sem necessitar de re-deploy do código fonte do servidor.
Operado pela rota `GET /api/feature-flags/resolve` que retorna os padrões lógicos baseados na hierarquia:

1.  Definição Global
2.  Assinatura da Empresa
