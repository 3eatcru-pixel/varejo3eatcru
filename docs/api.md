# Catálogo de APIs

O backend Express centraliza a lógica do aplicativo.

### Principais Endpoints

*   **Autenticação**: Não há (Sendo consumido JWT e Firebase Client).
*   **Empresas**:
    *   `GET /api/company/members`
    *   `POST /api/company/members/invite` (Auditado + Cotas limitadas)
    *   `GET /api/company/entitlements` (Consumo de Licenças e Quotas em Tempo Real)
*   **Dispositivos**:
    *   `POST /api/devices/register`
    *   `POST /api/devices/activate`
*   **Licenciamento & Vendas**:
    *   `POST /api/company/trial/start`
    *   `POST /api/sales` (Acesso limitado)
*   **HQ (Developer Console)**:
    *   `GET /api/hq/companies`
    *   `POST /api/hq/companies/:companyId/trial/extend`

*Nota*: Muitas requisições são marcadas como `requireApiAuth` (Validação de Token do Header).

**Status**: IMPLEMENTADO.
