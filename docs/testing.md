# Testes

*   **Automação**: Existe uma referência de script `npm run test` mapeando para `server/tests/run.ts`, além de uma suite `vitest` em dev dependencies.
*   **Validação Interna de UI**: O `VarejoProHQ.tsx` possui um componente de "Test Suite Results" que engatilha execuções remotas (API), mas muitas vezes retorna resultados sintéticos.
*   **Status**: DOCUMENTADO, MAS COBERTURA NÃO COMPROVADA NO CÓDIGO (Não encontrei baterias estendidas de testes unitários reais nos arquivos primários).
