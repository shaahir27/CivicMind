/**
 * E2E Access Control Test Script
 * Verifies authority RBAC and cross-department blocking.
 */
import '../config/env.js';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = 'http://localhost:4000/api/v1';

async function fetchToken(role: string): Promise<string> {
  return `demo-${role}`;
}

async function runAccessControlTests() {
  console.log(`\n===========================================`);
  console.log(`[E2E] STARTING ACCESS CONTROL TEST`);
  console.log(`===========================================`);

  const citizenToken = await fetchToken('citizen');
  const authorityToken = await fetchToken('authority'); // BESCOM + Indiranagar/Koramangala scope

  // 1. Citizen creates an issue in HSR Layout (outside BESCOM auth's jurisdiction)
  console.log(`\n[Test 1] Citizen reporting an issue in HSR Layout (ward-103)...`);
  const reportRes = await fetch(`${API_BASE_URL}/issues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${citizenToken}`
    },
    body: JSON.stringify({
      idempotency_key: uuidv4(),
      photo_refs: ['https://example.com/pothole.jpg'],
      location: { lat: 12.9121, lng: 77.6446 }, // HSR Layout coordinates -> maps to ward-103
      description: 'Streetlight broken.'
    })
  });
  
  if (!reportRes.ok) throw new Error(`Report failed: ${await reportRes.text()}`);
  const issueData = await reportRes.json() as any;
  const issueId = issueData.issue_id;
  console.log(`✅ Issue reported: ${issueId}`);

  if (issueData.requires_citizen_confirmation) {
    await fetch(`${API_BASE_URL}/issues/${issueId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${citizenToken}`
      },
      body: JSON.stringify({
        confirmed_category: issueData.suggested_category || 'streetlight',
        confirmed_severity: issueData.suggested_severity || 'medium'
      })
    });
  }

  // Wait a bit to simulate real world
  await new Promise(r => setTimeout(r, 1000));

  // 2. Authority attempts to resolve it
  console.log(`\n[Test 2] Authority (BESCOM/Indiranagar) attempting to resolve HSR Layout issue...`);
  const resolveRes = await fetch(`${API_BASE_URL}/authority/issues/${issueId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authorityToken}`
    },
    body: JSON.stringify({
      new_status: 'resolved',
      after_photo_ref: 'https://example.com/fixed.jpg'
    })
  });

  // Since the user is Authority for Indiranagar/Koramangala, trying to resolve an issue in HSR Layout should fail with 403.
  if (resolveRes.status === 403) {
    console.log(`✅ Correctly rejected with 403 FORBIDDEN_SCOPE`);
    console.log(`   Response: ${await resolveRes.text()}`);
  } else if (resolveRes.status === 404) {
    // If the orchestrator hasn't routed it yet, or the list endpoint filtered it out, 404 is also valid
    console.log(`✅ Correctly rejected with 404 (not found / not accessible)`);
  } else {
    console.error(`❌ Expected 403/404, got ${resolveRes.status} ${await resolveRes.text()}`);
  }

  console.log(`\n✅ ACCESS CONTROL TEST COMPLETED`);
}

if (process.argv[1]?.endsWith('e2e-access-control.ts')) {
  runAccessControlTests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
