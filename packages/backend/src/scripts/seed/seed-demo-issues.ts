/**
 * Script to seed demo issues in various states.
 * Creates issues that are routed, in_progress, escalated, and verified_resolved.
 */
import '../../config/env.js';
import { getFirestore, COLLECTIONS } from '../../config/firebase.js';
import { IssueCategory, IssueSeverity, IssueStatus, ActorType } from '@civicmind/shared';
import type { Issue } from '@civicmind/shared';

export async function seedDemoIssues() {
  const db = getFirestore();
  const batch = db.batch();
  const now = new Date();

  // Helper to subtract hours
  const subtractHours = (date: Date, hours: number) => new Date(date.getTime() - hours * 60 * 60 * 1000);

  // Reusable demo users
  const citizenId = 'CITIZEN_DEMO_UID'; 
  const deptIdBescom = 'de7af73e-324c-4740-9a3d-c11df5b91b92'; // From seed-demo-accounts
  
  const demoIssues: { issue: Partial<Issue>; photo_url: string }[] = [
    {
      issue: {
        issue_id: 'demo-routed-1',
        idempotency_key: 'demo-routed-1-key',
        reporter_user_id: citizenId,
        status: IssueStatus.Routed,
        category: IssueCategory.Streetlight,
        severity: IssueSeverity.High,
        location_lat: 12.9784,
        location_lng: 77.6408,
        location_address_text: '100ft Road, Indiranagar',
        description: 'Streetlight is completely broken and hanging by a wire.',
        is_canonical: true,
        canonical_issue_id: null,
        department_id: deptIdBescom,
        ward_or_area_id: 'ward-101-indiranagar',
        sla_deadline: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        escalation_tier_current: 0,
        corroboration_count: 1,
        created_at: subtractHours(now, 2).toISOString(),
        updated_at: subtractHours(now, 2).toISOString()
      },
      photo_url: 'https://picsum.photos/seed/civicsense7/400/300'
    },
    {
      issue: {
        issue_id: 'demo-in-progress-1',
        idempotency_key: 'demo-in-progress-1-key',
        reporter_user_id: citizenId,
        status: IssueStatus.InProgress,
        category: IssueCategory.Streetlight,
        severity: IssueSeverity.Medium,
        location_lat: 12.9345,
        location_lng: 77.6266,
        location_address_text: '80ft Road, Koramangala',
        description: 'Streetlight is flickering continuously.',
        is_canonical: true,
        canonical_issue_id: null,
        department_id: deptIdBescom,
        ward_or_area_id: 'ward-102-koramangala',
        sla_deadline: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
        escalation_tier_current: 0,
        corroboration_count: 1,
        created_at: subtractHours(now, 10).toISOString(),
        updated_at: subtractHours(now, 1).toISOString()
      },
      photo_url: 'https://picsum.photos/seed/civicsense8/400/300'
    },
    {
      issue: {
        issue_id: 'demo-escalated-1',
        idempotency_key: 'demo-escalated-1-key',
        reporter_user_id: citizenId,
        status: IssueStatus.Escalated,
        category: IssueCategory.Streetlight,
        severity: IssueSeverity.Critical,
        location_lat: 12.9784,
        location_lng: 77.6408,
        location_address_text: 'CMH Road, Indiranagar',
        description: 'Live wire exposed on the pavement.',
        is_canonical: true,
        canonical_issue_id: null,
        department_id: deptIdBescom,
        ward_or_area_id: 'ward-101-indiranagar',
        sla_deadline: subtractHours(now, 1).toISOString(),
        escalation_tier_current: 1,
        corroboration_count: 1,
        created_at: subtractHours(now, 6).toISOString(),
        updated_at: subtractHours(now, 1).toISOString()
      },
      photo_url: 'https://picsum.photos/seed/civicsense9/400/300'
    },
    {
      issue: {
        issue_id: 'demo-resolved-1',
        idempotency_key: 'demo-resolved-1-key',
        reporter_user_id: citizenId,
        status: IssueStatus.VerifiedResolved,
        category: IssueCategory.Streetlight,
        severity: IssueSeverity.Low,
        location_lat: 12.9345,
        location_lng: 77.6266,
        location_address_text: '1st Block, Koramangala',
        description: 'Dim light.',
        is_canonical: true,
        canonical_issue_id: null,
        department_id: deptIdBescom,
        ward_or_area_id: 'ward-102-koramangala',
        sla_deadline: subtractHours(now, -100).toISOString(),
        escalation_tier_current: 0,
        corroboration_count: 1,
        created_at: subtractHours(now, 72).toISOString(),
        updated_at: subtractHours(now, 5).toISOString()
      },
      photo_url: 'https://picsum.photos/seed/civicsense10/400/300'
    }
  ];

  for (const item of demoIssues) {
    const issue = item.issue;
    
    const ref = db.collection(COLLECTIONS.ISSUES).doc(issue.issue_id!);
    batch.set(ref, issue, { merge: true });

    const photoRef = db.collection(COLLECTIONS.ISSUE_PHOTOS).doc();
    const photo = {
      photo_id: photoRef.id,
      issue_id: issue.issue_id!,
      photo_type: 'before',
      storage_path: item.photo_url,
      uploaded_by_user_id: citizenId,
      created_at: issue.created_at!
    };
    batch.set(photoRef, photo);

    const histRef = db.collection(COLLECTIONS.ISSUE_STATUS_HISTORY).doc();
    const history = {
      history_id: histRef.id,
      issue_id: issue.issue_id!,
      from_status: IssueStatus.Submitted,
      to_status: issue.status!,
      actor_type: ActorType.System,
      actor_id: null,
      reason: 'Demo seeding setup',
      created_at: issue.updated_at!
    };
    batch.set(histRef, history);
  }

  await batch.commit();
  console.log('✅ Seeded 4 demo issues in diverse states.');
}

if (process.argv[1]?.endsWith('seed-demo-issues.ts')) {
  seedDemoIssues()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
