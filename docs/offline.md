# Offline-First

O VarejoPro desenhou uma estratégia para a rede instável do PDV:

*   **Local Storage**: Os dados de autenticação e parâmetros mínimos da loja são gravados localmente.
*   **IndexedDB (PWA)**: Produtos e carrinhos pendentes são colocados em filas.
*   **Service Workers**: (Não foi encontrado um ServiceWorker funcional pesado para interceptar requests, recaindo para cache local).
*   **Fila Assíncrona**: Existe um `OfflineQueueService.ts` que supostamente guarda requests de venda não consolidados.

**Status**: PARCIAL / LEGADO. A intenção offline está presente nas camadas cliente-side, mas a sincronização resiliente pesada (com sync queue) depende de implementações de UI mais profundas.
