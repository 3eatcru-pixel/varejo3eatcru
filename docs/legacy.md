# Código Legado e Débito Técnico

*   **Identidade Paralela**: Algumas funções ou stores podem confundir `uid` (identificador único global de acesso Firebase) com IDs de associação interna ou legado.
*   **Seed Data / Dados Falsos**: A infraestrutura conta pesadamente em scripts de Mocking e componentes simulados nas Views Analíticas. Se a base crescer para multitenancy massivo, é preciso limpar todas as referências estáticas.
