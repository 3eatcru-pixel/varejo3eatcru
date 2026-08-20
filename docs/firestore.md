# Coleções do Firestore

Base de dados central do sistema.

### Collections Identificadas
1.  `accounts`, `profiles`: Identidade do usuário.
2.  `company_memberships`: Vínculos Usuário <-> Lojas.
3.  `platform_companies`, `stores`: Organizações tenant.
4.  `user_invitations`: Convites pendentes aguardando aprovação.
5.  `company_devices`: Terminais registrados.
6.  `products`, `sales`, `cash_registers`, `stock_movements`, `stock_transfers`, `purchases`, `suppliers`, `clients`, `financial_records`, `refunds`: Cadastros de negócios.
7.  `sale_idempotency`, `refund_idempotency`: Prevenção de corrida/duplicação.
8.  `settings`, `audit_logs`: Telemetria.
9.  `pulse_qrcodes`, `pulse_analytics`: Módulo Pulse (Mkt).
