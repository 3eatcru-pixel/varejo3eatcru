# 3eatcru Varejo Architecture Vision

## Identidade da Plataforma
O **3eatcru Varejo** não é "um aplicativo que usa Firebase". 
O **3eatcru Varejo** é uma **plataforma SaaS multiplataforma**:
`WebApp + Windows + Android + API + banco + offline engine + licenciamento + HQ.`

O Firebase e outras tecnologias são apenas decisões de infraestrutura, não a identidade arquitetural do produto.

## Arquitetura de Monorepo
O projeto adota uma estrutura de Monorepo para centralizar a plataforma e compartilhar lógicas de domínio, tipos, clientes de API e componentes de UI entre os diferentes clientes.

```text
3eatcru Varejo/
├── apps/
│   ├── web/        # O WebApp principal do cliente (PWA)
│   ├── windows/    # Desktop App (Electron / Tauri)
│   ├── android/    # Mobile App (Capacitor / React Native)
│   └── hq/         # Plataforma administrativa global
│
├── packages/       # Bibliotecas internas compartilhadas
│   ├── ui/         # Design System, Componentes React puros
│   ├── core/       # Regras de negócio essenciais
│   ├── auth/       # Lógica de autenticação e gerenciamento de sessão
│   ├── permissions/# RBAC e validações de acesso
│   ├── offline/    # IndexedDB, Service Workers, estratégias locais
│   ├── sync/       # Fila de sincronização (Sync Queue) background
│   ├── api-client/ # Fetch wrappers tipados para consumir a API
│   └── types/      # Definições globais de TypeScript (ex: Zod schemas, interfaces)
│
└── server/
    └── api/        # Backend-for-Frontend (BFF), API Node.js, Drizzle ORM, PostgreSQL
```

## Estratégia de Conectividade (Híbrida)

Para manter a estabilidade do sistema sem adicionar complexidade desnecessária a módulos que não precisam, o 3eatcru Varejo adota uma estratégia de conectividade híbrida:

### 1. Operação (Offline-First)
Módulos críticos que não podem parar se a internet cair.
- **Módulos:** PDV (Caixa), Estoque, Vendas.
- **Mecanismo:** Browser -> IndexedDB -> Service Worker -> Sync Queue -> Sincronização quando a internet volta.

### 2. Administração (Online-First)
Módulos gerenciais que exigem consistência e não bloqueiam a operação de frente de loja se estiverem indisponíveis por falta de rede.
- **Módulos:** Relatórios, Financeiro, Configurações, Usuários, Billing, HQ, Agenda de Serviços.
- **Mecanismo:** Consumo direto da API.

## Modelo de Licenciamento
1. Acesso via `app.3eatcru.com` (Teste / Criação de conta).
2. Download via aplicativos dedicados (`Windows`, `Android`).
3. Login centralizado na mesma conta API.
4. Controle central feito pelo HQ (`hq.3eatcru.com`):
   - Empresas
   - Usuários / Funcionários
   - Dispositivos vinculados
   - Planos e Entitlements (Limites de uso)
