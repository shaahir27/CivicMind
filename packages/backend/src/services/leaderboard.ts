import { getFirestore, COLLECTIONS } from '../config/firebase.js';
import { IssueStatus, Issue, JurisdictionMapping } from '@civicmind/shared';
import { v4 as uuidv4 } from 'uuid';

export async function generateAllLeaderboards() {
  const db = getFirestore();
  
  // 1. Get all unique ward IDs from jurisdiction mappings
  const mappingSnapshot = await db.collection(COLLECTIONS.JURISDICTION_MAPPINGS).get();
  const wardIds = new Set<string>();
  mappingSnapshot.docs.forEach(doc => {
    const m = doc.data() as JurisdictionMapping;
    if (m.ward_or_area_id) wardIds.add(m.ward_or_area_id);
  });

  const now = new Date();
  const periodEnd = now.toISOString();
  // 30 days ago
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let generatedCount = 0;

  for (const wardId of wardIds) {
    try {
      const issuesSnapshot = await db
        .collection(COLLECTIONS.ISSUES)
        .where('ward_or_area_id', '==', wardId)
        .where('created_at', '>=', periodStart)
        .where('created_at', '<=', periodEnd)
        .where('is_canonical', '==', true)
        .get();

      const issues = issuesSnapshot.docs.map((d) => d.data() as Issue);

      // Generate even if 1 issue for demo purposes, original had < 3
      if (issues.length < 1) continue;

      const totalIssues = issues.length;
      const resolvedIssues = issues.filter((i) => [
        IssueStatus.VerifiedResolved, IssueStatus.Closed
      ].includes(i.status));
      const resolutionRate = resolvedIssues.length / totalIssues;

      const escalatedIssues = issues.filter((i) => i.escalation_tier_current > 0);
      const escalationRate = escalatedIssues.length / totalIssues;

      let avgResolutionHours = 0;
      const resolvedWithTime = resolvedIssues.filter((i) => i.resolved_at);
      if (resolvedWithTime.length > 0) {
        const totalMs = resolvedWithTime.reduce((sum, i) => {
          return sum + (new Date(i.resolved_at!).getTime() - new Date(i.created_at).getTime());
        }, 0);
        avgResolutionHours = totalMs / resolvedWithTime.length / (1000 * 60 * 60);
      }

      let avgVerificationHours = 0;
      const verifiedWithTime = resolvedIssues.filter((i) => i.verified_at);
      if (verifiedWithTime.length > 0) {
        const totalMs = verifiedWithTime.reduce((sum, i) => {
          return sum + (new Date(i.verified_at!).getTime() - new Date(i.created_at).getTime());
        }, 0);
        avgVerificationHours = totalMs / verifiedWithTime.length / (1000 * 60 * 60);
      }

      const SAVINGS_PROXY: Record<string, number> = {
        pothole: 500, road_damage: 400, streetlight: 200, garbage: 150, water_leakage: 300,
        traffic_signal: 250, drainage: 200, other: 100,
      };
      const estimatedSavings = resolvedIssues.reduce((sum, i) => sum + (SAVINGS_PROXY[i.category] ?? 100), 0);

      // Fetch CSAT responses for these issues to factor into score
      let avgCsatScore = 3; // Neutral default
      const issueIds = issues.map(i => i.issue_id);
      if (issueIds.length > 0) {
        try {
          // Simplify by checking first 30 issues due to Firestore 'in' limit
          const csatSnapshot = await db.collection('csat_responses')
            .where('issue_id', 'in', issueIds.slice(0, 30))
            .get();
          
          if (!csatSnapshot.empty) {
            const sum = csatSnapshot.docs.reduce((acc, doc) => acc + (doc.data().rating || 3), 0);
            avgCsatScore = sum / csatSnapshot.docs.length;
          }
        } catch (e) {
          console.warn('[Leaderboard] Could not fetch CSAT:', e);
        }
      }

      // 40% Resolution Rate, 20% Non-escalation, 20% SLA, 20% CSAT (scaled 1-5 to 0-1)
      const csatFactor = (avgCsatScore - 1) / 4; 
      const healthScore = Math.round(
        (resolutionRate * 40) +
        ((1 - escalationRate) * 20) +
        (Math.max(0, 1 - avgResolutionHours / (7 * 24)) * 20) +
        (csatFactor * 20)
      );

      const reportId = uuidv4();
      
      const report = {
        report_id: reportId,
        ward_or_area_id: wardId,
        period_start: periodStart,
        period_end: periodEnd,
        total_issues: totalIssues,
        resolution_rate: resolutionRate,
        avg_resolution_hours: avgResolutionHours,
        avg_verification_hours: avgVerificationHours,
        escalation_rate: escalationRate,
        estimated_savings_value: estimatedSavings,
        civic_health_score: Math.min(100, Math.max(0, healthScore)),
        generated_at: new Date().toISOString(),
      };

      await db.collection(COLLECTIONS.IMPACT_REPORTS).doc(reportId).set(report);
      generatedCount++;
    } catch (err) {
      console.error(`[Leaderboard] Failed to generate for ward ${wardId}:`, err);
    }
  }

  return generatedCount;
}
