# Autorização e RBAC

O controle de acesso baseado em papéis (RBAC) opera com as seguintes Roles mapeadas na interface `CompanyRole`:

*   **OWNER**: Proprietário.
*   **ADMIN**: Administrador de loja.
*   **MANAGER**: Gerente de Filial.
*   **CASHIER**: Operador de Caixa.
*   **STOCK**: Estoquista/Compras.
*   **VIEWER** (Visualizador/Auditor).

As roles são transformadas num conjunto de "Permissions" detalhadas pelo `PermissionManager` (ou similares):

| Função | manageStock | posAccess | manageFinancial | viewReports | cancelSale |
| :--- | :--- | :--- | :--- | :--- | :--- |
| OWNER | Sim | Sim | Sim | Sim | Sim |
| ADMIN | Sim | Sim | Sim | Sim | Sim |
| MANAGER | Sim | Sim | Sim | Sim | Sim |
| CASHIER | Não | Sim | Não | Não | Não |
| STOCK | Sim | Não | Não | Não | Não |

### Implementação (Frontend)
Componente `<ProtectedRoute />` engloba partes da view e avalia `permission="posAccess"`.

### Implementação (Backend)
`requirePermission(perm)` é um middleware que verifica o JWT Token. Entretanto, a estrutura `userProfile` contendo o ID da empresa ou Role é ocasionalmente enxertada no request.

**Status Global**: IMPLEMENTADO.
