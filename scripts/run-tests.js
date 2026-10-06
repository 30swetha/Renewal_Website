import { runAllTests } from '../src/lib/__tests__/ingest.test.ts';

console.log('====================================================');
console.log('      Mobileum RenewIQ Data Engine Unit Tests       ');
console.log('====================================================\n');

const outcome = runAllTests();

outcome.results.forEach((res, index) => {
  const symbol = res.success ? '✅ PASS' : '❌ FAIL';
  console.log(`${index + 1}. [${symbol}] ${res.name}`);
  if (res.error) {
    console.log(`   Error: ${res.error}`);
  }
});

console.log('\n----------------------------------------------------');
console.log(`Total Tests Run: ${outcome.results.length}`);
console.log(`Passed: ${outcome.passed} | Failed: ${outcome.failed}`);
console.log('====================================================\n');

if (outcome.failed > 0) {
  process.exit(1);
}
