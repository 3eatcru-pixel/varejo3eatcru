# Dispositivos

O sistema adota um registro estrito de terminais (PDVs físicos, Tablets) que contam para a "Cota de Dispositivos" da assinatura SaaS.

### Mapeamento
*   `deviceId`: Gerado aleatoriamente no `localStorage` do navegador (`varejopro_device_id`).
*   `companyId_deviceId`: Chave primária da collection `company_devices`.
*   **Ativação**: A função `registerCurrentDevice()` registra metadados de telemetria. Para operar ativamente o PDV, a função `activateDevice()` é chamada e consome uma cota.
*   **Status**: `ACTIVE`, `INACTIVE`, `LOCKED`.

O controle ocorre em `server/routes/device.routes.ts`.

**Status**: IMPLEMENTADO + PARCIAL. A funcionalidade existe no backend, e a inicialização via singleton client-side `deviceService.ts` opera corretamente.
