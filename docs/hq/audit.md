# Logs e Auditoria

A aplicação subjacente envia requisições constantes para a rota `/api/audit/log`. A aba de Desenvolvimento no HQ e a infraestrutura nativa rastreia esses eventos. Todos os movimentos de estoque, convites de funcionários, encerramento de caixa, ativam trilhas em um Log Distribuído (`collection: audit_logs`).
