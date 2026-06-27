/**
 * Seeding Script — SLA Configuration
 */

import { getFirestore, COLLECTIONS } from '../../config/firebase.js';
import { v5 as uuidv5 } from 'uuid';

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const ADMIN_ID = 'a0a0a0a0-a0a0-40a0-a0a0-a0a0a0a0a0a0';

const CATEGORIES = [
  'pothole',
  'streetlight',
  'garbage',
  'water_leakage',
  'traffic_signal',
  'drainage',
  'road_damage',
  'other',
];

const SEVERITIES = ['low', 'medium', 'high', 'critical'];

// SLA hours per severity
const SLA_HOURS_BY_SEVERITY = {
  low: 120,      // 5 days
  medium: 48,    // 2 days
  high: 24,      // 1 day
  critical: 4,   // 4 hours
} as const;

export async function seedSLA() {
  const db = getFirestore();
  const batch = db.batch();

  console.log('[SEED] Seeding SLA configurations...');

  for (const category of CATEGORIES) {
    for (const severity of SEVERITIES) {
      const configId = uuidv5(`sla:${category}:${severity}`, UUID_NAMESPACE);
      const slaHours = SLA_HOURS_BY_SEVERITY[severity as keyof typeof SLA_HOURS_BY_SEVERITY];

      const slaDoc = {
        config_id: configId,
        category,
        severity,
        sla_hours: slaHours,
        updated_by_admin_id: ADMIN_ID,
        updated_at: new Date().toISOString(),
      };

      const docRef = db.collection(COLLECTIONS.SLA_CONFIG).doc(configId);
      batch.set(docRef, slaDoc);
      console.log(` - Added SLA: ${category} × ${severity} = ${slaHours} hours`);
    }
  }

  await batch.commit();
  console.log('[SEED] SLA configurations seeded successfully.');
}

// Allow standalone execution
if (process.argv[1]?.endsWith('seed-sla.ts') || process.argv[1]?.endsWith('seed-sla.js')) {
  seedSLA()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
