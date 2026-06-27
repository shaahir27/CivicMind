import { getFirestore } from 'firebase-admin/firestore';
import { COLLECTIONS } from '../../config/firebase.js';

export async function seedImpactReports() {
  const db = getFirestore();
  const reportsRef = db.collection(COLLECTIONS.IMPACT_REPORTS || 'impact_reports');
  
  const snap = await reportsRef.limit(1).get();
  if (!snap.empty) {
    console.log('Impact reports already seeded. Skipping.');
    return;
  }

  console.log('Seeding demo impact reports...');
  const batch = db.batch();

  const mockReports = [
    {
      report_id: 'rpt-ward-76-2026-q1',
      ward_or_area_id: 'ward-76-richmond-town',
      period_start: '2026-01-01T00:00:00Z',
      period_end: '2026-03-31T23:59:59Z',
      total_issues: 142,
      resolution_rate: 0.85,
      avg_resolution_hours: 48,
      avg_verification_hours: 12,
      escalation_rate: 0.05,
      estimated_savings_value: 45000,
      civic_health_score: 82,
      generated_at: new Date().toISOString(),
    },
    {
      report_id: 'rpt-ward-111-2026-q1',
      ward_or_area_id: 'ward-111-shantala-nagar',
      period_start: '2026-01-01T00:00:00Z',
      period_end: '2026-03-31T23:59:59Z',
      total_issues: 98,
      resolution_rate: 0.72,
      avg_resolution_hours: 72,
      avg_verification_hours: 24,
      escalation_rate: 0.12,
      estimated_savings_value: 28000,
      civic_health_score: 68,
      generated_at: new Date().toISOString(),
    },
    {
      report_id: 'rpt-ward-112-2026-q1',
      ward_or_area_id: 'ward-112-domlur',
      period_start: '2026-01-01T00:00:00Z',
      period_end: '2026-03-31T23:59:59Z',
      total_issues: 215,
      resolution_rate: 0.91,
      avg_resolution_hours: 36,
      avg_verification_hours: 8,
      escalation_rate: 0.02,
      estimated_savings_value: 75000,
      civic_health_score: 91,
      generated_at: new Date().toISOString(),
    }
  ];

  for (const report of mockReports) {
    batch.set(reportsRef.doc(report.report_id), report);
  }

  await batch.commit();
  console.log(`Seeded ${mockReports.length} impact reports.`);
}
