/**
 * Seeding Script — Departments
 */

import { getFirestore, COLLECTIONS } from '../../config/firebase.js';

export const DEPARTMENTS = {
  BESCOM: {
    department_id: 'de7af73e-324c-4740-9a3d-c11df5b91b92',
    name: 'BESCOM — Electricity & Streetlights',
    category_scope: ['streetlight'],
    contact_channel: 'bescom-api-stub@demo.civicmind.gov',
    created_at: new Date().toISOString(),
  },
  BWSSB: {
    department_id: 'df7cf500-bf64-44b4-8461-8cc5c7df7cbf',
    name: 'BWSSB — Water Supply & Sewerage',
    category_scope: ['water_leakage', 'drainage'],
    contact_channel: 'bwssb-api-stub@demo.civicmind.gov',
    created_at: new Date().toISOString(),
  },
  BBMP_SANITATION: {
    department_id: 'd688cf0c-444a-4c2f-ad34-6014e7a83d3e',
    name: 'BBMP — Sanitation & Waste Management',
    category_scope: ['garbage'],
    contact_channel: 'bbmp-sanitation-api-stub@demo.civicmind.gov',
    created_at: new Date().toISOString(),
  },
  BBMP_ROADS: {
    department_id: 'd5ef3db1-e1cf-41cb-b3ec-332d1f7c81d3',
    name: 'BBMP — Road Infrastructure & Potholes',
    category_scope: ['pothole', 'road_damage'],
    contact_channel: 'bbmp-roads-api-stub@demo.civicmind.gov',
    created_at: new Date().toISOString(),
  },
  TRAFFIC_POLICE: {
    department_id: 'da31b40c-2dfd-4be9-813c-0e78c4391fa8',
    name: 'Bangalore Traffic Police — Signals',
    category_scope: ['traffic_signal'],
    contact_channel: 'traffic-police-api-stub@demo.civicmind.gov',
    created_at: new Date().toISOString(),
  },
  BBMP_GENERAL: {
    department_id: 'dffcc31b-563b-4860-9bc8-ee2cf3ff1b5f',
    name: 'BBMP — General Fallback Administration',
    category_scope: ['other'],
    contact_channel: 'bbmp-general-api-stub@demo.civicmind.gov',
    created_at: new Date().toISOString(),
  },
};

export async function seedDepartments() {
  const db = getFirestore();
  const batch = db.batch();

  console.log('[SEED] Seeding departments...');
  for (const [key, dept] of Object.entries(DEPARTMENTS)) {
    const docRef = db.collection(COLLECTIONS.DEPARTMENTS).doc(dept.department_id);
    batch.set(docRef, dept);
    console.log(` - Added department ${key}: ${dept.name}`);
  }

  await batch.commit();
  console.log('[SEED] Departments seeded successfully.');
}

// Allow standalone execution
if (process.argv[1]?.endsWith('seed-departments.ts') || process.argv[1]?.endsWith('seed-departments.js')) {
  seedDepartments()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
