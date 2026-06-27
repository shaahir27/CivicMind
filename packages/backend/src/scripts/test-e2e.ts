import * as crypto from 'crypto';
import '../config/env.js';
import { orchestrateIssueSubmission } from '../services/orchestrator.js';

async function runTest() {
  console.log("1. Fetching a real pothole image from Wikipedia...");
  const imgUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Pothole_in_the_road.jpg/640px-Pothole_in_the_road.jpg";
  const imgRes = await fetch(imgUrl);
  const arrayBuffer = await imgRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Data = buffer.toString('base64');
  
  console.log("2. Injecting issue directly into orchestrator (bypassing missing Firebase Storage bucket)...");
  
  const result = await orchestrateIssueSubmission({
    idempotencyKey: crypto.randomUUID(),
    photoRefs: ["dummy-storage-path.jpg"], // Bypassed
    photoBase64List: [{ mimeType: 'image/jpeg', data: base64Data }],
    locationLat: 12.9716,
    locationLng: 77.5946,
    description: "Massive pothole in the middle of the road. Very dangerous for bikes.",
    reporterUserId: 'CITIZEN_DEMO_UID',
    wardOrAreaId: 'ward-101-indiranagar',
    locationAddressText: "MG Road, Bengaluru"
  });
  
  console.log("3. Response received from backend orchestrator:");
  console.log(JSON.stringify(result, null, 2));

  if (result.issueId) {
    console.log(`\n✅ E2E Success! The Reporter Agent classified this real Wikipedia image as: ${result.suggestedCategory} (${Math.round(result.categoryConfidence * 100)}% confidence)`);
    console.log(`Severity: ${result.suggestedSeverity} (${Math.round(result.severityConfidence * 100)}% confidence)`);
  }
}

runTest().catch(console.error);
