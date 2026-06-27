import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getFirestore, COLLECTIONS } from '../config/firebase.js';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { generateContentWithRetry } from '../services/ai.js';
import { IssueCategory, IssueSeverity, IssueStatus, ActorType } from '@civicmind/shared';
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Resolve ward via the same fallback logic used elsewhere
async function getFallbackWard(): Promise<string> {
  const db = getFirestore();
  const snapshot = await db
    .collection(COLLECTIONS.JURISDICTION_MAPPINGS)
    .where('is_fallback', '==', false)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    return snapshot.docs[0]!.data()['ward_or_area_id'] as string;
  }
  return 'ward_UNKNOWN';
}

const placeholderImages: Record<string, string> = {
  pothole: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80',
  road_damage: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80',
  streetlight: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=400&q=80',
  garbage: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80',
  water_leakage: 'https://images.unsplash.com/photo-1527624104257-2e18ebf1b8a9?auto=format&fit=crop&w=400&q=80',
  traffic_signal: 'https://images.unsplash.com/photo-1559868726-258169f46820?auto=format&fit=crop&w=400&q=80',
  drainage: 'https://images.unsplash.com/photo-1527624104257-2e18ebf1b8a9?auto=format&fit=crop&w=400&q=80',
  other: 'https://images.unsplash.com/photo-1508614999368-9260051292e5?auto=format&fit=crop&w=400&q=80',
};

// ─── POST /api/v1/dev/seed-near-me ───────────────────────────────────────────
router.post('/seed-near-me', asyncHandler(async (req: Request, res: Response) => {
  // Allow only in dev or if specifically requested for demo
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: { message: 'Not available in production' } });
    return;
  }

  const { lat, lng, city } = req.body as { lat?: number; lng?: number; city?: string };
  if (lat === undefined || lng === undefined || !city) {
    res.status(400).json({ error: { message: 'lat, lng, and city are required' } });
    return;
  }

  console.log(`[SEED] Seeding demo issues for city: ${city} near ${lat}, ${lng}`);

  // 1. Call Gemini to generate localized issues
  const genAI = new GoogleGenAI({ apiKey: config.genai.apiKey });

  const prompt = `You are an AI generating highly realistic mock data for a civic issue reporting app.
Generate 4 highly detailed, realistic civic issues that would typically occur in ${city} (e.g., specific weather-related issues, neighborhood transit complaints, local infrastructure).
Return a JSON array of objects. Each object must exactly match this schema:
{
  "category": "<one of: pothole, streetlight, garbage, water_leakage, drainage, road_damage, traffic_signal, other>",
  "severity": "<one of: low, medium, high, critical>",
  "description": "<a highly realistic, multi-sentence complaint from the perspective of a frustrated citizen in ${city}>",
  "reporter_name": "<a realistic local person's name, e.g., Rajesh K., Priya, etc.>",
  "detailed_address": "<a realistic street or landmark address in ${city}, e.g., 'Opposite to Apollo Pharmacy, 4th Main Road'>",
  "latOffset": <a float between -0.015 and 0.015>,
  "lngOffset": <a float between -0.015 and 0.015>,
  "image_prompt": "<a highly descriptive, concise image generation prompt for this issue, e.g., 'A large pothole filled with muddy water on a busy paved street in Bengaluru'>",
}`;

  let generatedIssues: any[] = [];
  try {
    const request = {
      model: config.genai.modelText,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    };
    const result = await generateContentWithRetry(genAI, request);
    const text = result.text;
    generatedIssues = JSON.parse(text);
  } catch (err) {
    console.error('[SEED] Failed to generate issues from Gemini', err);
    res.status(500).json({ error: { message: 'Failed to generate local issues with AI' } });
    return;
  }

  // 2. Prepare Firestore Batch
  const db = getFirestore();
  const batch = db.batch();
  const now = new Date();

  // Use a fallback ward to ensure Demo Authority sees these issues
  const fallbackWard = await getFallbackWard();
  // Using BESCOM department ID (from seed) as generic demo department
  const defaultDepartmentId = 'de7af73e-324c-4740-9a3d-c11df5b91b92';
  const citizenId = 'CITIZEN_DEMO_UID';

  const subtractHours = (date: Date, hours: number) => new Date(date.getTime() - hours * 60 * 60 * 1000);

  const frontendIssues: any[] = [];

  for (const [index, item] of generatedIssues.entries()) {
    const issueId = `ai-seeded-${uuidv4()}`;

    // Distribute statuses across the generated issues
    let status = IssueStatus.Routed;
    let hoursOffset = 2;
    if (index === 1) { status = IssueStatus.InProgress; hoursOffset = 10; }
    if (index === 2) { status = IssueStatus.Escalated; hoursOffset = 6; }

    const createdAt = subtractHours(now, hoursOffset).toISOString();
    const updatedAt = subtractHours(now, 1).toISOString();

    const locationLat = lat + (item.latOffset || (Math.random() - 0.5) * 0.02);
    const locationLng = lng + (item.lngOffset || (Math.random() - 0.5) * 0.02);
    const addressText = item.detailed_address || `Near ${city} center`;

    const issueRef = db.collection(COLLECTIONS.ISSUES).doc(issueId);
    const issueDoc = {
      issue_id: issueId,
      idempotency_key: `seed-key-${issueId}`,
      reporter_user_id: citizenId,
      status: status,
      category: item.category as IssueCategory,
      severity: item.severity as IssueSeverity,
      location_lat: locationLat,
      location_lng: locationLng,
      location_address_text: addressText,
      description: item.description,
      reporter_name: item.reporter_name || 'Anonymous Citizen',
      is_canonical: true,
      canonical_issue_id: null,
      department_id: defaultDepartmentId,
      ward_or_area_id: fallbackWard,
      sla_deadline: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      escalation_tier_current: status === IssueStatus.Escalated ? 1 : 0,
      corroboration_count: 1,
      created_at: createdAt,
      updated_at: updatedAt
    };
    batch.set(issueRef, issueDoc);

    const photoUrl = item.image_prompt
      ? `https://image.pollinations.ai/prompt/${encodeURIComponent(item.image_prompt)}`
      : (placeholderImages[item.category] || placeholderImages.other);

    const photoRef = db.collection(COLLECTIONS.ISSUE_PHOTOS).doc();
    batch.set(photoRef, {
      photo_id: photoRef.id,
      issue_id: issueId,
      photo_type: 'before',
      storage_path: photoUrl,
      uploaded_by_user_id: citizenId,
      created_at: createdAt
    });

    const histRef = db.collection(COLLECTIONS.ISSUE_STATUS_HISTORY).doc();
    batch.set(histRef, {
      history_id: histRef.id,
      issue_id: issueId,
      from_status: IssueStatus.Submitted,
      to_status: status,
      actor_type: ActorType.System,
      actor_id: null,
      reason: 'AI Seeded local data',
      created_at: updatedAt
    });

    // Format for frontend (mimicking map.ts output)
    frontendIssues.push({
      issue_id: issueId,
      category: item.category,
      severity: item.severity,
      status: status,
      location: { lat: locationLat, lng: locationLng },
      corroboration_count: 1,
      created_at: createdAt,
    });
  }

  await batch.commit();
  console.log(`[SEED] Successfully committed ${generatedIssues.length} AI-generated issues`);

  res.status(200).json({ success: true, count: generatedIssues.length, issues: frontendIssues });
}));

export default router;

