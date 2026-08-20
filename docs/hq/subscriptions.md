# Subscriptions e Status

Os Status possíveis para qualquer tenant acompanhados pelo HQ:

*   **ACTIVE**: Em conformidade e sem inadimplência.
*   **TRIAL**: Usufruindo do Free Trial e testando pacotes PRO, possui contagem de expiração regressiva.
*   **SUSPENDED**: Status atrelado internamente à inadimplência. Causa a devolução de `HTTP 402 Payment Required` em bloqueios duros do Backend e da interface do sistema.
