/**
 * Agent Decision Audit Log Service
 *
 * Writes every agent invocation to the AgentDecisionLog collection.
 * Per system_architecture.md §3.5 and database_design.md §2.8.
 *
 * Append-only — never updated or deleted.
 * NFR-6: Auditability.
 */

import { getFirestore, COLLECTIONS } from '../config/firebase.js';
import { AgentType } from '@civicmind/shared';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogEntry {
  issueId?: string | null;
  agentType: AgentType;
  inputSummary: string;   // JSON-serialized, summarized (not raw payload)
  outputSummary: string;  // JSON-serialized
  confidenceScore?: number | null;
  agentVersion: string;
}

/**
 * Writes an agent decision audit log entry to Firestore.
 * This must be called from every agent invocation — the orchestrator is responsible
 * for ensuring this is called after each agent returns.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<string> {
  const db = getFirestore();
  const logId = uuidv4();
  const now = new Date().toISOString();

  await db.collection(COLLECTIONS.AGENT_DECISION_LOG).doc(logId).set({
    log_id: logId,
    issue_id: entry.issueId ?? null,
    agent_type: entry.agentType,
    input_summary: entry.inputSummary,
    output_summary: entry.outputSummary,
    confidence_score: entry.confidenceScore ?? null,
    agent_version: entry.agentVersion,
    created_at: now,
  });

  return logId;
}
