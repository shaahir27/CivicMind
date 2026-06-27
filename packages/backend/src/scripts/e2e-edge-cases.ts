/**
 * E2E Edge Cases Test Script
 * Spot-checks error scenarios from user_flows.md Section 5.
 */
import '../config/env.js';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = 'http://localhost:4000/api/v1';

async function fetchToken(role: string): Promise<string> {
  return `demo-${role}`;
}

async function runEdgeCases() {
  console.log(`\n===========================================`);
  console.log(`[E2E] STARTING EDGE CASES TEST`);
  console.log(`===========================================`);

  const citizenToken = await fetchToken('citizen');

  // Scenario 5.2: Report Outside Supported Geo-fence
  console.log(`\n[Test 1] Report Outside Service Area (Scenario 5.2)`);
  const reportRes1 = await fetch(`${API_BASE_URL}/issues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${citizenToken}`
    },
    body: JSON.stringify({
      idempotency_key: uuidv4(),
      photo_refs: ['https://example.com/pothole.jpg'],
      location: { lat: 28.7041, lng: 77.1025 }, // Delhi (outside Bengaluru)
      description: 'Pothole in Delhi'
    })
  });
  
  if (reportRes1.status === 422) {
    console.log(`✅ Correctly rejected with 422 OUTSIDE_SERVICE_AREA`);
  } else {
    console.error(`❌ Expected 422, got ${reportRes1.status}`);
  }

  // Scenario 5.3: Missing Required Image Evidence
  console.log(`\n[Test 2] Missing Image Evidence (Scenario 5.3)`);
  const reportRes2 = await fetch(`${API_BASE_URL}/issues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${citizenToken}`
    },
    body: JSON.stringify({
      idempotency_key: uuidv4(),
      photo_refs: [], // Missing photos
      location: { lat: 12.9784, lng: 77.6408 }, 
      description: 'Pothole in Bengaluru'
    })
  });

  if (reportRes2.status === 400) {
    console.log(`✅ Correctly rejected with 400 VALIDATION_ERROR`);
  } else {
    console.error(`❌ Expected 400, got ${reportRes2.status}`);
  }

  console.log(`\n✅ EDGE CASES TEST COMPLETED`);
}

if (process.argv[1]?.endsWith('e2e-edge-cases.ts')) {
  runEdgeCases().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
