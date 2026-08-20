# Mapa Completo de Módulos

## MÓDULO: Administrativo (`/src/modules/administrativo`)
### Objetivo
Gerenciar a conta da empresa, assinaturas (billing), parametrização (branding) e convites de operadores.
### Arquivos
`CompanyBrandingSettings.tsx`, `DriveStorageVault.tsx`, `FiscalSettings.tsx`, `PermissionsMatrix.tsx`, `Settings.tsx`, `UserManager.tsx` (Dentro de `/usuarios`).
### APIs
`/api/company/members`, `/api/company/members/invite`, `/api/company/members/:id/role`.
### Permissões
Geralmente restrito a `ADMIN` ou proprietário da conta (`adminOnly`).
### Status
IMPLEMENTADO. O UserManager integra ativação de limite de cotas do SaaS.

## MÓDULO: Caixa / POS (`/src/modules/caixa` & `/src/modules/vendas/Checkout.tsx`)
### Objetivo
A frente de caixa propriamente dita (abertura, fechamento de turno, venda de itens em carrinho, finalização com múltiplos meios de pagamento).
### Arquivos
`CashRegisterView.tsx`, `Checkout.tsx`, `CheckoutOfflineAlert.tsx`, `SalesManager.tsx`, `DevolucoesManager.tsx`.
### APIs
`/api/cash-registers/*`, `/api/sales`, `/api/refunds`.
### Banco
`cash_registers`, `sales`, `sale_idempotency`.
### Status
IMPLEMENTADO + PARCIAL. Fluxo de fechamento de caixa existe, mas depende de conexão. O modo offline possui componentes de UI (ex: `CheckoutOfflineAlert`), mas o enfileiramento pesado é parcialmente MOCK na emissão fiscal final.

## MÓDULO: Estoque (`/src/modules/estoque`)
### Objetivo
Gerir catálogo de produtos e registrar entradas/saídas (movimentações), inventários, ajustes e transferências entre filiais.
### APIs
`/api/stock/*`
### Banco
`products`, `stock_movements`, `stock_transfers`.
### Status
IMPLEMENTADO.
