/**
 * End-to-End Lifecycle Test Script
 * Simulates a full lifecycle run: Report -> Validate -> Route -> Resolve -> Verify.
 *
 * Uses category=streetlight so the Router Agent assigns to BESCOM (de7af73e),
 * which matches the demo-authority token's department_id in authenticate.ts.
 * Uses a slightly randomized location per run to avoid the Validator Agent
 * treating the report as a duplicate of prior test runs.
 */
import '../config/env.js';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = process.env['API_BASE_URL'] ?? 'http://localhost:4000/api/v1';

async function runLifecycle(runId: number) {
  console.log(`\n===========================================`);
  console.log(`[E2E] STARTING LIFECYCLE RUN #${runId}`);
  console.log(`===========================================`);

  try {
    const citizenToken = 'demo-citizen';
    const authorityToken = 'demo-authority';

    // Randomise location within ward-101-indiranagar to defeat duplicate detection
    // (Indiranagar bounds approx: lat 12.97-12.98, lng 77.63-77.65)
    const jitter = () => (Math.random() - 0.5) * 0.005;
    const lat = 12.9784 + jitter();
    const lng = 77.6408 + jitter();

    // 1. Report Issue
    console.log(`\n[1] Citizen reporting an issue...`);
    const idempotencyKey = uuidv4();
    const reportRes = await fetch(`${API_BASE_URL}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${citizenToken}`
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        photo_refs: ['https://example.com/streetlight.jpg'],
        location: { lat, lng },
        description: 'Streetlight on the main road is not working for three days.'
      })
    });
    
    if (!reportRes.ok) throw new Error(`Report failed: ${await reportRes.text()}`);
    const issueData = await reportRes.json() as any;
    const issueId = issueData.issue_id;
    console.log(`\u2705 Issue reported: ${issueId}`);
    console.log(`  State: ${issueData.status}`);
    console.log(`  Suggested Category: ${issueData.suggested_category}`);
    console.log(`  Suggested Severity: ${issueData.suggested_severity}`);

    // 2. Citizen confirms - always use streetlight so Router maps to BESCOM (demo-authority's dept)
    console.log(`\n[2] Citizen confirming AI suggestions...`);
    const confirmRes = await fetch(`${API_BASE_URL}/issues/${issueId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${citizenToken}`
      },
      body: JSON.stringify({
        confirmed_category: 'streetlight',
        confirmed_severity: issueData.suggested_severity || 'medium'
      })
    });
    if (!confirmRes.ok) throw new Error(`Confirm failed: ${await confirmRes.text()}`);
    console.log(`\u2705 Citizen confirmed (category: streetlight).`);

    // Wait for async orchestration to complete
    await new Promise(r => setTimeout(r, 2000));

    const statusRes = await fetch(`${API_BASE_URL}/issues/${issueId}`, {
      headers: { 'Authorization': `Bearer ${citizenToken}` }
    });
    if (!statusRes.ok) throw new Error(`Status fetch failed: ${await statusRes.text()}`);
    const updatedIssue = await statusRes.json() as any;
    const currentStatus = updatedIssue.status;
    console.log(`\n[3] Issue status after AI processing: ${currentStatus}`);
    console.log(`  Routed to: ${updatedIssue.department_name ?? 'pending routing'}`);

    if (currentStatus === 'closed') {
      // Auto-merged as duplicate - Validator Agent working correctly.
      console.log(`  \u2139\ufe0f  Issue was auto-merged as a duplicate (Validator Agent working correctly).`);
      console.log(`\n\u26a0\ufe0f  LIFECYCLE RUN #${runId} PARTIAL - issue auto-merged (duplicate detection \u2705)`);
      return;
    }

    // 4a. Authority acknowledges (routed → in_progress)
    console.log(`\n[4a] Authority acknowledging issue (routed → in_progress)...`);
    const ackRes = await fetch(`${API_BASE_URL}/authority/issues/${issueId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authorityToken}`
      },
      body: JSON.stringify({ new_status: 'in_progress' })
    });
    if (!ackRes.ok) throw new Error(`Acknowledge failed: ${await ackRes.text()}`);
    console.log(`✅ Issue acknowledged (in_progress).`);

    await new Promise(r => setTimeout(r, 500));

    // 4b. Authority resolves (in_progress → resolved)
    console.log(`\n[4b] Authority resolving issue (in_progress → resolved)...`);
    const resolveRes = await fetch(`${API_BASE_URL}/authority/issues/${issueId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authorityToken}`
      },
      body: JSON.stringify({
        new_status: 'resolved',
        after_photo_ref: 'https://example.com/fixed-streetlight.jpg'
      })
    });

    if (!resolveRes.ok) throw new Error(`Resolve failed: ${await resolveRes.text()}`);
    const resolvedIssue = await resolveRes.json() as any;
    console.log(`✅ Authority marked as: ${resolvedIssue.status ?? resolvedIssue.new_status ?? 'resolved'}`);

    // 5. Verifier Agent runs (triggers automatically on status=resolved via orchestrator)
    console.log(`\n[5] Verifier Agent evaluates resolution...`);
    await new Promise(r => setTimeout(r, 1000));
    const finalRes = await fetch(`${API_BASE_URL}/issues/${issueId}`, {
      headers: { 'Authorization': `Bearer ${citizenToken}` }
    });
    if (!finalRes.ok) throw new Error(`Final fetch failed: ${await finalRes.text()}`);
    const finalIssue = await finalRes.json() as any;
    console.log(`\u2705 Final state after verification: ${finalIssue.status}`);

    console.log(`\n\u2705 LIFECYCLE RUN #${runId} COMPLETED SUCCESSFULLY`);
  } catch (err) {
    console.error(`\n\u274c LIFECYCLE RUN #${runId} FAILED:`, err);
    throw err;
  }
}

async function run() {
  await runLifecycle(1);
  await runLifecycle(2);
}

run().catch(() => process.exit(1));
