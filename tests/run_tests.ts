import { runAllHardeningTests } from './test_hardening_suite';

async function main() {
  try {
    const results = await runAllHardeningTests();
    const failures = results.filter(r => !r.passed);
    if (failures.length > 0) {
      console.error(`💥 ${failures.length} testes falharam.`);
      process.exit(1);
    } else {
      console.log(`🎉 TODOS OS ${results.length} TESTES PASSARAM COM SUCESSO!`);
      process.exit(0);
    }
  } catch (err) {
    console.error("Erro fatal na execução dos testes:", err);
    process.exit(1);
  }
}

main();
