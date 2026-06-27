import { getFirestore } from 'firebase-admin/firestore';
import { COLLECTIONS } from '../../config/firebase.js';

export async function seedForecasts() {
  const db = getFirestore();
  const forecastsRef = db.collection(COLLECTIONS.FORECASTS || 'forecasts');
  
  const snap = await forecastsRef.limit(1).get();
  if (!snap.empty) {
    console.log('Forecasts already seeded. Skipping.');
    return;
  }

  console.log('Seeding demo forecasts...');
  const batch = db.batch();

  const mockForecasts = [
    {
      forecast_id: 'fcst-001',
      ward_or_area_id: 'ward-76-richmond-town',
      predicted_category: 'pothole',
      risk_score: 0.85,
      confidence: 0.90,
      is_public_visible: true,
      generated_at: new Date().toISOString(),
    },
    {
      forecast_id: 'fcst-002',
      ward_or_area_id: 'ward-111-shantala-nagar',
      predicted_category: 'water_leakage',
      risk_score: 0.76,
      confidence: 0.82,
      is_public_visible: true,
      generated_at: new Date().toISOString(),
    },
    {
      forecast_id: 'fcst-003',
      ward_or_area_id: 'ward-112-domlur',
      predicted_category: 'garbage',
      risk_score: 0.92,
      confidence: 0.95,
      is_public_visible: true,
      generated_at: new Date().toISOString(),
    },
    {
      forecast_id: 'fcst-004',
      ward_or_area_id: 'ward-150-bellandur',
      predicted_category: 'traffic_signal',
      risk_score: 0.65,
      confidence: 0.55,
      is_public_visible: false,
      generated_at: new Date().toISOString(),
    },
    {
      forecast_id: 'fcst-005',
      ward_or_area_id: 'ward-174-hsr-layout',
      predicted_category: 'drainage',
      risk_score: 0.88,
      confidence: 0.89,
      is_public_visible: true,
      generated_at: new Date().toISOString(),
    }
  ];

  for (const forecast of mockForecasts) {
    batch.set(forecastsRef.doc(forecast.forecast_id), forecast);
  }

  await batch.commit();
  console.log(`Seeded ${mockForecasts.length} forecasts.`);
}
