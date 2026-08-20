# Arquitetura

O VarejoPro utiliza uma arquitetura **Backend-for-Frontend (BFF)** baseada em Express servindo uma SPA construída com React e Vite. A persistência primária ocorre via Google Firebase (Firestore), suportada por Auth e Storage, mas as regras de negócio sensíveis são abstraídas em APIs Node.js que acessam o Firestore com o Admin SDK para evadir as limitações das Client Rules (quando apropriado) e injetar validações estritas (como limites de cota e idempotência).

## Diagrama Lógico de Camadas

```text
  [ Frontend React SPA (Vite + Tailwind) ]
         ↓ (Chamadas REST HTTP JSON)
  [ Backend API (Node.js + Express) ]  <-- Middlewares (Auth, Rate Limit, Licensing/Quotas)
         ↓
  [ Services Layer (TypeScript Classes) ]
         ↓ (Operações Core)
  [ Domain / Handlers ]
         ↓ (Google Cloud / Firebase Admin SDK)
  [ Firestore DB / Storage / Auth ]
         ↓
  [ Serviços Externos (Google Workspace, Gemini, BrasilAPI, Pagamentos) ]
```

### Papel de Cada Camada

*   **Frontend (SPA)**: Roteamento no cliente (`App.tsx`), persistência offline otimista via `localStorage`/`IndexedDB` (IndexedDB Wrapper customizado), estado distribuído via Context API (`WorkspaceContext`, `AuthContext`) e interface de usuário. É uma aplicação unificada que renderiza views de acordo com as permissões do usuário logado (RBAC guiado via UI).
*   **Backend (API Express)**: O `server.ts` expõe rotas (`/api/*`). Ele centraliza regras críticas que não podem ser confiadas ao cliente, como emissão de convites, validação de capacidade de licença, transações financeiras e ativação de dispositivos.
*   **Services Layer**: Regras de negócios isoladas, como o `LicenseService` que compila dados cruzados entre tenants para determinar `CompanyEntitlements` de forma autoritativa.
*   **Firebase / Firestore**: Base NoSQL. Grande parte das leituras ocorre diretamente entre o Frontend e o Firestore para dados que são seguros para as Security Rules. Escrituras sensíveis são desviadas via API Express, impedindo gravação direta (`allow create, update, delete: if false;` nas regras).
