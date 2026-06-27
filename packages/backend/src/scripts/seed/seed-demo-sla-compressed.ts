/**
 * Script to seed compressed SLA configurations for Demo mode.
 * Replaces SLA deadlines with 1 minute (instead of hours) so escalation 
 * triggers almost immediately during a live demo.
 */
import '../../config/env.js';
import { getFirestore, COLLECTIONS } from '../../config/firebase.js';

export async function seedDemoSlaCompressed() {
  const db = getFirestore();
  const batch = db.batch();

  // Fetch all existing SLA docs and update their hours to 0.016 (1 minute)
  const snapshot = await db.collection(COLLECTIONS.SLA_CONFIG).get();
  
  if (snapshot.empty) {
    console.log('No SLA configs found. Run seed:sla first.');
    return;
  }

  for (const doc of snapshot.docs) {
    batch.update(doc.ref, { sla_hours: 0.016 });
  }

  await batch.commit();
  console.log('✅ Updated all SLAs to 1 minute for demo escalation.');
}

if (process.argv[1]?.endsWith('seed-demo-sla-compressed.ts')) {
  seedDemoSlaCompressed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
