# Estoque e Inventário

Administrado pelas abas "Inventário", "Ajustes", "Movimentações" e "Transferências".
*   Os registros salvos nas collections `stock_movements` são "Imutáveis" (Append-only log) para rastreio de auditoria.
*   Uma atualização de quantidade do produto faz duas operações (Transaction): Altera o saldo consolidado no `product` e grava um `stock_movement`.

**Status**: IMPLEMENTADO.
