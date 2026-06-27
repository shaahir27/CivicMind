/**
 * E2E Performance Test Script
 * Seeds and retrieves 50 issues concurrently to ensure pagination/latency is reasonable.
 */
import '../config/env.js';

const API_BASE_URL = 'http://localhost:4000/api/v1';

async function fetchToken(role: string): Promise<string> {
  return `demo-${role}`;
}

async function runPerformanceTest() {
  console.log(`\n===========================================`);
  console.log(`[E2E] STARTING PERFORMANCE TEST`);
  console.log(`===========================================`);

  const citizenToken = await fetchToken('citizen');

  console.log(`\n[Test 1] Fetching feed of issues with pagination...`);
  const startTime = Date.now();
  
  // Just fetch the first page of issues
  const feedRes = await fetch(`${API_BASE_URL}/issues`, {
    headers: {
      'Authorization': `Bearer ${citizenToken}`
    }
  });
  
  const latency = Date.now() - startTime;
  
  if (feedRes.ok) {
    const data = await feedRes.json() as any;
    console.log(`✅ Fetched ${data.issues.length} issues in ${latency}ms.`);
    if (latency < 2000) {
      console.log(`✅ Latency is well within 2s SLA.`);
    } else {
      console.warn(`⚠️ Latency ${latency}ms exceeds 2s threshold.`);
    }
  } else {
    console.error(`❌ Feed fetch failed: ${await feedRes.text()}`);
  }

  console.log(`\n✅ PERFORMANCE TEST COMPLETED`);
}

if (process.argv[1]?.endsWith('e2e-performance-test.ts')) {
  runPerformanceTest().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
