# Platform Admins

Ser um Administrador da Plataforma é um status restrito e fixo.

**Regras**:
*   A autorização não está vinculada a nenhuma Role específica de Company.
*   Não importa se você é um `OWNER` de uma rede de supermercados gigantesca dentro do VarejoPro; você não é um `Platform Admin`.
*   A elevação para `Platform Admin` exige a presença formal do `uid` dentro de um registro da Collection separada `/platform_admins/`.

Se um desenvolvedor quiser ganhar acesso ao HQ, ele deve injetar sua chave na collection `platform_admins` pelo painel de controle direto do Google Cloud Firestore.
