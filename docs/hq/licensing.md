# Controle de Licenciamento & Assinaturas SaaS

O núcleo de controle de assinaturas.

*   **Edição Direta**: A interface do HQ possui um Modal de edição (`Editar Licença SaaS da Empresa`) onde um engenheiro de suporte pode sobrescrever a limitação matemática de uma licença (por exemplo: um cliente contratou o plano PRO de 5 Terminais, mas pagou um boleto extra por fora para ter 6 terminais sem mudar para o plano BUSINESS. O HQ permite ajustar `maxTerminals=6`).
*   **Extensão de Trial**: A tabela possui atalhos (botão `+14d Trial`) para adiar temporariamente as trancas de limite retroativas via endpoint `POST /api/hq/companies/:companyId/trial/extend`.

As requisições atingem `LicenseService.extendTrial` e `LicenseService.changeCompanyPlan`.
