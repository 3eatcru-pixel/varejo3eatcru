import { runSuiteValidation } from './suite_validation';

runSuiteValidation()
  .then(() => {
    console.log('\nAll test assertions executed successfully.');
  })
  .catch((err) => {
    console.error('Test run failed:', err);
    process.exit(1);
  });
