# Autenticação

A Autenticação no VarejoPro ocorre primariamente no cliente usando o **Firebase Authentication**. O estado de autenticação é sincronizado com um banco de perfis e propagado para o backend via JWT Headers (`Authorization: Bearer <token>`).

*   **Provedor**: Firebase Auth.
*   **Fluxo Típico**:
    1.  Login via Firebase Auth (E-mail/Senha).
    2.  Ao confirmar o token localmente, a UI despacha uma chamada local para `authApi.ts` ou para `/api/pulse/sync` e inicializa o `UserProfile`.
    3.  Acesso das APIs do Express extrai e decodifica o JWT Token usando `firebase-admin/auth`. O middleware injeta o payload do token (`req.auth`).
*   **Tokens Customizados / Mocks**: O `authApi.ts` possui uma função `initializeUserProfile` que possui um "bypass" (MOCK / LEGADO) interno verificando `SEED_USERS` para criar permissões instantâneas baseadas num mapeamento em memória se o e-mail coincidir.
*   **Recuperação**: Padrão do Firebase.
*   **Sessões Mistas**: O FrontEnd salva um objeto de profile no `localStorage` chamado `varejopro_db_users`. Essa é uma abordagem vulnerável e inconsistente, mantida como legado/cache.

**Status Global**: IMPLEMENTADO (Porém contém fallbacks/caches inseguros locais em localStorage que não devem ser utilizados para enforcement).
