# Arquitetura do HQ

O HQ consome as rotas iniciadas com `/api/hq/*`.

Para que qualquer rota neste namespace libere a leitura, as chamadas exigem dois middlewares protetivos simultaneamente:
1.  `requireApiAuth`: Autenticação e verificação de JWT do Firebase Auth Válido.
2.  `requirePlatformAdmin`: Valida que o UID do usuário que assina o token está registrado e liberado com uma Flag Global na coleção `platform_admins`.

### Operação

O Console HQ lê o Firestore não mais fatiado pelo `companyId`. O SDK Admin ignora as restrições de Tenant que protegem clientes de se verem entre si e carrega listas unificadas. O VarejoProHQ envia payloads formatados para manipular status da Assinatura e emitir Cupons, tudo validado pela arquitetura do Backend que empilha os comandos usando o `LicenseService`.
