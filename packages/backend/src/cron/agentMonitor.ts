import { getFirestore, COLLECTIONS } from '../config/firebase.js';
import type { AgentDecisionLog } from '@civicmind/shared';

export async function runAgentAnomalyMonitor(): Promise<number> {
  console.log('[CRON] Running Agent Anomaly Monitor...');
  const db = getFirestore();
  
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // We need to fetch all logs in the last 30 days
  const logsSnapshot = await db.collection(COLLECTIONS.AGENT_DECISION_LOG)
    .where('created_at', '>=', thirtyDaysAgo)
    .get();

  const logs = logsSnapshot.docs.map(d => d.data() as AgentDecisionLog);
  
  // Group by agent_type
  const agentStats: Record<string, { recentSum: number, recentCount: number, baselineSum: number, baselineCount: number }> = {};

  for (const log of logs) {
    if (typeof log.confidence_score !== 'number') continue;

    const type = log.agent_type;
    if (!agentStats[type]) {
      agentStats[type] = { recentSum: 0, recentCount: 0, baselineSum: 0, baselineCount: 0 };
    }

    if (log.created_at >= sevenDaysAgo) {
      agentStats[type].recentSum += log.confidence_score;
      agentStats[type].recentCount += 1;
    } else {
      agentStats[type].baselineSum += log.confidence_score;
      agentStats[type].baselineCount += 1;
    }
  }

  let alertsCreated = 0;

  for (const [agentType, stats] of Object.entries(agentStats)) {
    const recentAvg = stats.recentCount > 0 ? stats.recentSum / stats.recentCount : 0;
    const baselineAvg = stats.baselineCount > 0 ? stats.baselineSum / stats.baselineCount : 0;

    // If we have enough data and recent average drops >15% compared to baseline
    if (stats.baselineCount > 5 && stats.recentCount > 0) {
      const dropRatio = (baselineAvg - recentAvg) / baselineAvg;
      
      if (dropRatio > 0.15) {
        // Create an alert
        const { v4: uuidv4 } = await import('uuid');
        const alertId = uuidv4();
        await db.collection('agent_health_alerts').doc(alertId).set({
          alert_id: alertId,
          agent_type: agentType,
          baseline_avg: baselineAvg,
          recent_avg: recentAvg,
          drop_percentage: Math.round(dropRatio * 100),
          is_active: true,
          created_at: new Date().toISOString()
        });
        console.log(`[ALERT] Agent ${agentType} confidence dropped by ${Math.round(dropRatio * 100)}% (Baseline: ${baselineAvg.toFixed(2)}, Recent: ${recentAvg.toFixed(2)})`);
        alertsCreated++;
      }
    }
  }

  return alertsCreated;
}
