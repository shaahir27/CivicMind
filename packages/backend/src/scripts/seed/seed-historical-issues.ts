/**
 * Script to seed historical issues for Predictor Agent testing.
 * Creates a batch of canonical issues distributed over the last 90 days.
 */
import '../../config/env.js';
import { getFirestore, COLLECTIONS } from '../../config/firebase.js';
import { IssueCategory, IssueSeverity, IssueStatus } from '@civicmind/shared';
import type { Issue } from '@civicmind/shared';
import { v4 as uuidv4 } from 'uuid';

const WARDS = [
  'ward-101-indiranagar',
  'ward-102-koramangala',
  'ward-103-hsrlayout',
  'ward-104-jayanagar',
  'ward-109-btm',
];

const PAST_DAYS = 90;

function randomDateInPast(maxDays: number): string {
  const now = Date.now();
  const past = now - Math.random() * maxDays * 24 * 3600 * 1000;
  return new Date(past).toISOString();
}

export async function seedHistoricalIssues() {
  const db = getFirestore();
  const batch = db.batch();
  let count = 0;

  // Let's create clusters of issues to ensure the Predictor finds hotspots.
  // 1. High pothole concentration in Indiranagar
  for (let i = 0; i < 15; i++) {
    const id = `mock-hist-${uuidv4()}`;
    const issue: Partial<Issue> = {
      issue_id: id,
      category: IssueCategory.Pothole,
      severity: IssueSeverity.High,
      status: IssueStatus.Closed,
      created_at: randomDateInPast(PAST_DAYS),
      ward_or_area_id: 'ward-101-indiranagar',
      is_canonical: true,
    };
    batch.set(db.collection(COLLECTIONS.ISSUES).doc(id), issue as Issue);
    count++;
  }

  // 2. High water leakage in Koramangala
  for (let i = 0; i < 10; i++) {
    const id = `mock-hist-${uuidv4()}`;
    const issue: Partial<Issue> = {
      issue_id: id,
      category: IssueCategory.WaterLeakage,
      severity: IssueSeverity.Critical,
      status: IssueStatus.Closed,
      created_at: randomDateInPast(PAST_DAYS),
      ward_or_area_id: 'ward-102-koramangala',
      is_canonical: true,
    };
    batch.set(db.collection(COLLECTIONS.ISSUES).doc(id), issue as Issue);
    count++;
  }

  // 3. Random noise across all wards
  for (let i = 0; i < 30; i++) {
    const id = `mock-hist-${uuidv4()}`;
    const issue: Partial<Issue> = {
      issue_id: id,
      category: Object.values(IssueCategory)[Math.floor(Math.random() * 8)] as IssueCategory,
      severity: IssueSeverity.Medium,
      status: IssueStatus.Closed,
      created_at: randomDateInPast(PAST_DAYS),
      ward_or_area_id: WARDS[Math.floor(Math.random() * WARDS.length)],
      is_canonical: true,
    };
    batch.set(db.collection(COLLECTIONS.ISSUES).doc(id), issue as Issue);
    count++;
  }

  await batch.commit();
  console.log(`✅ Seeded ${count} historical issues.`);
}

// Run immediately
seedHistoricalIssues()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
