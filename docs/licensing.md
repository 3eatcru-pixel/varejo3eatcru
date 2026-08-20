# Licenciamento e Entitlements

Lógica Core: `LicenseService` (`server/services/license.service.ts`).

*   **Entitlement Resolution**: Combina os dados base de registro da empresa com o status de `platform_subscriptions`. Retorna objeto unificado do tipo `CompanyEntitlements` contendo Limites (Usuários, Terminais, Produtos, etc).
*   **Gatekeeping**: Rotas usam `checkResourceQuota` e `checkFeatureEntitlement`.
*   **Degradação Elegante**: O serviço detecta `TRIAL` expirado e converte silenciosamente a empresa para plano `FREE`, acionando as trancas de limite retroativas (impedindo adição de novos itens, mas sem deletar os existentes).

**Status**: IMPLEMENTADO.
