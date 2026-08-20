# 🛍️ 3eatcru Varejo POS / ERP & SaaS Command Center (v10.2 Alpha — SaaS Foundation)

> **Sistema Completo de Gestão de Vendas (PDV Multi-Terminal), Estoque, Financeiro, Fiscal, Agenda de Serviços e Command Center SaaS (HQ)**  
> Desenvolvido com **React 18, Vite, Tailwind CSS, Express (Node.js/TypeScript), Drizzle ORM e PWA Offline Sync**.

---

## 📌 Visão Geral do Sistema

O **3eatcru Varejo** é uma plataforma empresarial projetada para operações de comércio varejista (multi-loja e multi-terminal) aliada a um **Command Center SaaS (HQ)** para gestão de empresas clientes, planos, faturamento recorrente, tickets de suporte, incidentes e feature flags em tempo real.

---

## 🏗️ Arquitetura e Tecnologias

### **Frontend**
* **Framework:** React 18 + Vite (TypeScript)
* **Estilização:** Tailwind CSS + Lucide React Icons
* **Gerenciamento de Estado & Cache:** React Contexts, IndexedDB, LocalStorage
* **PWA & Offline-First:** Service Worker (`sw.js`), Fila de sincronização e IndexedDB local com suporte a vendas offline, contingência fiscal e recálculo automático de estoque.

### **Backend**
* **Servidor:** Node.js com Express (TypeScript)
* **Persistência & Banco de Dados:** Drizzle ORM com transações atômicas, cálculos de preços no servidor, isolamento multi-tenant e idempotência de vendas.
* **Autenticação & Sessão:** JWT próprio com isolamento por tenant + RBAC granular + Rota e tabela dedicada `platform_admins` para o HQ (`/api/hq/auth/login`).
* **Licenciamento SaaS:** `LicenseService` com fonte da verdade canônica em `platform_subscriptions`, limites de cotas atômicas e controle de planos (`FREE`, `TRIAL`, `STARTER`, `PRO`, `BUSINESS`, `ENTERPRISE`).

---

## 🛡️ Destaques da Versão v10.2 Alpha

### **1. 3eatcru Varejo Command Center (HQ SaaS)**
Painel executivo completo para provedores do sistema com 11 módulos integrados:
* 📊 **Overview Executivo & Métricas**: MRR, ARR, Churn, contagem de empresas ativas, trial e suspensas.
* 🏢 **Gestão de Empresas & Licenças**: Configuração de limites por plano e status operacional com isolamento estrito de tenant.
* 📐 **Matriz de Planos & Recursos**: Planos unificados (`FREE`, `TRIAL`, `STARTER`, `PRO`, `BUSINESS`, `ENTERPRISE`).
* 💳 **Faturas & Cobrança SaaS**: Emissão de faturas, histórico de pagamentos e webhooks com assinatura HMAC-SHA256 e idempotência.
* 🛡️ **Sessão Auditada de Suporte ("Entrar como Empresa")**: Acesso assistido com registro obrigatório de motivo, expiração programada e logs de auditoria.
* 🎫 **Central de Chamados & Tickets**: Abertura, priorização e resolução de chamados de suporte técnico.
* 🚀 **Central de Lançamentos & Downloads**: Gerenciamento de versões desktop Windows (.exe) e Android (.apk).

### **2. PDV & Motor de Vendas**
* **Checkout Idempotente:** Total calculado autoritativamente no servidor evitando divergências de preço.
* **Sincronização Offline:** Service worker e fila de transações pendentes no IndexedDB.
* **Gestão Fiscal:** Módulo demonstrativo/homologação de NFC-e / NF-e com geração de XML e contingência.
