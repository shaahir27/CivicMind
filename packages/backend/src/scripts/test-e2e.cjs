const fs = require('fs');
const crypto = require('crypto');
const admin = require('firebase-admin');

// Load environment to get the credentials for storage upload
require('dotenv').config({ path: '../../.env' });

// Initialize Firebase Admin just for the upload part of our script
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`,
  });
}

async function runTest() {
  console.log("1. Fetching a real pothole image from Wikipedia...");
  const imgUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Pothole_in_the_road.jpg/640px-Pothole_in_the_road.jpg";
  const imgRes = await fetch(imgUrl);
  const arrayBuffer = await imgRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  console.log("2. Uploading image to Firebase Storage...");
  const bucket = admin.storage().bucket();
  const photoRef = `issues/test-e2e-${Date.now()}.jpg`;
  const file = bucket.file(photoRef);
  await file.save(buffer, { contentType: 'image/jpeg' });
  console.log(`✅ Uploaded to Storage at: ${photoRef}`);
  
  console.log("3. Submitting issue to backend API...");
  const issueRes = await fetch("http://localhost:4000/api/v1/issues", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": "Bearer demo-citizen-token"
    },
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      location: { lat: 12.9716, lng: 77.5946, address: "MG Road, Bengaluru" },
      description: "Massive pothole in the middle of the road. Very dangerous for bikes.",
      photo_refs: [photoRef]
    })
  });
  
  const issueData = await issueRes.json();
  console.log("4. Response received from backend:");
  console.log(JSON.stringify(issueData, null, 2));

  if (issueData.issue_id) {
    console.log(`\n✅ E2E Success! The Reporter Agent classified this image as: ${issueData.suggested_category} (${Math.round(issueData.category_confidence * 100)}% confidence)`);
    console.log(`Severity: ${issueData.suggested_severity} (${Math.round(issueData.severity_confidence * 100)}% confidence)`);
  }
}

runTest().catch(console.error);
