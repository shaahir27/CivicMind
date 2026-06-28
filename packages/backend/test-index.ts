import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIREBASE_PROJECT_ID = "civicsense-ec813";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
initializeApp();
const db = getFirestore();

async function run() {
  try {
    console.log("Running query...");
    const issuesSnapshot = await db
      .collection('issues')
      .where('ward_or_area_id', '==', 'ward-101-indiranagar')
      .where('created_at', '>=', '2026-05-29T00:00:00.000Z')
      .where('created_at', '<=', '2026-06-28T00:00:00.000Z')
      .where('is_canonical', '==', true)
      .get();
    
    console.log("Success! Found " + issuesSnapshot.docs.length + " docs.");
    
    const issues = issuesSnapshot.docs.map(d => d.data());
    const resolvedIssues = issues.filter((i) => [
      'verified_resolved', 'closed'
    ].includes(i.status));
    
    console.log(`Resolved: ${resolvedIssues.length}`);
    const resolvedWithTime = resolvedIssues.filter((i) => i.resolved_at);
    console.log(`With time: ${resolvedWithTime.length}`);
    
    const totalMs = resolvedWithTime.reduce((sum, i) => {
      const ms = new Date(i.resolved_at!).getTime() - new Date(i.created_at).getTime();
      return sum + ms;
    }, 0);
    console.log("Total ms", totalMs);
  } catch(e) {
    console.error("ERROR:");
    console.error(e);
  }
}
run();
