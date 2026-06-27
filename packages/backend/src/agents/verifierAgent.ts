/**
 * Verifier Agent
 *
 * Invocation pattern: Synchronous, per resolution submission.
 * Responsibility: Before/after photo comparison → verified_resolved / inconclusive / disputed_resolution.
 *
 * Per system_architecture.md §3.2, §6 and feature_specifications.md Feature 5.
 *
 * BR-5.2:
 *   confidence ≥ 0.75 → verified_resolved
 *   confidence 0.4–0.75 → inconclusive
 *   confidence < 0.4 → disputed_resolution
 *
 * Category-aware prompting per Feature 5 spec.
 */

import { GoogleGenAI } from '@google/genai';
import { getStorage } from '../config/firebase.js';
import { config } from '../config/env.js';
import { generateContentWithRetry } from '../services/ai.js';
import {
  IssueCategory,
  VerificationResult,
  VERIFICATION_RESOLVED_THRESHOLD,
  VERIFICATION_DISPUTED_THRESHOLD,
  CATEGORY_LABELS,
} from '@civicmind/shared';

const AGENT_VERSION = '1.0.0';

export interface VerifierAgentInput {
  issueId: string;
  category: IssueCategory;
  beforePhotoStoragePath: string;
  afterPhotoStoragePath: string;
}

export interface VerifierAgentOutput {
  result: VerificationResult;
  confidence: number;
  rationale: string;
  inputSummary: string;
  outputSummary: string;
  agentVersion: string;
}

/** Category-specific prompts for expected after-repair appearance */
const CATEGORY_REPAIR_EXPECTATIONS: Record<IssueCategory, string> = {
  [IssueCategory.Pothole]:
    'After repair: the road surface should appear filled, level, and smooth. The cavity visible in the before photo should be absent.',
  [IssueCategory.Streetlight]:
    'After repair: the streetlight should appear operational (light on if nighttime photo) or the fixture/pole visibly repaired and upright if daytime. Note: A daytime "after" photo of a previously broken pole is sufficient if structurally intact.',
  [IssueCategory.Garbage]:
    'After repair: the garbage/waste visible in the before photo should be cleared. The area should appear clean.',
  [IssueCategory.WaterLeakage]:
    'After repair: water pooling or flowing visible in the before photo should be absent. Surface may still be wet or show fresh patching from underground pipe repair. Focus on the absence of active leaking.',
  [IssueCategory.TrafficSignal]:
    'After repair: the traffic signal should appear operational — lights visible and housing intact.',
  [IssueCategory.Drainage]:
    'After repair: the drainage blockage or overflow visible in the before photo should be resolved. No active water pooling. Fresh concrete or dug-up earth around the drain is acceptable if the blockage itself is cleared.',
  [IssueCategory.RoadDamage]:
    'After repair: the road surface damage should be repaired — cracks, crumbling, or uneven sections should appear patched or resurfaced.',
  [IssueCategory.Other]:
    'After repair: the issue visible in the before photo should appear to be addressed or absent in the after photo.',
};

async function loadPhotoBase64(storagePath: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const bucket = getStorage().bucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [buffer] = await file.download();
    return { mimeType: 'image/jpeg', data: buffer.toString('base64') };
  } catch {
    return null;
  }
}

export async function runVerifierAgent(
  input: VerifierAgentInput
): Promise<VerifierAgentOutput> {
  const apiKey = config.genai.apiKey;

  const inputSummary = JSON.stringify({
    issue_id: input.issueId,
    category: input.category,
    has_before: !!input.beforePhotoStoragePath,
    has_after: !!input.afterPhotoStoragePath,
  });

  if (!apiKey) {
    // Fallback if AI not configured: return inconclusive
    const output: VerifierAgentOutput = {
      result: VerificationResult.Inconclusive,
      confidence: 0.5,
      rationale: 'AI verification unavailable — manual review required.',
      inputSummary,
      outputSummary: JSON.stringify({ result: 'inconclusive', reason: 'AI unavailable' }),
      agentVersion: AGENT_VERSION,
    };
    return output;
  }

  const [beforePhoto, afterPhoto] = await Promise.all([
    loadPhotoBase64(input.beforePhotoStoragePath),
    loadPhotoBase64(input.afterPhotoStoragePath),
  ]);

  if (!beforePhoto || !afterPhoto) {
    return {
      result: VerificationResult.Inconclusive,
      confidence: 0.3,
      rationale: 'Could not load one or both photos for comparison. Defaulting to inconclusive.',
      inputSummary,
      outputSummary: JSON.stringify({ result: 'inconclusive', reason: 'Photo load failure' }),
      agentVersion: AGENT_VERSION,
    };
  }

  const categoryLabel = CATEGORY_LABELS[input.category];
  const repairExpectation = CATEGORY_REPAIR_EXPECTATIONS[input.category];

  const prompt = `You are CivicMind's Verifier Agent. Compare a BEFORE and AFTER photo of a civic issue.

Issue Category: ${categoryLabel}
${repairExpectation}

Important notes:
- Account for different lighting, time of day, or weather between photos.
- If image quality (blur, darkness, obstruction) prevents reliable comparison, confidence should be low (0.3 or below), NOT high.
- If repair is not visually obvious (e.g., underground pipe with restored surface), lean toward inconclusive rather than disputed.

Output ONLY a JSON object:
{
  "verification_confidence": <float 0.0–1.0, where 1.0 = definitely resolved>,
  "rationale": "<1–2 sentences explaining your assessment>"
}

Do not output anything outside this JSON.`;

  try {
    const genai = new GoogleGenAI({ apiKey });

    const request = {
      model: config.genai.modelVision,
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { text: 'BEFORE photo (original issue):' },
          { inlineData: beforePhoto },
          { text: 'AFTER photo (claimed repair):' },
          { inlineData: afterPhoto },
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
    const parsed = JSON.parse(text) as { verification_confidence: number; rationale: string };

    const confidence = Math.min(1, Math.max(0, parsed.verification_confidence ?? 0.5));
    const rationale = parsed.rationale ?? 'No rationale provided.';

    let verificationResult: VerificationResult;
    if (confidence >= VERIFICATION_RESOLVED_THRESHOLD) {
      verificationResult = VerificationResult.VerifiedResolved;
    } else if (confidence >= VERIFICATION_DISPUTED_THRESHOLD) {
      verificationResult = VerificationResult.Inconclusive;
    } else {
      verificationResult = VerificationResult.DisputedResolution;
    }

    const outputSummary = JSON.stringify({ result: verificationResult, confidence, rationale });

    return {
      result: verificationResult,
      confidence,
      rationale,
      inputSummary,
      outputSummary,
      agentVersion: AGENT_VERSION,
    };
  } catch (err) {
    console.error('[VerifierAgent] Gemini call failed:', err);
    return {
      result: VerificationResult.Inconclusive,
      confidence: 0.3,
      rationale: 'Verification could not be completed due to a processing error. Manual review required.',
      inputSummary,
      outputSummary: JSON.stringify({ result: 'inconclusive', reason: 'AI error' }),
      agentVersion: AGENT_VERSION,
    };
  }
}

export { AGENT_VERSION as VERIFIER_AGENT_VERSION };
