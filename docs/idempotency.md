# Idempotência

Proteção contra dupla submissão em requisições de pagamento ou inserções lentas.

*   Collections: `sale_idempotency`, `refund_idempotency`.
*   **Técnica**: Quando uma venda é enviada, o cliente envia uma `Idempotency-Key` no Header. A rota Express grava essa chave na coleção de idempotência no Firebase usando transação. Se a chave já existir, a requisição é rejeitada como duplicada ou retorna o resultado salvo na primeira passagem.

**Status**: IMPLEMENTADO (Parcialmente no backend nas rotas mais recentes).
