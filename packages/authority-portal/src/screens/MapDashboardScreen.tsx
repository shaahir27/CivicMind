/// <reference types="@types/google.maps" />
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Issue, IssueSeverity } from '@civicmind/shared';

import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_CLIENT_API_KEY || 'AIzaSyDummyKeyForDevEnvironments';

function Clusterer({ issues }: { issues: Issue[] }) {
  const map = useMap();
  const [clusterer, setClusterer] = useState<MarkerClusterer>();
  const [markers, setMarkers] = useState<{ [key: string]: google.maps.marker.AdvancedMarkerElement }>({});

  useEffect(() => {
    if (!map) return;
    if (!clusterer) {
      setClusterer(new MarkerClusterer({ map }));
    }
  }, [map, clusterer]);

  useEffect(() => {
    clusterer?.clearMarkers();
    clusterer?.addMarkers(Object.values(markers));
  }, [clusterer, markers]);

  const setMarkerRef = (marker: google.maps.marker.AdvancedMarkerElement | null, key: string) => {
    if (marker && markers[key]) return;
    if (!marker && !markers[key]) return;

    setMarkers((prev) => {
      if (marker) {
        return { ...prev, [key]: marker };
      } else {
        const newMarkers = { ...prev };
        delete newMarkers[key];
        return newMarkers;
      }
    });
  };

  const validIssues = issues.filter(issue => {
    const lat = (issue as any).location?.lat ?? issue.location_lat;
    const lng = (issue as any).location?.lng ?? issue.location_lng;
    return typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng);
  });

  return (
    <>
      {validIssues.map((issue) => (
        <AdvancedMarker
          key={issue.issue_id}
          position={{ 
            lat: (issue as any).location?.lat ?? issue.location_lat, 
            lng: (issue as any).location?.lng ?? issue.location_lng 
          }}
          ref={(marker) => setMarkerRef(marker, issue.issue_id)}
          title={`Issue: ${issue.category}`}
        >
          <div style={{
            width: '24px',
            height: '24px',
            background: issue.severity === IssueSeverity.High ? 'var(--color-danger)' : 
                       issue.severity === IssueSeverity.Medium ? 'var(--color-warning)' : 'var(--color-success)',
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            !
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
}

export default function MapDashboardScreen() {
  const { token } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssues();
  }, [token]);

  const fetchIssues = async () => {
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/authority/issues`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIssues(data.issues);
      }
    } catch (err) {
      console.error('Failed to fetch issues for map:', err);
    } finally {
      setLoading(false);
    }
  };

  const validIssues = issues.filter(issue => {
    const lat = (issue as any).location?.lat ?? issue.location_lat;
    const lng = (issue as any).location?.lng ?? issue.location_lng;
    return typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng);
  });

  const mapCenter = validIssues.length > 0 
    ? { 
        lat: (validIssues[0] as any).location?.lat ?? validIssues[0].location_lat, 
        lng: (validIssues[0] as any).location?.lng ?? validIssues[0].location_lng 
      }
    : { lat: 12.9716, lng: 77.5946 }; // Default to Bangalore

  return (
    <div className="screen-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)' }}>GIS Workload Map</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Geographic view of all active issues assigned to your department.
        </p>
      </div>

      <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)', position: 'relative' }}>
        {loading ? (
          <div style={{ padding: '20px' }}>Loading map data...</div>
        ) : (
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              defaultCenter={mapCenter}
              defaultZoom={12}
              mapId="CIVICMIND_AUTHORITY_MAP"
              disableDefaultUI={true}
              zoomControl={true}
            >
              <Clusterer issues={issues} />
            </Map>
          </APIProvider>
        )}
      </div>
    </div>
  );
}
