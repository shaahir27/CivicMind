/**
 * Home/Map Screen — ui_ux_specification.md §2.3
 * Map fills majority of viewport, FAB bottom-center, collapsible bottom sheet.
 *
 * Phase 4 additions:
 *  - 🔮 Hotspot Forecast layer toggle (per Feature 6 / development_plan.md Phase 4.2)
 *  - Forecast pins shown on map when layer is active
 *  - Forecast list in bottom sheet when layer active
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORY_LABELS, CATEGORY_ICONS, UserRole } from '@civicmind/shared';
import { MapPlaceholder, StatusBadge, EmptyState, SLARiskBadge, FullPageSpinner } from '../components/shared.js';
import { AppSwitcher } from '../../../shared/src/components/AppSwitcher.js';
import { MOCK_ISSUES } from '../data/mockData.js';
import { useAuth } from '../context/AuthContext.js';
import type { IssueDetail } from '../../../shared/src/api-client.js';

const CATEGORY_OPTIONS = ['All', 'pothole', 'streetlight', 'garbage', 'water_leakage', 'drainage', 'road_damage', 'traffic_signal', 'other'];

interface HotspotForecast {
  forecast_id: string;
  ward_or_area_id: string;
  predicted_category: string;
  risk_score: number;
  generated_at: string;
  valid_until: string;
}

const MOCK_FORECASTS: HotspotForecast[] = [
  { forecast_id: 'fc-001', ward_or_area_id: 'ward-101-indiranagar', predicted_category: 'pothole', risk_score: 0.87, generated_at: new Date(Date.now() - 3600 * 1000).toISOString(), valid_until: new Date(Date.now() + 6 * 86400 * 1000).toISOString() },
  { forecast_id: 'fc-002', ward_or_area_id: 'ward-102-koramangala', predicted_category: 'water_leakage', risk_score: 0.75, generated_at: new Date(Date.now() - 3600 * 1000).toISOString(), valid_until: new Date(Date.now() + 6 * 86400 * 1000).toISOString() },
  { forecast_id: 'fc-005', ward_or_area_id: 'ward-109-btm', predicted_category: 'drainage', risk_score: 0.91, generated_at: new Date(Date.now() - 3600 * 1000).toISOString(), valid_until: new Date(Date.now() + 6 * 86400 * 1000).toISOString() },
];

/** Pseudo-random but deterministic lat/lng offsets per forecast so they look distinct on the map */
const FORECAST_COORDS: Record<string, { lat: number; lng: number }> = {
  'ward-101-indiranagar': { lat: 12.9716, lng: 77.5946 },
  'ward-102-koramangala': { lat: 12.9784, lng: 77.6408 },
  'ward-103-hsrlayout': { lat: 12.9141, lng: 77.6410 },
  'ward-104-jayanagar': { lat: 12.9582, lng: 77.6484 },
  'ward-109-btm': { lat: 12.9352, lng: 77.6245 },
};

function getRiskLabel(score: number): string {
  if (score >= 0.8) return '🔴 High Risk';
  if (score >= 0.6) return '🟠 Medium Risk';
  return '🟡 Low Risk';
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [issues, setIssues] = useState<IssueDetail[]>([]);
  const [forecasts, setForecasts] = useState<HotspotForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('All');
  const [statusFilter] = useState('All');
  const [showForecasts, setShowForecasts] = useState(false);

  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [userCity, setUserCity] = useState<string>('your city');
  const [isSeeding, setIsSeeding] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [hasAutoSeeded, setHasAutoSeeded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchIssues = async (lat?: number, lng?: number) => {
      setLoading(true);
      try {
        const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
        let url = `${base}/api/v1/map/issues`;
        if (lat && lng) {
          const latMin = lat - 0.05;
          const latMax = lat + 0.05;
          const lngMin = lng - 0.05;
          const lngMax = lng + 0.05;
          url += `?bounding_box=${latMin},${lngMin},${latMax},${lngMax}`;
        }

        const [issuesRes, forecastsRes] = await Promise.allSettled([
          fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(`${base}/api/v1/map/hotspot-forecasts`),
        ]);

        if (mounted && issuesRes.status === 'fulfilled' && issuesRes.value.ok) {
          const data = await issuesRes.value.json();
          const mockFallback = lat && lng ? [] : MOCK_ISSUES;
          setIssues(data.issues?.length ? data.issues : mockFallback);
        } else if (mounted) {
          setIssues(lat && lng ? [] : MOCK_ISSUES);
        }

        if (mounted && forecastsRes.status === 'fulfilled' && forecastsRes.value.ok) {
          const data = await forecastsRes.value.json();
          setForecasts(data.forecasts?.length ? data.forecasts : MOCK_FORECASTS);
        } else if (mounted) {
          setForecasts(MOCK_FORECASTS);
        }
      } catch {
        if (mounted) {
          setIssues(lat && lng ? [] : MOCK_ISSUES);
          setForecasts(MOCK_FORECASTS);
        }
      }
      if (mounted) setLoading(false);
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        if (!mounted) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });

        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: { 'User-Agent': 'CivicSense-CitizenApp' }
          });
          const geoData = await geoRes.json();

          let city = 'Unknown City';
          if (geoData.address) {
            city = geoData.address.city || geoData.address.town || geoData.address.state_district || geoData.address.state || 'Unknown City';
          }
          setUserCity(city);
          await fetchIssues(lat, lng);
        } catch (e) {
          await fetchIssues(lat, lng);
        }
      }, () => {
        if (mounted) fetchIssues();
      });
    } else {
      fetchIssues();
    }

    return () => { mounted = false; };
  }, [token]);

  useEffect(() => {
    if (userLocation && issues.length === 0 && !loading && !isSeeding && !hasAutoSeeded) {
      setHasAutoSeeded(true);
      setShowDemoModal(true);
      triggerVibeCoding();
    }
  }, [issues.length, userLocation, loading, isSeeding, hasAutoSeeded]);

  const triggerVibeCoding = async () => {
    if (!userLocation) return;
    setIsSeeding(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/dev/seed-near-me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: userLocation.lat, lng: userLocation.lng, city: userCity })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.issues && data.issues.length > 0) {
          // Immediately set the seeded issues to bypass the map API race condition
          setIssues(data.issues);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setIsSeeding(false);
  };

  const filtered = issues.filter((issue) => {
    if (catFilter !== 'All' && issue.category !== catFilter) return false;
    if (statusFilter !== 'All' && issue.status !== statusFilter) return false;
    return true;
  });

  const issuePins = filtered
    .filter((issue) => typeof issue.location?.lat === 'number' && typeof issue.location?.lng === 'number')
    .map((issue) => ({
      id: issue.issue_id,
      lat: issue.location.lat,
      lng: issue.location.lng,
      category: issue.category,
      status: issue.status,
      severity: issue.severity,
    }));

  /** Forecast pins are styled as large semi-transparent circles on the map */
  const forecastPins = showForecasts
    ? forecasts.map((fc) => {
      const coords = FORECAST_COORDS[fc.ward_or_area_id] ?? { lat: 12.97, lng: 77.59 };
      return {
        id: `fc-${fc.forecast_id}`,
        lat: coords.lat + 0.008, // slight offset so they don't overlap issue pins
        lng: coords.lng + 0.008,
        category: fc.predicted_category,
        status: 'forecast' as const,
        severity: fc.risk_score >= 0.8 ? 'high' : fc.risk_score >= 0.5 ? 'medium' : 'low',
      };
    })
    : [];

  const allPins = [...issuePins, ...forecastPins];

  if (loading) return <FullPageSpinner />;

  return (
    <div className="home-split-view">

      {/* Map */}
      <div className="home-map-container">
        <MapPlaceholder
          pins={allPins as Parameters<typeof MapPlaceholder>[0]['pins']}
          height="100%"
          userLocation={userLocation}
          onPinClick={(pin) => {
            if (pin.id.startsWith('fc-')) return; // forecast pins don't navigate
            navigate(`/issue/${pin.id}`);
          }}
          interactive
        />
      </div>

      {/* List Container */}
      <div className="home-list-container" style={{ background: 'hsl(220 100% 98%)' }}>

        {/* Header inside Panel */}
        <div style={{ padding: '0 4px 16px', background: 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🏙️</span>
          <span style={{ fontWeight: 800, fontSize: '20px', color: 'hsl(220 20% 12%)', flex: 1, letterSpacing: '-0.02em' }}>Report Logs</span>
          <span style={{ fontSize: '13px', color: 'hsl(220 20% 40%)', fontWeight: 600, marginRight: '8px', background: 'rgba(0,0,0,0.04)', padding: '4px 10px', borderRadius: '12px' }}>{filtered.length} logs</span>
          <AppSwitcher currentApp="citizen" userRole={UserRole.Citizen} />
        </div>

        {/* Filter chips + Forecast toggle */}
        <div style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '16px', marginBottom: '16px' }}>
          <div className="filter-chips">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                className={`filter-chip ${catFilter === cat && !showForecasts ? 'active' : ''}`}
                onClick={() => { setCatFilter(cat); setShowForecasts(false); }}
              >
                {cat === 'All' ? '🌐 All' : `${CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] ?? '⚠️'} ${CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat}`}
              </button>
            ))}
            {/* Hotspot Forecast toggle */}
            <button
              className={`filter-chip ${showForecasts ? 'active' : ''}`}
              onClick={() => setShowForecasts((v) => !v)}
              style={{ borderColor: showForecasts ? '#a78bfa' : undefined, background: showForecasts ? 'hsl(268 83% 50% / 0.15)' : undefined, color: showForecasts ? '#a78bfa' : undefined }}
            >
              🔮 Forecasts
            </button>
          </div>
        </div>

        {/* List Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '130px' }}>
          {showForecasts ? (
            <>
              {/* Disclaimer */}
              <div style={{ padding: '10px 14px', background: 'hsl(268 83% 50% / 0.08)', border: '1px solid hsl(268 83% 50% / 0.2)', borderRadius: '10px', fontSize: '12px', color: '#7c3aed', fontWeight: 500 }}>
                🔮 Predictive forecasts — generated {new Date(forecasts[0]?.generated_at ?? '').toLocaleDateString()}. Not real-time.
              </div>
              {forecasts.map((fc) => (
                <div
                  key={fc.forecast_id}
                  style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '16px', borderRadius: '16px', border: '1px solid hsl(268 83% 50% / 0.15)', background: 'white', cursor: 'default', boxShadow: '0 4px 20px rgba(167, 139, 250, 0.05)' }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'hsl(268 83% 50% / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                    {CATEGORY_ICONS[fc.predicted_category as keyof typeof CATEGORY_ICONS] ?? '⚠️'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', marginBottom: '2px' }}>
                      {CATEGORY_LABELS[fc.predicted_category as keyof typeof CATEGORY_LABELS] ?? fc.predicted_category}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fc.ward_or_area_id}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: fc.risk_score >= 0.8 ? '#ef4444' : fc.risk_score >= 0.6 ? '#f59e0b' : '#22c55e' }}>
                        {getRiskLabel(fc.risk_score)}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {Math.round(fc.risk_score * 100)}% risk
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {forecasts.length === 0 && (
                <EmptyState icon="🔮" title="No forecasts available" description="The Predictor Agent hasn't generated forecasts yet for your area." />
              )}
            </>
          ) : (
            <>
              {filtered.map((issue) => (
                <button
                  key={issue.issue_id}
                  className="issue-card"
                  onClick={() => navigate(`/issue/${issue.issue_id}`)}
                  style={{ all: 'unset', display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '16px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer', background: 'white', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}
                >
                  <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'hsl(220 100% 97%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0, border: '1px solid hsl(220 87% 90%)' }}>
                    {CATEGORY_ICONS[issue.category as keyof typeof CATEGORY_ICONS] ?? '📌'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                      {(CATEGORY_LABELS as Record<string, string>)[issue.category] ?? issue.category}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {issue.location?.address_text ?? (typeof issue.location?.lat === 'number' && typeof issue.location?.lng === 'number' ? `${issue.location.lat.toFixed(4)}, ${issue.location.lng.toFixed(4)}` : 'Location unavailable')}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <StatusBadge status={issue.status} />
                      {issue.sla_deadline && <SLARiskBadge deadline={issue.sla_deadline} />}
                      {issue.corroboration_count > 1 && (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500 }}>👥 {issue.corroboration_count}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {filtered.length === 0 && userLocation && !isSeeding && (
                <EmptyState
                  icon="✨"
                  title={`No complaints in ${userCity}`}
                  description="Booting AI simulation to generate realistic local issues..."
                />
              )}
              {filtered.length === 0 && userLocation && !isSeeding && (
                <button
                  onClick={triggerVibeCoding}
                  style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '12px', border: 'none', background: 'var(--color-brand-600)', cursor: 'pointer', color: 'white', fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-sans)', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
                >
                  🪄 Generate AI Demo Issues
                </button>
              )}
              {isSeeding && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#6366f1', fontWeight: 500 }}>
                  <div style={{ margin: '0 auto 12px', width: '24px', height: '24px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Gemini is generating local issues for {userCity}...
                </div>
              )}
              {filtered.length === 0 && !userLocation && (
                <EmptyState icon="🌿" title="No issues nearby" description="Your area looks good! Tap the button below to report a problem." />
              )}
            </>
          )}
        </div>
      </div>

      {showDemoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', maxWidth: '300px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>✨</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#1e293b' }}>Demo Mode Auto-Seeding</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>
              No issues were found near {userCity}. We are using Gemini AI to dynamically generate realistic demo data for your location!
            </p>
            {isSeeding ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', color: '#6366f1', fontWeight: 500 }}>
                <div style={{ width: '20px', height: '20px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                Generating...
              </div>
            ) : (
              <button onClick={() => setShowDemoModal(false)} style={{ padding: '10px 20px', width: '100%', background: 'var(--color-brand-600)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Got it, let's go!</button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
