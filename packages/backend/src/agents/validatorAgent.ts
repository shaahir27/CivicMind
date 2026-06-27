/**
 * Validator Agent
 *
 * Invocation pattern: Synchronous, per-submission (post-Reporter).
 * Responsibility: Duplicate detection via geo+category filtering + visual similarity scoring.
 * Confidence-threshold branching: auto-merge / prompt-confirm / unique.
 *
 * Per system_architecture.md §3.2, §6 and feature_specifications.md Feature 2.
 *
 * BR-2.1: Match requires proximity (configurable radius) AND category match.
 * BR-2.2: confidence ≥ 0.8 → auto_merge
 * BR-2.3: confidence 0.5–0.8 → prompt_confirm
 * Below 0.5 → unique
 */

import { GoogleGenAI } from '@google/genai';
import { getFirestore, getStorage, COLLECTIONS } from '../config/firebase.js';
import { config } from '../config/env.js';
import { generateContentWithRetry } from '../services/ai.js';
import {
  IssueCategory,
  IssueStatus,
  getDuplicateAction,
  geodesicDistanceMeters,
} from '@civicmind/shared';
import type { Issue, IssuePhoto } from '@civicmind/shared';

const AGENT_VERSION = '1.0.0';

export interface ValidatorAgentInput {
  newIssueId: string;
  category: IssueCategory;
  locationLat: number;
  locationLng: number;
  wardOrAreaId: string;
  photoStoragePaths: string[]; // Cloud Storage paths of the submitted photos
}

export type DuplicateActionResult = 'auto_merge' | 'prompt_confirm' | 'unique';

export interface ValidatorAgentOutput {
  action: DuplicateActionResult;
  matchedIssueId: string | null;
  matchConfidence: number;
  inputSummary: string;
  outputSummary: string;
  agentVersion: string;
}

/**
 * Resolves a signed/public URL for a GCS file path, used for vision model.
 * Falls back to a placeholder if storage is not available.
 */
async function getImageBase64FromStorage(storagePath: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const bucket = getStorage().bucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [buffer] = await file.download();
    return {
      mimeType: 'image/jpeg', // default; could be sniffed from metadata
      data: buffer.toString('base64'),
    };
  } catch {
    return null;
  }
}

/**
 * Uses Gemini Vision to score visual similarity between two sets of photos.
 * Returns a confidence score 0.0–1.0.
 */
async function scoreVisualSimilarity(
  newPhotoPaths: string[],
  existingPhotoPaths: string[],
  category: IssueCategory
): Promise<number> {
  const apiKey = config.genai.apiKey;
  if (!apiKey) return 0.5; // neutral if AI unavailable

  // Load up to 1 photo from each side (cost-efficient)
  const [newPhoto, existingPhoto] = await Promise.all([
    newPhotoPaths[0] ? getImageBase64FromStorage(newPhotoPaths[0]) : null,
    existingPhotoPaths[0] ? getImageBase64FromStorage(existingPhotoPaths[0]) : null,
  ]);

  if (!newPhoto || !existingPhoto) return 0.5;

  const genai = new GoogleGenAI({ apiKey });

  const prompt = `You are CivicMind's Validator Agent. Compare these two photos of a "${category}" civic issue.
Determine if they show the SAME physical issue at the SAME location (viewed from potentially different angles or times).

Output ONLY a JSON object: { "same_issue_confidence": <float 0.0-1.0>, "reason": "<one sentence>" }
- 1.0 = definitely the same issue
- 0.0 = definitely different issues or locations
- 0.5 = unclear

Output ONLY the JSON object.`;

  try {
    const request = {
      model: config.genai.modelVision,
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { text: 'Photo 1 (new report):' },
          { inlineData: newPhoto },
          { text: 'Photo 2 (existing report):' },
          { inlineData: existingPhoto },
          { text: 'Output JSON:' },
        ],
      }],
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

    const text = result.text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(text) as { same_issue_confidence: number };
    return Math.min(1, Math.max(0, parsed.same_issue_confidence ?? 0.5));
  } catch {
    return 0.5;
  }
}

export async function runValidatorAgent(
  input: ValidatorAgentInput
): Promise<ValidatorAgentOutput> {
  const db = getFirestore();
  const now = new Date();
  const timeWindowStart = new Date(now.getTime() - config.duplicateTimeWindowDays * 24 * 60 * 60 * 1000).toISOString();

  // Step 1: Geo+category deterministic filter
  // Query issues in same ward/area, same category, same or nearby status (open/in_progress)
  // Exclude already-resolved-and-verified (per BR validation rules)
  const terminalStatuses: IssueStatus[] = [
    IssueStatus.VerifiedResolved,
    IssueStatus.Closed,
    IssueStatus.DisputedResolution, // re-opened ones will come back in 'routed'
  ];

  // NOTE: This query requires a composite index on (category, is_canonical, ward_or_area_id, created_at).
  // If the index is still building (gRPC FAILED_PRECONDITION / code 9), we fall back to "unique"
  // so the submission can proceed. The index will be ready for subsequent submissions.
  let candidateSnapshot: FirebaseFirestore.QuerySnapshot;
  try {
    candidateSnapshot = await db
      .collection(COLLECTIONS.ISSUES)
      .where('category', '==', input.category)
      .where('ward_or_area_id', '==', input.wardOrAreaId)
      .where('is_canonical', '==', true)
      .where('created_at', '>=', timeWindowStart)
      .get();
  } catch (queryErr: any) {
    // gRPC FAILED_PRECONDITION (code 9) means the index is still building — safe to treat as unique
    if (queryErr?.code === 9 || String(queryErr?.message).includes('FAILED_PRECONDITION')) {
      console.warn('[ValidatorAgent] Composite index not yet ready — treating submission as unique (safe fallback)');
      const inputSummary = JSON.stringify({ category: input.category, ward: input.wardOrAreaId, candidates_found: 0, fallback: 'index_building' });
      const outputSummary = JSON.stringify({ action: 'unique', reason: 'Index still building — fallback to unique' });
      return { action: 'unique', matchedIssueId: null, matchConfidence: 0, inputSummary, outputSummary, agentVersion: AGENT_VERSION };
    }
    throw queryErr;
  }

  // Filter out the new issue itself and terminal-status issues
  const geoFilteredCandidates: Issue[] = [];
  for (const doc of candidateSnapshot.docs) {
    const candidate = doc.data() as Issue;
    if (candidate.issue_id === input.newIssueId) continue;
    if (terminalStatuses.includes(candidate.status)) continue;

    const distanceM = geodesicDistanceMeters(
      input.locationLat, input.locationLng,
      candidate.location_lat, candidate.location_lng
    );

    if (distanceM <= config.duplicateRadiusMeters) {
      geoFilteredCandidates.push(candidate);
    }
  }

  if (geoFilteredCandidates.length === 0) {
    const inputSummary = JSON.stringify({ category: input.category, ward: input.wardOrAreaId, candidates_found: 0 });
    const outputSummary = JSON.stringify({ action: 'unique', reason: 'No geo+category candidates found' });
    return { action: 'unique', matchedIssueId: null, matchConfidence: 0, inputSummary, outputSummary, agentVersion: AGENT_VERSION };
  }

  // Step 2: Visual similarity scoring against best geo candidate
  // Sort candidates by proximity (closest first)
  const sortedCandidates = geoFilteredCandidates.sort((a, b) => {
    const dA = geodesicDistanceMeters(input.locationLat, input.locationLng, a.location_lat, a.location_lng);
    const dB = geodesicDistanceMeters(input.locationLat, input.locationLng, b.location_lat, b.location_lng);
    return dA - dB;
  });

  const bestCandidate = sortedCandidates[0]!;

  // Fetch existing photos for best candidate
  const existingPhotosSnapshot = await db
    .collection(COLLECTIONS.ISSUE_PHOTOS)
    .where('issue_id', '==', bestCandidate.issue_id)
    .where('photo_type', '==', 'before')
    .limit(1)
    .get();

  const existingPhotoPaths = existingPhotosSnapshot.docs.map(d => (d.data() as IssuePhoto).storage_path);

  // Visual similarity score (geo alone already gives confidence signal; vision refines it)
  let visualScore = 0.5;
  if (input.photoStoragePaths.length > 0 && existingPhotoPaths.length > 0) {
    visualScore = await scoreVisualSimilarity(
      input.photoStoragePaths,
      existingPhotoPaths,
      input.category
    );
  }

  // Combine geo proximity and visual similarity for final confidence
  // Closer distance → higher geo contribution
  const distanceM = geodesicDistanceMeters(
    input.locationLat, input.locationLng,
    bestCandidate.location_lat, bestCandidate.location_lng
  );
  const geoScore = Math.max(0, 1 - (distanceM / config.duplicateRadiusMeters));

  // Weighted: 60% geo, 40% visual (geo is deterministic and more reliable at small scale)
  const combinedConfidence = geoScore * 0.6 + visualScore * 0.4;

  const action = getDuplicateAction(combinedConfidence) as DuplicateActionResult;

  const inputSummary = JSON.stringify({
    category: input.category,
    ward: input.wardOrAreaId,
    candidates_found: geoFilteredCandidates.length,
    best_candidate_id: bestCandidate.issue_id,
    distance_m: Math.round(distanceM),
  });
  const outputSummary = JSON.stringify({
    action,
    matched_issue_id: bestCandidate.issue_id,
    combined_confidence: combinedConfidence,
    geo_score: geoScore,
    visual_score: visualScore,
  });

  return {
    action,
    matchedIssueId: bestCandidate.issue_id,
    matchConfidence: combinedConfidence,
    inputSummary,
    outputSummary,
    agentVersion: AGENT_VERSION,
  };
}

export { AGENT_VERSION as VALIDATOR_AGENT_VERSION };
