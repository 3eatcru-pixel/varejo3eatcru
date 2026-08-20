# Ponto de Venda (PDV)

O coração comercial do sistema (Frente de Caixa).

### Fluxo Base
```text
ABRIR CAIXA (Exige vínculo com Terminais ativos)
 ↓
CRIAR VENDA (Carrinho em memória React State)
 ↓
ADICIONAR PRODUTOS (Busca otimizada no IndexedDB ou DB Local)
 ↓
CALCULAR TOTAL (Com Descontos Lineares ou Globais)
 ↓
PAGAMENTO (Múltiplas Formas: Dinheiro, PIX, Cartão)
 ↓
CONFIRMAR (Dispara API /api/sales POST)
 ↓
ESTOQUE (Baixa sincrona ou assíncrona dependendo da conexão)
 ↓
FINANCEIRO
```

**Comportamento Operacional**:
Se o módulo for carregado, o sistema assume o uso offline-first (guardando recibos no Local Storage). Porém, transações fechadas devem atingir o `/api/sales` caso a rede esteja acessível.
