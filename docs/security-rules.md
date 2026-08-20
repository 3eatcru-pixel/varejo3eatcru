# Security Rules (Regras de Segurança)

As regras de segurança (`firestore.rules`) protegem a persistência no Client SDK.

### Defesa de Transações
Collections vitais como `sales`, `cash_registers`, `stock_movements`, `financial_records` têm a instrução imperativa:
```json
allow create, update, delete: if false;
```
Isso força obrigatoriamente que as inserções ocorram pela API em Node.js (via Server Auth/Admin SDK), onde as regras de Cota (RBAC/Licenciamento) e Integridade de Dados podem ser aplicadas.

### Vazamentos Cruzados
Para leitura, a função `isSameCompany(companyId)` usa lookup na collection de memberships. Como as queries devem filtrar o ID, um tenant não consegue puxar dados do banco de outro.

**Status**: IMPLEMENTADO + BEM CONSTRUÍDO.
