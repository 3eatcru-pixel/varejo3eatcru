# Usuários e Funcionários

A gestão de equipe ocorre pelo módulo `UserManager` (`/src/modules/administrativo/usuarios/UserManager.tsx`).

### Fluxo de Convites
```text
OWNER
 ↓ (Gera convite pela API /api/company/members/invite)
API (Valida Cotas do Plano -> Libera ou 402)
 ↓
CONVITE (Pendente em /user_invitations)
 ↓
ACEITE (Usuário cria a conta, sistema vincula convite pelo E-mail)
 ↓
MEMBERSHIP (Usuário ingressa com a ROLE atribuída)
```

**Limites por Plano**: O Express valida as restrições antes de inserir um convite no banco através de `LicenseService.checkResourceQuota(companyId, 'users')`.

**Desativação**: O owner pode revogar permissões deletando o membro ou revogando o convite.
