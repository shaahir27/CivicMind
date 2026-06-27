/**
 * Firebase Admin SDK initialization
 * Single shared instance used across all backend services.
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { isAbsolute, join } from 'path';

let app: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (app) return app;

  const projectId = process.env['FIREBASE_PROJECT_ID'];
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is not set');
  }

  // In production / CI: use GOOGLE_APPLICATION_CREDENTIALS env var (ADC)
  // In local dev: load the service account JSON explicitly
  const credentialsPath = process.env['GOOGLE_APPLICATION_CREDENTIALS'];

  if (credentialsPath) {
    try {
      const resolvedPath = isAbsolute(credentialsPath)
        ? credentialsPath
        : join(process.cwd(), credentialsPath);

      const serviceAccount = JSON.parse(
        readFileSync(resolvedPath, 'utf8')
      ) as admin.ServiceAccount;

      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env['FIREBASE_STORAGE_BUCKET'],
        projectId,
      });
    } catch {
      // Fall back to ADC if file not found (e.g. Cloud Run environment)
      app = admin.initializeApp({
        storageBucket: process.env['FIREBASE_STORAGE_BUCKET'],
        projectId,
      });
    }
  } else {
    // Application Default Credentials (Cloud Run, GKE, etc.)
    app = admin.initializeApp({
      storageBucket: process.env['FIREBASE_STORAGE_BUCKET'],
      projectId,
    });
  }

  return app;
}

export function getFirestore(): admin.firestore.Firestore {
  return getFirebaseAdmin().firestore();
}

export function getAuth(): admin.auth.Auth {
  return getFirebaseAdmin().auth();
}

export function getStorage(): admin.storage.Storage {
  return getFirebaseAdmin().storage();
}

/** Firestore collection names — single source of truth */
export const COLLECTIONS = {
  USERS:                  'users',
  DEPARTMENTS:            'departments',
  JURISDICTION_MAPPINGS:  'jurisdiction_mappings',
  ISSUES:                 'issues',
  ISSUE_PHOTOS:           'issue_photos',
  ISSUE_STATUS_HISTORY:   'issue_status_history',
  CORROBORATIONS:         'corroborations',
  AGENT_DECISION_LOG:     'agent_decision_log',
  SLA_CONFIG:             'sla_config',
  ESCALATION_TIERS:       'escalation_tiers',
  NOTIFICATIONS:          'notifications',
  HERO_POINTS_LEDGER:     'hero_points_ledger',
  HOTSPOT_FORECASTS:      'hotspot_forecasts',
  IMPACT_REPORTS:         'impact_reports',
  FORECASTS:              'forecasts',
} as const;
