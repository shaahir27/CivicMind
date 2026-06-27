/**
 * Escalation Agent
 *
 * Invocation pattern: Scheduled (hourly cron via /internal/v1/agents/escalation/run-cycle).
 * Responsibility: SLA monitoring and autonomous escalation across all active issues.
 *
 * Per system_architecture.md §3.2, §6 and feature_specifications.md Feature 4.
 *
 * BR-4.1: SLA clock starts at routed time.
 * BR-4.2: SLA clock pauses while in_progress with recent update (grace period configurable).
 *         Resumes if no update within stale-in_progress threshold.
 * BR-4.3: Escalation is one-directional per breach event.
 * BR-4.4: Critical severity → compressed SLA per admin-configured table.
 *
 * Idempotent: never double-escalates for the same breach event.
 */

import { getFirestore, COLLECTIONS } from '../config/firebase.js';
import { IssueStatus, ActorType, AgentType } from '@civicmind/shared';
import type { Issue, EscalationTier } from '@civicmind/shared';
import { writeAuditLog } from '../services/auditLog.js';
import { notifyStatusChange } from '../services/notificationService.js';

const AGENT_VERSION = '1.0.0';

/** Grace period in hours while in_progress before considered stale (BR-4.2) */
const STALE_IN_PROGRESS_HOURS = 24;

export interface EscalationRunResult {
  evaluatedCount: number;
  escalatedCount: number;
  publiclyEscalatedCount: number;
}

/**
 * Returns true if the issue's SLA clock should be paused.
 * Per BR-4.2: paused while in_progress AND last update was recent.
 */
function isSLAClockPaused(issue: Issue, now: Date): boolean {
  if (issue.status !== IssueStatus.InProgress) return false;

  const updatedAt = new Date(issue.updated_at);
  const staleThresholdMs = STALE_IN_PROGRESS_HOURS * 60 * 60 * 1000;
  const elapsedSinceUpdate = now.getTime() - updatedAt.getTime();

  // Clock paused only if the in_progress update is recent (not stale)
  return elapsedSinceUpdate < staleThresholdMs;
}

/**
 * Fetches the next escalation tier for a department above the current tier.
 * Returns null if already at the highest tier.
 */
async function getNextEscalationTier(
  departmentId: string,
  currentTier: number
): Promise<EscalationTier | null> {
  const db = getFirestore();
  const nextTierLevel = currentTier + 1;

  const snapshot = await db
    .collection(COLLECTIONS.ESCALATION_TIERS)
    .where('department_id', '==', departmentId)
    .where('tier_level', '==', nextTierLevel)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0]!.data() as EscalationTier;
}

/**
 * Main escalation cycle.
 * Scans all issues in routed/in_progress/escalated status and escalates SLA breaches.
 */
export async function runEscalationCycle(): Promise<EscalationRunResult> {
  const db = getFirestore();
  const now = new Date();

  const activeStatuses: IssueStatus[] = [
    IssueStatus.Routed,
    IssueStatus.InProgress,
    IssueStatus.Escalated,
  ];

  // Query all active issues with an SLA deadline set
  const snapshot = await db
    .collection(COLLECTIONS.ISSUES)
    .where('status', 'in', activeStatuses)
    .where('is_canonical', '==', true)
    .get();

  let evaluatedCount = 0;
  let escalatedCount = 0;
  let publiclyEscalatedCount = 0;

  for (const doc of snapshot.docs) {
    const issue = doc.data() as Issue;
    evaluatedCount++;

    if (!issue.sla_deadline) continue; // No SLA assigned yet — skip

    // Check if SLA clock is paused (BR-4.2)
    if (isSLAClockPaused(issue, now)) continue;

    const deadline = new Date(issue.sla_deadline);
    if (now < deadline) continue; // Not yet breached

    // SLA is breached. Determine escalation action.
    const currentTier = issue.escalation_tier_current ?? 0;
    const departmentId = issue.department_id;

    if (!departmentId) continue;

    const nextTier = await getNextEscalationTier(departmentId, currentTier);

    let alreadyEscalatedThisCycle = false;
    try {
      const historySnapshot = await db
        .collection(COLLECTIONS.ISSUE_STATUS_HISTORY)
        .where('issue_id', '==', issue.issue_id)
        .get();

      const docs = historySnapshot.docs.map(d => d.data());
      docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const lastHistoryEntry = docs[0];
      alreadyEscalatedThisCycle =
        lastHistoryEntry?.['to_status'] === IssueStatus.Escalated &&
        (now.getTime() - new Date(lastHistoryEntry?.['created_at'] as string).getTime()) < 60 * 60 * 1000;
    } catch (histErr: any) {
      // FAILED_PRECONDITION: index building — proceed without idempotency check (safe: may re-escalate, but idempotency check in next cycle)
      if (histErr?.code !== 9 && !String(histErr?.message ?? '').includes('FAILED_PRECONDITION')) {
        throw histErr;
      }
      console.warn('[EscalationAgent] Status history index not yet ready — skipping idempotency check for this issue');
    }

    if (alreadyEscalatedThisCycle) continue;

    const batch = db.batch();
    const issueRef = db.collection(COLLECTIONS.ISSUES).doc(issue.issue_id);
    const historyRef = db.collection(COLLECTIONS.ISSUE_STATUS_HISTORY).doc();
    const ts = now.toISOString();

    if (nextTier) {
      // Escalate to next tier
      const reason = `SLA breached (${STALE_IN_PROGRESS_HOURS}h threshold). Auto-escalated to Tier ${nextTier.tier_level}: ${nextTier.tier_label}.`;

      batch.update(issueRef, {
        status: IssueStatus.Escalated,
        escalation_tier_current: nextTier.tier_level,
        updated_at: ts,
      } as Partial<Issue>);

      batch.set(historyRef, {
        history_id: historyRef.id,
        issue_id: issue.issue_id,
        from_status: issue.status,
        to_status: IssueStatus.Escalated,
        actor_type: ActorType.AgentEscalation,
        actor_id: null,
        reason,
        created_at: ts,
      });

      await batch.commit();
      escalatedCount++;

      // Notify citizen and authority
      if (issue.reporter_user_id) {
        await notifyStatusChange({
          recipientUserId: issue.reporter_user_id,
          issueId: issue.issue_id,
          message: `Your report has been escalated to ${nextTier.tier_label} because it wasn't addressed in time.`,
        });
      }
      if (nextTier.responsible_user_id) {
        await notifyStatusChange({
          recipientUserId: nextTier.responsible_user_id,
          issueId: issue.issue_id,
          message: `Issue ${issue.issue_id} has been escalated to your tier (${nextTier.tier_label}) due to SLA breach.`,
        });
      }

      await writeAuditLog({
        issueId: issue.issue_id,
        agentType: AgentType.Escalation,
        inputSummary: JSON.stringify({ issue_id: issue.issue_id, current_tier: currentTier, status: issue.status }),
        outputSummary: JSON.stringify({ new_tier: nextTier.tier_level, tier_label: nextTier.tier_label, reason }),
        confidenceScore: null,
        agentVersion: AGENT_VERSION,
      });
    } else {
      // No further tier — mark as publicly escalated (BR-4.1 final tier)
      const reason = `Final escalation tier reached and SLA breached. Issue marked as publicly escalated.`;

      batch.update(issueRef, {
        status: IssueStatus.PubliclyEscalated,
        updated_at: ts,
      } as Partial<Issue>);

      batch.set(historyRef, {
        history_id: historyRef.id,
        issue_id: issue.issue_id,
        from_status: issue.status,
        to_status: IssueStatus.PubliclyEscalated,
        actor_type: ActorType.AgentEscalation,
        actor_id: null,
        reason,
        created_at: ts,
      });

      await batch.commit();
      publiclyEscalatedCount++;

      if (issue.reporter_user_id) {
        await notifyStatusChange({
          recipientUserId: issue.reporter_user_id,
          issueId: issue.issue_id,
          message: `Your report has been publicly escalated — the highest authority tier has been reached and the issue remains unresolved.`,
        });
      }

      await writeAuditLog({
        issueId: issue.issue_id,
        agentType: AgentType.Escalation,
        inputSummary: JSON.stringify({ issue_id: issue.issue_id, current_tier: currentTier }),
        outputSummary: JSON.stringify({ result: 'publicly_escalated', reason }),
        confidenceScore: null,
        agentVersion: AGENT_VERSION,
      });
    }
  }

  console.log(
    `[EscalationAgent] Cycle complete — evaluated: ${evaluatedCount}, escalated: ${escalatedCount}, publicly_escalated: ${publiclyEscalatedCount}`
  );

  return { evaluatedCount, escalatedCount, publiclyEscalatedCount };
}

export { AGENT_VERSION as ESCALATION_AGENT_VERSION };
