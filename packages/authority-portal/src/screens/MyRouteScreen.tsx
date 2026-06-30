import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { IssueStatus } from '@civicmind/shared';
import type { IssueSummary } from '@civicmind/shared';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_CLIENT_API_KEY || 'AIzaSyDummyKeyForDevEnvironments';

function RouteMap({ issues }: { issues: IssueSummary[], polyline?: string }) {
  const mapCenter = issues.length > 0 
    ? { lat: issues[0].location.lat, lng: issues[0].location.lng }
    : { lat: 12.9716, lng: 77.5946 };

  // A real implementation would decode the polyline and draw it using google.maps.Polyline.
  // For simplicity, we are just mapping the waypoints.
  
  return (
    <div style={{ width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)', marginTop: '24px' }}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={mapCenter}
          defaultZoom={13}
          mapId="route-map"
          disableDefaultUI={true}
          gestureHandling={'greedy'}
        >
          {issues.map((issue, index) => (
            <AdvancedMarker
              key={issue.issue_id}
              position={{ lat: issue.location.lat, lng: issue.location.lng }}
              title={`Stop ${index + 1}: ${issue.category}`}
            >
              <div style={{
                width: '28px',
                height: '28px',
                background: 'var(--color-brand-600)',
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                {index + 1}
              </div>
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}

export default function MyRouteScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [routeData, setRouteData] = useState<any>(null);

  useEffect(() => {
    fetchIssues();
  }, [token]);

  const fetchIssues = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/authority/issues?status=${IssueStatus.InProgress}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      const validIssues = (data.issues || []).filter((i: any) => 
        i.location && typeof i.location.lat === 'number' && !isNaN(i.location.lat)
      );
      
      setIssues(validIssues);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (issues.length === 0) return;
    setOptimizing(true);
    try {
      const waypoints = issues.map(i => ({
        id: i.issue_id,
        lat: i.location.lat,
        lng: i.location.lng
      }));

      // Assuming current location is the first issue for simplicity, or department office.
      const start_location = { lat: issues[0].location.lat, lng: issues[0].location.lng };

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/routing/optimize-route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ start_location, waypoints })
      });

      if (!res.ok) throw new Error('Failed to optimize route');
      const data = await res.json();
      
      // Reorder issues based on optimized_route
      const optimizedIds = data.optimized_route.map((w: any) => w.id);
      const sortedIssues = [...issues].sort((a, b) => 
        optimizedIds.indexOf(a.issue_id) - optimizedIds.indexOf(b.issue_id)
      );
      
      setIssues(sortedIssues);
      setRouteData(data);
    } catch (err) {
      console.error(err);
      alert('Route optimization failed. Please check your API key billing status or network.');
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) return <div style={{ padding: '32px' }}>Loading tasks...</div>;

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--color-text-primary)' }}>Today's Route</h1>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            You have {issues.length} active work orders in progress.
          </p>
        </div>
        <button 
          onClick={handleOptimize} 
          disabled={optimizing || issues.length < 2}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {optimizing ? '⏳ Optimizing...' : '📍 Optimize Route'}
        </button>
      </div>

      {issues.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {issues.map((issue, i) => (
            <div key={issue.issue_id} style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', 
                background: routeData ? 'var(--color-brand-100)' : 'var(--color-neutral-100)',
                color: routeData ? 'var(--color-brand-600)' : 'var(--color-neutral-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '18px'
              }}>
                {i + 1}
              </div>
              <div style={{ flexGrow: 1 }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--color-text-primary)' }}>{issue.category.replace(/_/g, ' ').toUpperCase()}</h3>
                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>{issue.location.address_text || `${issue.location.lat.toFixed(4)}, ${issue.location.lng.toFixed(4)}`}</div>
              </div>
              <a href={`/issue/${issue.issue_id}`} className="btn-secondary" style={{ textDecoration: 'none', padding: '8px 16px', borderRadius: '6px', background: 'var(--color-neutral-100)', color: 'var(--color-text-primary)' }}>
                View Details
              </a>
            </div>
          ))}

          <RouteMap issues={issues} polyline={routeData?.polyline} />
        </div>
      ) : (
        <div style={{ padding: '48px', textAlign: 'center', background: 'var(--color-neutral-50)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h3 style={{ margin: '0 0 8px 0' }}>No active assignments</h3>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>You don't have any in-progress work orders today.</p>
        </div>
      )}
    </div>
  );
}
