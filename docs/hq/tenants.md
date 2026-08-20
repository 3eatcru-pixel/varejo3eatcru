# Gerenciamento de Tenants e Contas (Empresas)

No HQ, os administradores de plataforma têm acesso à visão geral de todas as Empresas/Tenants cadastrados no sistema.

*   **API**: `GET /api/hq/companies`
*   **Visão Retornada**: O backend cruza a tabela primária das empresas com o módulo de subscrição (`LicenseService.getCompanyEntitlements`) e retorna em tempo real qual o Plano atual e os Limites de cada base.

O administrador da plataforma tem o poder de ver quem são os clientes e editar/bloquear unilateralmente as licenças ou trocar planos corporativos.
