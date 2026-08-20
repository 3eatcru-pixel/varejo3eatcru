# Risk Register

| ID | Severidade | Arquivo / Módulo | Problema | Impacto | Recomendação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| R-001 | P1 (Alto) | `authApi.ts` | Bypass de inicialização via `SEED_USERS` locais | Usuários não validados podem obter `admin` instantâneo em ambientes não produtivos/expostos | Remover a verificação baseada em e-mail codificada e substituir por Custom Claims inseridas via Firebase Cloud Functions. |
| R-002 | P2 (Médio) | Local Storage (`varejopro_db_users`) | Perfil gravado como cache cru no Local Storage | Usuário pode manipular JSON para ganhar privilégios de cliente se não existirem validações adicionais | Remover `localStorage` auth fallback para perfis de sistema e utilizar a session real. |
| R-003 | P2 (Médio) | `Fiscal` (Mock) | Emissão fiscal declarada mas ausente de gateway governamental real. | Vendas poderão ser dadas como finalizadas, mas sem validade legal e sem assinatura de NF-e. | Documentar claramente como 'beta/mock' aos clientes e integrar a BrasilAPI, Sefaz ou TecnoSpeed. |
