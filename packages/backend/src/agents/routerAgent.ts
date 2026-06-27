/**
 * Router Agent
 *
 * Invocation pattern: Synchronous, per-validated issue.
 * Responsibility:
 *   1. Department identification via jurisdiction mapping lookup (DETERMINISTIC)
 *   2. Formal complaint text drafting (GENERATIVE — Gemini text)
 *
 * Per system_architecture.md §3.2, §6 and feature_specifications.md Feature 3.
 *
 * BR-3.1: Routing = (ward × category) lookup → fallback to "City Admin" if no match
 * BR-3.2: Complaint must include category, location, severity, date, corroboration count
 * BR-3.3: Reassignment events are logged (routing itself is deterministic here)
 */

import { GoogleGenAI } from '@google/genai';
import { getFirestore, COLLECTIONS } from '../config/firebase.js';
import { config } from '../config/env.js';
import { generateContentWithRetry } from '../services/ai.js';
import { IssueCategory, IssueSeverity, CATEGORY_LABELS, SEVERITY_LABELS } from '@civicmind/shared';
import type { JurisdictionMapping, Department } from '@civicmind/shared';

const AGENT_VERSION = '1.0.0';

export interface RouterAgentInput {
  issueId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  wardOrAreaId: string;
  locationAddressText: string;
  locationLat: number;
  locationLng: number;
  description?: string | null;
  corroborationCount: number;
  createdAt: string; // ISO8601
}

export interface RouterAgentOutput {
  departmentId: string;
  departmentName: string;
  draftedComplaintText: string;
  slaHours: number;
  inputSummary: string;
  outputSummary: string;
  agentVersion: string;
}

/**
 * Step 1: Deterministic jurisdiction lookup
 * Returns the best matching JurisdictionMapping for (wardOrAreaId × category).
 * Falls back to any `is_fallback=true` entry for the ward, then to any fallback globally.
 */
async function findDepartment(
  wardOrAreaId: string,
  category: IssueCategory
): Promise<{ departmentId: string; departmentName: string } | null> {
  const db = getFirestore();

  // Exact match: ward + category
  const exactSnapshot = await db
    .collection(COLLECTIONS.JURISDICTION_MAPPINGS)
    .where('ward_or_area_id', '==', wardOrAreaId)
    .where('category', '==', category)
    .limit(1)
    .get();

  if (!exactSnapshot.empty) {
    const mapping = exactSnapshot.docs[0]!.data() as JurisdictionMapping;
    const deptDoc = await db.collection(COLLECTIONS.DEPARTMENTS).doc(mapping.department_id).get();
    if (deptDoc.exists) {
      return {
        departmentId: mapping.department_id,
        departmentName: (deptDoc.data() as Department).name,
      };
    }
  }

  // Fallback: any fallback mapping for the ward
  const fallbackSnapshot = await db
    .collection(COLLECTIONS.JURISDICTION_MAPPINGS)
    .where('ward_or_area_id', '==', wardOrAreaId)
    .where('is_fallback', '==', true)
    .limit(1)
    .get();

  if (!fallbackSnapshot.empty) {
    const mapping = fallbackSnapshot.docs[0]!.data() as JurisdictionMapping;
    const deptDoc = await db.collection(COLLECTIONS.DEPARTMENTS).doc(mapping.department_id).get();
    if (deptDoc.exists) {
      return {
        departmentId: mapping.department_id,
        departmentName: (deptDoc.data() as Department).name,
      };
    }
  }

  // Global fallback: any department marked as fallback
  const globalFallbackSnapshot = await db
    .collection(COLLECTIONS.JURISDICTION_MAPPINGS)
    .where('is_fallback', '==', true)
    .limit(1)
    .get();

  if (!globalFallbackSnapshot.empty) {
    const mapping = globalFallbackSnapshot.docs[0]!.data() as JurisdictionMapping;
    const deptDoc = await db.collection(COLLECTIONS.DEPARTMENTS).doc(mapping.department_id).get();
    if (deptDoc.exists) {
      return {
        departmentId: mapping.department_id,
        departmentName: (deptDoc.data() as Department).name,
      };
    }
  }

  return null;
}

/**
 * Fetches the SLA hours for this category × severity from Firestore.
 * Falls back to config.defaultSlaHours per Error Scenario 5.7.
 */
async function fetchSlaHours(category: IssueCategory, severity: IssueSeverity): Promise<number> {
  const db = getFirestore();
  const snapshot = await db
    .collection(COLLECTIONS.SLA_CONFIG)
    .where('category', '==', category)
    .where('severity', '==', severity)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0]!.data();
    return (doc['sla_hours'] as number) ?? config.defaultSlaHours;
  }

  console.warn(`[RouterAgent] No SLA config for ${category}/${severity} — using default ${config.defaultSlaHours}h`);
  return config.defaultSlaHours;
}

/**
 * Step 2: Generative complaint drafting via Gemini text model.
 * Per BR-3.2: must include category, location, severity, date, corroboration count.
 */
async function draftComplaintText(
  input: RouterAgentInput,
  departmentName: string
): Promise<string> {
  const apiKey = config.genai.apiKey;

  const formattedDate = new Date(input.createdAt).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const corroborationNote = input.corroborationCount > 1
    ? `This issue has been independently corroborated by ${input.corroborationCount} citizens.`
    : 'This issue was reported by a citizen.';

  if (!apiKey) {
    // Deterministic template fallback
    return buildTemplateFallback(input, departmentName, formattedDate, corroborationNote);
  }

  const genai = new GoogleGenAI({ apiKey });

  const prompt = `You are CivicMind's Router Agent. Draft a formal civic complaint letter to the ${departmentName} department.

The letter must:
1. Be written in formal English, addressed "To the Concerned Authority,"
2. Include EXACTLY: issue category ("${CATEGORY_LABELS[input.category]}"), precise location ("${input.locationAddressText || `Lat: ${input.locationLat}, Lng: ${input.locationLng}`}"), severity level ("${SEVERITY_LABELS[input.severity]}"), date first reported ("${formattedDate}"), and corroboration statement ("${corroborationNote}")
3. Be concise (3–4 paragraphs)
4. Close with "Submitted via CivicMind Citizen Reporting Platform"
5. Include the CivicMind Issue Reference: ${input.issueId}
${input.description ? `6. Incorporate the citizen's description: "${input.description}"` : ''}

Write the complete complaint letter. Do NOT include any prefix like "Here is..." — output only the letter itself.`;

  try {
    const request = {
      model: config.genai.modelText,
      contents: prompt,
      config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ]
      }
    };
    const result = await generateContentWithRetry(genai, request);
    const text = result.text.trim();
    if (text.length < 50) throw new Error('Response too short');
    return text;
  } catch (err) {
    console.error('[RouterAgent] Gemini text call failed:', err);
    return buildTemplateFallback(input, departmentName, formattedDate, corroborationNote);
  }
}

function buildTemplateFallback(
  input: RouterAgentInput,
  departmentName: string,
  formattedDate: string,
  corroborationNote: string
): string {
  return `To the Concerned Authority,
${departmentName}

Subject: Civic Issue Report — ${CATEGORY_LABELS[input.category]} (${SEVERITY_LABELS[input.severity]} Severity)

We are writing to bring to your attention a ${SEVERITY_LABELS[input.severity].toLowerCase()}-severity ${CATEGORY_LABELS[input.category].toLowerCase()} issue reported at the following location: ${input.locationAddressText || `Coordinates: ${input.locationLat}, ${input.locationLng}`}.

This issue was first reported on ${formattedDate}. ${corroborationNote}${input.description ? ` The reporting citizen provided the following additional details: "${input.description}"` : ''}

We respectfully request that your department inspect and address this matter at the earliest opportunity, in accordance with the applicable Service Level Agreement.

CivicMind Issue Reference: ${input.issueId}

Submitted via CivicMind Citizen Reporting Platform`;
}

export async function runRouterAgent(
  input: RouterAgentInput
): Promise<RouterAgentOutput> {
  // Step 1: Deterministic department lookup
  const deptResult = await findDepartment(input.wardOrAreaId, input.category);

  const departmentId = deptResult?.departmentId ?? 'city-admin-fallback';
  const departmentName = deptResult?.departmentName ?? 'City Administration';

  // Fetch SLA hours
  const slaHours = await fetchSlaHours(input.category, input.severity);

  // Step 2: Generative complaint drafting
  let draftedComplaintText = await draftComplaintText(input, departmentName);

  // Validate complaint has required fields (BR-3.2 enforcement).
  // If the AI output is missing required fields, actually use the
  // deterministic template instead of just logging a warning.
  const hasRequiredFields =
    draftedComplaintText.includes(input.issueId) &&
    draftedComplaintText.length >= 100;

  if (!hasRequiredFields) {
    console.warn('[RouterAgent] Drafted complaint missing required fields — using template fallback');
    const formattedDate = new Date(input.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const corroborationNote = input.corroborationCount > 1
      ? `This issue has been independently corroborated by ${input.corroborationCount} citizens.`
      : 'This issue was reported by a citizen.';
    draftedComplaintText = buildTemplateFallback(input, departmentName, formattedDate, corroborationNote);
  }

  const inputSummary = JSON.stringify({
    issue_id: input.issueId,
    category: input.category,
    severity: input.severity,
    ward: input.wardOrAreaId,
    corroboration_count: input.corroborationCount,
  });

  const outputSummary = JSON.stringify({
    department_id: departmentId,
    department_name: departmentName,
    sla_hours: slaHours,
    complaint_length: draftedComplaintText.length,
  });

  return {
    departmentId,
    departmentName,
    draftedComplaintText,
    slaHours,
    inputSummary,
    outputSummary,
    agentVersion: AGENT_VERSION,
  };
}

export { AGENT_VERSION as ROUTER_AGENT_VERSION };
