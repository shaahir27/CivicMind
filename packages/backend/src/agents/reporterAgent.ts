/**
 * Reporter Agent
 *
 * Invocation pattern: Synchronous, per-submission.
 * Responsibility: Vision-based photo classification → category + severity.
 *
 * Per system_architecture.md §3.2 and feature_specifications.md Feature 1.
 * Per system_architecture.md §6: single-pass inference, prompt-engineered classification.
 */

import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { generateContentWithRetry } from '../services/ai.js';
import {
  IssueCategory,
  IssueSeverity,
  AgentType,
} from '@civicmind/shared';

const AGENT_VERSION = '1.0.0';

export interface ReporterAgentInput {
  /** GCS paths or base64-encoded image data URIs for the submitted photos */
  photoBase64List: Array<{ mimeType: string; data: string }>;
  /** Optional citizen description to supplement visual classification */
  description?: string | null;
}

export interface ReporterAgentOutput {
  isCivicIssue: boolean;
  suggestedCategory: IssueCategory;
  categoryConfidence: number;
  suggestedSeverity: IssueSeverity;
  severityConfidence: number;
  /** Input summary for audit log (no raw image data) */
  inputSummary: string;
  /** Output summary for audit log */
  outputSummary: string;
  agentVersion: string;
}

const CATEGORY_ENUM_VALUES = Object.values(IssueCategory).join(', ');
const SEVERITY_ENUM_VALUES = Object.values(IssueSeverity).join(', ');

const SYSTEM_PROMPT = `You are CivicMind's Reporter Agent — a vision AI that classifies civic infrastructure issues from photos.

You MUST output a valid JSON object with exactly these fields:
{
  "is_civic_issue": <boolean>,
  "category": "<one of: ${CATEGORY_ENUM_VALUES}>",
  "category_confidence": <float 0.0–1.0>,
  "severity": "<one of: ${SEVERITY_ENUM_VALUES}>",
  "severity_confidence": <float 0.0–1.0>,
  "brief_reason": "<one sentence explaining the classification>",
  "secondary_category": "<one of: ${CATEGORY_ENUM_VALUES} or null if no secondary issue>"
}

Category identification rules (use the MOST specific match):
- pothole: Road surface cavity, crater, or depression — vehicle-wheel sized or larger.
- road_damage: Cracked, crumbling, subsided, or uneven road surface without a distinct hole.
- streetlight: Broken, leaning, dark, or sparking street lamp or pole.
- garbage: Overflowing bins, dumped waste, litter accumulation on roads/public spaces.
- water_leakage: Gushing pipe, pooled water from a broken main, sewage overflow.
- traffic_signal: Non-functional, broken, covered, or missing traffic light.
- drainage: Blocked or overflowing stormwater drain, gutter, or manhole.
- other: Civic issue not matching any above category.

Severity rules (be precise — do NOT upgrade severity without clear visual evidence):
- critical: IMMEDIATE public safety hazard visible in frame — exposed live electrical wire, structural collapse actively occurring, fully blocked emergency access road, major burst water main flooding roadway.
- high: Clear injury/property damage risk — pothole large enough to damage a vehicle wheel/suspension (>20cm diameter), non-functional traffic signal at a busy junction with vehicles present, large sewage overflow, significant structural crack in a load-bearing element.
- medium: Moderate hazard or degraded service — smaller pothole (10–20cm) causing discomfort but not damage, flickering/dim streetlight, overflowing garbage bin, partial drain blockage with minor water pooling.
- low: Cosmetic or very minor — hairline cracks, single broken manhole cover with safety cone present, small debris on sidewalk, slightly leaning but stable post.

Additional rules:
- If the photo is NOT a civic infrastructure issue (e.g., a photo of a person, an animal, a random object, a screenshot), you MUST set "is_civic_issue" to false, and use category "other".
- If the photo IS a civic issue, set "is_civic_issue" to true.
- If multiple issues are visible, classify the most prominent/dominant one as the primary category. Set secondary_category to the next most visible issue type (null if none).
- Do not guess — if confidence is genuinely unclear, reflect that in lower confidence scores rather than inflating them.
Output ONLY the JSON object — no markdown, no explanation outside the JSON.`;

/**
 * Fetches image bytes from a Cloud Storage URI and returns base64.
 * For photos already in base64 format, passes through.
 */
export interface PhotoForVision {
  mimeType: string;
  data: string; // base64-encoded image bytes
}

export async function runReporterAgent(
  input: ReporterAgentInput
): Promise<ReporterAgentOutput> {
  const apiKey = config.genai.apiKey;
  if (!apiKey) {
    // Fallback for demo without API key configured: return "other" with low confidence
    console.warn('[ReporterAgent] GOOGLE_GENAI_API_KEY not configured — returning fallback classification');
    return buildFallback(input);
  }

  const genai = new GoogleGenAI({ apiKey });

  const parts: Array<any> = [
    { text: SYSTEM_PROMPT },
    { text: '\n\nAnalyze the following civic issue photo(s):' },
  ];

  for (const photo of input.photoBase64List) {
    parts.push({ inlineData: { mimeType: photo.mimeType, data: photo.data } });
  }

  if (input.description) {
    parts.push({ text: `\n\nCitizen description: "${input.description}"` });
  }

  parts.push({ text: '\n\nOutput JSON:' });

  try {
    const request = {
      model: config.genai.modelVision,
      contents: [{ role: 'user', parts }],
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

    // Strip markdown code fences if the model wraps its output
    const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    const parsed = JSON.parse(jsonText) as {
      is_civic_issue?: boolean;
      category: string;
      category_confidence: number;
      severity: string;
      severity_confidence: number;
      brief_reason: string;
    };

    const category = Object.values(IssueCategory).includes(parsed.category as IssueCategory)
      ? (parsed.category as IssueCategory)
      : IssueCategory.Other;

    const severity = Object.values(IssueSeverity).includes(parsed.severity as IssueSeverity)
      ? (parsed.severity as IssueSeverity)
      : IssueSeverity.Medium;

    const categoryConfidence = clamp(parsed.category_confidence ?? 0.5);
    const severityConfidence = clamp(parsed.severity_confidence ?? 0.5);

    const inputSummary = JSON.stringify({
      photo_count: input.photoBase64List.length,
      has_description: !!input.description,
    });
    const outputSummary = JSON.stringify({
      is_civic_issue: parsed.is_civic_issue ?? true,
      category,
      category_confidence: categoryConfidence,
      severity,
      severity_confidence: severityConfidence,
      brief_reason: parsed.brief_reason ?? '',
    });

    return {
      isCivicIssue: parsed.is_civic_issue ?? true,
      suggestedCategory: category,
      categoryConfidence,
      suggestedSeverity: severity,
      severityConfidence,
      inputSummary,
      outputSummary,
      agentVersion: AGENT_VERSION,
    };
  } catch (err) {
    console.error('[ReporterAgent] Gemini call failed:', err);
    return buildFallback(input);
  }
}

function buildFallback(input: ReporterAgentInput): ReporterAgentOutput {
  return {
    isCivicIssue: true, // Fail-safe
    suggestedCategory: IssueCategory.Other,
    categoryConfidence: 0.1,
    suggestedSeverity: IssueSeverity.Medium,
    severityConfidence: 0.1,
    inputSummary: JSON.stringify({ photo_count: input.photoBase64List.length, fallback: true }),
    outputSummary: JSON.stringify({ category: IssueCategory.Other, reason: 'AI unavailable — fallback classification' }),
    agentVersion: AGENT_VERSION,
  };
}

// Per database_design.md §2.4: confidence must be within [0.0, 1.0]
function clamp(val: number): number {
  return Math.min(1, Math.max(0, val));
}

export { AGENT_VERSION as REPORTER_AGENT_VERSION, AgentType };
