# Faturamento e Assinaturas (Billing)

O modelo comercial é administrado através das tabelas de Planos e as Collections: `platform_subscriptions`, `platform_companies`.

*   **Assinaturas**: Quando o cliente atinge um limite, a rota backend devolve erro genérico (Code 402 - Payment Required). O `UpgradePlanModal.tsx` intercepta isso e lança o convite para o TRIAL PRO (Degustação de 14 dias).

**Status**: IMPLEMENTADO (Logística interna). A integração real de faturamento (Stripe, Mercado Pago) não foi encontrada, caracterizando um "Controle de Licenciamento" interno.
