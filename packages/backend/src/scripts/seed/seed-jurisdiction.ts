/**
 * Seeding Script — Jurisdiction / Ward Mappings
 */

import { getFirestore, COLLECTIONS } from '../../config/firebase.js';
import { DEPARTMENTS } from './seed-departments.js';
import { v5 as uuidv5 } from 'uuid';

// Namespace for deterministic UUID generation
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

const WARDS = [
  'ward-101-indiranagar',
  'ward-102-koramangala',
  'ward-103-hsrlayout',
];

const CATEGORY_TO_DEPT_KEY = {
  streetlight: 'BESCOM',
  water_leakage: 'BWSSB',
  drainage: 'BWSSB',
  garbage: 'BBMP_SANITATION',
  pothole: 'BBMP_ROADS',
  road_damage: 'BBMP_ROADS',
  traffic_signal: 'TRAFFIC_POLICE',
  other: 'BBMP_GENERAL',
} as const;

export async function seedJurisdiction() {
  const db = getFirestore();
  const batch = db.batch();

  console.log('[SEED] Seeding jurisdiction mappings...');

  // 1. Seed mappings for specific wards
  for (const ward of WARDS) {
    for (const [category, deptKey] of Object.entries(CATEGORY_TO_DEPT_KEY)) {
      const dept = DEPARTMENTS[deptKey as keyof typeof DEPARTMENTS];
      const mappingId = uuidv5(`${ward}:${category}`, UUID_NAMESPACE);

      const mappingDoc = {
        mapping_id: mappingId,
        ward_or_area_id: ward,
        category,
        department_id: dept.department_id,
        is_fallback: false,
      };

      const docRef = db.collection(COLLECTIONS.JURISDICTION_MAPPINGS).doc(mappingId);
      batch.set(docRef, mappingDoc);
      console.log(` - Added mapping: [${ward}] ${category} -> ${dept.name}`);
    }
  }

  // 2. Seed generic fallback mappings (for categories outside specific wards)
  for (const [category, deptKey] of Object.entries(CATEGORY_TO_DEPT_KEY)) {
    const dept = DEPARTMENTS[deptKey as keyof typeof DEPARTMENTS];
    const mappingId = uuidv5(`fallback:${category}`, UUID_NAMESPACE);

    const fallbackDoc = {
      mapping_id: mappingId,
      ward_or_area_id: 'default',
      category,
      department_id: dept.department_id,
      is_fallback: true,
    };

    const docRef = db.collection(COLLECTIONS.JURISDICTION_MAPPINGS).doc(mappingId);
    batch.set(docRef, fallbackDoc);
    console.log(` - Added fallback mapping: [default] ${category} -> ${dept.name}`);
  }

  await batch.commit();
  console.log('[SEED] Jurisdiction mappings seeded successfully.');
}

// Allow standalone execution
if (process.argv[1]?.endsWith('seed-jurisdiction.ts') || process.argv[1]?.endsWith('seed-jurisdiction.js')) {
  seedJurisdiction()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
