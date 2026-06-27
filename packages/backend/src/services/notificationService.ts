/**
 * Notification Service
 *
 * Decoupled from the orchestrator — the orchestrator emits "state changed" events
 * by calling this service; the service fans out to notification channels.
 *
 * Per system_architecture.md §3.3 and database_design.md §2.11.
 *
 * MVP scope: in-app channel only (Firestore `notifications` collection).
 * Push/SMS/email channels are Should-Have per mvp_scope.md §2.4 and can follow.
 *
 * This decoupling ensures notification-channel outages never block the core pipeline.
 */

import { getFirestore, COLLECTIONS } from '../config/firebase.js';
import { NotificationChannel, NotificationDeliveryStatus } from '@civicmind/shared';
import { v4 as uuidv4 } from 'uuid';

export interface NotifyStatusChangeInput {
  recipientUserId: string;
  issueId?: string | null;
  message: string;
  channel?: NotificationChannel; // defaults to in_app
}

/**
 * Writes a notification record to Firestore (in-app channel).
 * In a production system, this would also fan out to push/SMS/email providers.
 */
export async function notifyStatusChange(input: NotifyStatusChangeInput): Promise<void> {
  const db = getFirestore();
  const notificationId = uuidv4();
  const now = new Date().toISOString();
  const channel = input.channel ?? NotificationChannel.InApp;

  try {
    await db.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId).set({
      notification_id: notificationId,
      recipient_user_id: input.recipientUserId,
      issue_id: input.issueId ?? null,
      channel,
      message_text: input.message,
      delivery_status: NotificationDeliveryStatus.Sent,
      created_at: now,
    });
  } catch (err) {
    // Per system_architecture.md §3.3: notification failures must NOT block the core pipeline
    console.error('[NotificationService] Failed to write notification:', err);
  }
}

/**
 * Sends notifications to all parties on a state transition.
 * The orchestrator calls this after every status change.
 */
export async function notifyIssueStateChange({
  issueId,
  reporterUserId,
  newStatus,
  departmentName,
}: {
  issueId: string;
  reporterUserId?: string | null;
  newStatus: string;
  departmentName?: string | null;
}): Promise<void> {
  const messages = buildStateChangeMessages(newStatus, departmentName);
  if (!messages.citizen) return;

  // Notify the original reporter (if not anonymous)
  if (reporterUserId) {
    await notifyStatusChange({
      recipientUserId: reporterUserId,
      issueId,
      message: messages.citizen,
    });
  }
}

function buildStateChangeMessages(
  newStatus: string,
  departmentName?: string | null
): { citizen: string | null } {
  const dept = departmentName ?? 'the relevant department';

  const messages: Record<string, string> = {
    validating:          'Your report is being validated. We\'re checking for similar existing reports.',
    duplicate_candidate: 'A similar report already exists nearby. Please confirm if it\'s the same issue.',
    routing:             'Your report has been validated and is being routed to the right department.',
    routed:              `Your report has been routed to ${dept}. They have been notified.`,
    in_progress:         `${dept} has started working on your report. We\'ll update you when it\'s resolved.`,
    escalated:           'Your report has been escalated to a higher authority because it wasn\'t addressed in time.',
    publicly_escalated:  'Your report has been publicly escalated — it is now visible on the public escalation board.',
    resolved:            `${dept} has marked your issue as resolved. We\'re verifying the resolution with photo evidence.`,
    verifying:           'We\'re comparing the before and after photos to verify the resolution.',
    verified_resolved:   'Great news! Your report has been verified as resolved. Thank you for making your community better!',
    disputed_resolution: 'The resolution evidence was rejected. The issue has been reopened and routed back to the department.',
    inconclusive:        'We couldn\'t confirm the resolution from the photos. Please confirm if your issue is actually fixed.',
    closed:              'Your report has been closed.',
  };

  return { citizen: messages[newStatus] ?? null };
}
