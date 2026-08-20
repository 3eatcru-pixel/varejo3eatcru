# Fiscal

*   **Promessa**: Emissão de NFC-e e NF-e via APIs governamentais (BrasilAPI, Sefaz, ou gateways).
*   **Implementação**: A documentação exibe as interfaces visuais (`FiscalSettings`, `FiscalManager`), mas a comunicação real via Certificado A1 ou gateway fiscal complexo é majoritariamente **MOCK/PARCIAL**. O backend possui rotas como `/api/fiscal`, porém sem implementação governamental pesada ativada, gerando um "Stub" JSON.
*   **Status**: DOCUMENTADO MAS NÃO IMPLEMENTADO (Simulação/Mock).
