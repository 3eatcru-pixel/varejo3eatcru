# Multi-Tenancy

O VarejoPro assegura o isolamento de dados de múltiplos lojistas na mesma base através de roteamento por identificadores de empresa (`companyId`).

### Arquitetura de Relacionamento
```text
Usuário (User Auth UID)
 ↓ 1:N
Membership (collection: company_memberships)
 ↓ N:1
Empresa / Workspace (collection: platform_companies ou stores)
 ↓ 1:N
Filial (collection: branches)
 ↓ 1:N
Dispositivo (collection: company_devices)
```

### Isolamento no Backend
Quase todos os endpoints extraem o `companyId` atrelado ao usuário que fez a requisição diretamente através do token decodificado (garantindo que um usuário X só acesse a `companyId` em que está vinculado, ignorando o payload do request). O middleware intercepta `req.auth.companyId`.

### Isolamento no Frontend e DB
Todas as Collections de negócios (vendas, produtos, etc.) possuem o campo `companyId`. As Firebase Security Rules (`firestore.rules`) garantem que o usuário logado só consiga ler se a sua auth bater com o relacionamento em `company_memberships` (verificado via a function de security rule `isSameCompany(companyId)`).

**Riscos Identificados**:
O código em alguns endpoints pode vir a confiar em `req.body.companyId` em vez do valor retirado do token Auth. Nas refatorações mais recentes do `device.routes.ts`, foi corrigido para extrair o `companyId` validado.
