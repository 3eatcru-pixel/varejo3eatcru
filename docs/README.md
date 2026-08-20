# VAREJOPRO — DOCUMENTAÇÃO DO PRODUTO

Bem-vindo à documentação oficial e mapa arquitetural do VarejoPro POS.

Este documento detalha o sistema inteiro, sendo atualizado com base na implementação *real* (o que o código faz, e não apenas o que ele promete).

## Identidade do produto
* **Propósito**: Sistema completo de Ponto de Venda (PDV), gestão de estoque, controle financeiro, faturamento fiscal e CRM para comércios varejistas.
* **Público**: Micro, pequenas e médias empresas do varejo (lojas de roupas, conveniências, mercadinhos, prestadores de serviços rápidos).
* **Modelo SaaS**: Multi-tenant, com contas gratuitas (Free), degustação (Trial) e assinaturas pagas por limite de usuários, dispositivos e módulos.
* **Principais Casos de Uso**:
  * Realizar vendas rápidas em balcão.
  * Emitir nota fiscal (NFC-e / NF-e).
  * Controlar estoque físico, entradas e saídas.
  * Gerenciar financeiro (caixa, DRE, contas a pagar e receber).
  * Atendimento e integração via pulse analytics.
* **Limites**: Definidos rigorosamente por plano (Número de filiais, PDVs, usuários e tamanho do catálogo).
* **Módulos Principais**: Vendas (POS), Estoque, Compras, Financeiro, Fiscal, Cadastros, Fidelidade/CRM, Relatórios, HQ (Plataforma).

## Índice da Documentação
* [Arquitetura](architecture.md)
* [Mapeamento de Módulos](modules.md)
* [Autenticação](authentication.md)
* [Autorização (RBAC)](authorization.md)
* [Multi-Tenancy](multi-tenancy.md)
* [Usuários e Equipes](users.md)
* [Dispositivos e Terminais](devices.md)
* [Ponto de Venda (PDV)](pos.md)
* [Estoque e Inventário](inventory.md)
* [Financeiro e DRE](finance.md)
* [Fiscal](fiscal.md)
* [Sincronização e Offline-First](offline.md)
* [Motor de Sincronização](synchronization.md)
* [Idempotência](idempotency.md)
* [Faturamento e Assinaturas](billing.md)
* [Licenciamento e Entitlements](licensing.md)
* [Catálogo de APIs](api.md)
* [Firestore Collections](firestore.md)
* [Security Rules](security-rules.md)
* [Testes](testing.md)
* [Dependências do Ecossistema](dependencies.md)
* [Risk Register](risks.md)
* [Código Legado e Débito Técnico](legacy.md)
* [Glossário](glossary.md)

---
*Para acessar a documentação de administração da plataforma (Platform Console), navegue até [HQ Documentation](hq/README.md).*

## Matriz Final de Avaliação

| Área | Implementado | Parcial | Mock | Legado | Risco | Observação |
| ---- | -----------: | ------: | ---: | -----: | ----- | ---------- |
| Frontend React | Sim | - | - | - | Baixo | Arquitetura SPA limpa |
| API Express | Sim | - | - | - | Médio | Dependência no authApi.ts local |
| Auth (Firebase) | Sim | - | - | Sim | Alto | Mistura com `localStorage` |
| Permissões (RBAC) | Sim | - | - | - | Baixo | Implementado via token e UI |
| Multi-tenant | Sim | - | - | - | Baixo | Seguro por token e Rules |
| Licenciamento | Sim | - | - | - | Baixo | Implementado no LicenseService |
| Estoque | Sim | - | - | - | Baixo | Completo |
| PDV (POS) | Sim | Sim | - | - | Médio | Depende de filas offline maduras |
| Offline-First | - | Sim | - | Sim | Médio | Faltam ServiceWorkers pesados |
| Idempotência | - | Sim | - | - | Baixo | Apenas em algumas rotas backend |
| Faturamento/Pagamentos| - | - | Sim | - | Médio | Sem gateway externo real |
| Emissão Fiscal | - | - | Sim | - | Baixo | Stub local |
| VarejoPro HQ | Sim | Sim | - | - | Médio | Ferramenta madura mas o Billing é mock |


## Status por Módulo

| Módulo | Frontend | Backend | Banco | API | Auth | RBAC | Offline | Status |
| ------ | -------- | ------- | ----- | --- | ---- | ---- | ------- | ------ |
| Administrativo | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🔴 | Implementado |
| Caixa / POS | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡 | Parcial |
| Estoque | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🔴 | Implementado |
| Cadastros | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🔴 | Implementado |
| Compras | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🔴 | Implementado |
| Financeiro | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🔴 | Implementado |
| Fiscal | 🟡 | 🟡 | 🟡 | 🟡 | 🟢 | 🟢 | 🔴 | Mock/Parcial |
| Fidelidade | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🔴 | Implementado |
| Assinaturas | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🔴 | Implementado interno |
| VarejoPro HQ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🔴 | Implementado |
