/**
 * Application configuration loaded from environment variables.
 * Fails fast if required vars are missing.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Required environment variable "${key}" is not set. See .env.example`);
  }
  return val;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const config = {
  port: parseInt(optionalEnv('PORT', '4000'), 10),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  isDev: optionalEnv('NODE_ENV', 'development') === 'development',

  firebase: {
    projectId: requireEnv('FIREBASE_PROJECT_ID'),
    storageBucket: requireEnv('FIREBASE_STORAGE_BUCKET'),
  },

  internalServiceSecret: requireEnv('INTERNAL_SERVICE_SECRET'),

  googleMaps: {
    serverApiKey: optionalEnv('GOOGLE_MAPS_SERVER_API_KEY', ''),
  },

  genai: {
    apiKey: optionalEnv('GOOGLE_GENAI_API_KEY', ''),
    modelText: optionalEnv('GEMINI_MODEL_TEXT', 'gemini-3.1-flash-lite'),
    modelVision: optionalEnv('GEMINI_MODEL_VISION', 'gemini-3.1-flash-lite'),
  },

  /** Service area bounding box — Changed to global to prevent OutsideServiceAreaError during demo */
  serviceArea: {
    latMin: parseFloat(optionalEnv('SERVICE_AREA_LAT_MIN', '-90')),
    latMax: parseFloat(optionalEnv('SERVICE_AREA_LAT_MAX', '90')),
    lngMin: parseFloat(optionalEnv('SERVICE_AREA_LNG_MIN', '-180')),
    lngMax: parseFloat(optionalEnv('SERVICE_AREA_LNG_MAX', '180')),
  },

  /** Default SLA hours to use when no config exists for a category/severity (Error Scenario 5.7) */
  defaultSlaHours: parseInt(optionalEnv('DEFAULT_SLA_HOURS', '168'), 10), // 7 days

  /** Duplicate detection radius in meters (default per feature_specifications.md Feature 2) */
  duplicateRadiusMeters: parseInt(optionalEnv('DUPLICATE_RADIUS_METERS', '50'), 10),

  /** Duplicate detection time window in days */
  duplicateTimeWindowDays: parseInt(optionalEnv('DUPLICATE_TIME_WINDOW_DAYS', '30'), 10),
} as const;
