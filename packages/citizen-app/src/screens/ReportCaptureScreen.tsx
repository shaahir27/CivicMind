/**
 * Report Capture Screen — ui_ux_specification.md §2.4
 * Full-screen camera/gallery; advances to Classification Review.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAX_PHOTO_SIZE_BYTES } from '@civicmind/shared';
import { LoadingSpinner } from '../components/shared.js';
import { useAuth } from '../context/AuthContext.js';
import { generateId } from '@civicmind/shared';
import { storage } from '../config/firebase.js';
import { ref, uploadBytes } from 'firebase/storage';
import exifr from 'exifr';
import { MapPlaceholder } from '../components/shared.js';
import { useI18n } from '../context/I18nContext.js';

export default function ReportCaptureScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [addressText, setAddressText] = useState('');
  const [description, setDescription] = useState('');
  const [isManualFallback, setIsManualFallback] = useState(false);
  const [manualCategory, setManualCategory] = useState('pothole');
  const [manualSeverity, setManualSeverity] = useState('medium');

  // Request geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLocation({ lat, lng });
          
          try {
            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_CLIENT_API_KEY;
            if (apiKey) {
              const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
              const data = await res.json();
              if (data.status === 'OK' && data.results && data.results.length > 0) {
                setAddressText(data.results[0].formatted_address);
              } else {
                setAddressText(t('addressUnavailable'));
              }
            } else {
              setAddressText(t('addressUnavailable'));
            }
          } catch (err) {
            console.error('Failed to reverse geocode', err);
            setAddressText(t('addressUnavailable'));
          }
        },
        () => setLocationError('Location unavailable — you can adjust the pin after submission.')
      );
    } else {
      setLocationError('Geolocation not supported.');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = async (file: File) => {
    setError('');
    // Client-side validation per feature_specifications.md Feature 1
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > MAX_PHOTO_SIZE_BYTES) { setError(`File must be under 10MB. Selected: ${(file.size / 1024 / 1024).toFixed(1)}MB`); return; }
    setPhotoFile(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));

    try {
      const gps = await exifr.gps(file);
      if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
        const lat = gps.latitude;
        const lng = gps.longitude;
        setLocation({ lat, lng });
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_CLIENT_API_KEY;
        if (apiKey) {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            setAddressText(data.results[0].formatted_address);
          }
        }
      }
    } catch (e) {
      console.log('EXIF extraction failed or not available');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleAnalyze = async () => {
    if (!photoFile) { setError('Please capture or select a photo.'); return; }
    if (!location) {
      // Use a default Bengaluru location for demo
      setLocation({ lat: 12.9716, lng: 77.5946 });
    }
    setLoading(true);

    // Build idempotency key for this submission (BR-1.3 + Error 5.1)
    const idempotencyKey = generateId();

    try {
      // Compress image before upload
      let fileToUpload = photoFile;
      if (photoFile.type.startsWith('image/')) {
        const bitmap = await createImageBitmap(photoFile);
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1024;
        let width = bitmap.width;
        let height = bitmap.height;
        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, width, height);
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7));
          if (blob) {
            fileToUpload = new File([blob], 'compressed.jpg', { type: 'image/jpeg' });
          }
        }
      }

      // Upload the photo to Firebase Cloud Storage
      const storagePath = `photos/${idempotencyKey}/before.jpg`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, fileToUpload);
      const loc = location ?? { lat: 12.9716, lng: 77.5946 };

      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          photo_refs: [storagePath],
          location: loc,
          description: description.trim() ? description.trim() : null,
          manual_category_override: null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Navigate to classification review with the API response
        navigate('/report/classify', {
          state: {
            issueId: data.issue_id,
            suggestedCategory: data.suggested_category,
            categoryConfidence: data.category_confidence,
            suggestedSeverity: data.suggested_severity,
            severityConfidence: data.severity_confidence,
            requiresConfirmation: data.requires_citizen_confirmation,
            photoPreview: preview,
            location: loc,
          },
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 400 && errorData?.error?.code === 'INVALID_CIVIC_ISSUE') {
          setError(errorData.error.message || 'This image does not appear to be a valid civic issue. Please upload a relevant photo.');
          setLoading(false);
          return;
        }
        if (res.status === 401) {
          setError('Session expired. Please log in again.');
          localStorage.removeItem('civicmind_citizen_auth');
          setTimeout(() => navigate('/auth'), 2000);
          setLoading(false);
          return;
        }
        if (res.status === 422 && errorData?.error?.code === 'AI_UNAVAILABLE') {
          setLoading(false);
          setIsManualFallback(true);
          return;
        }

        setError(errorData?.error?.message || 'Failed to submit issue. Please try again.');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('AI_UNAVAILABLE')) {
        setLoading(false);
        setIsManualFallback(true);
        return; // Wait for manual submission
      }
      setError(err?.message || 'Failed to connect to the server.');
    }
    setLoading(false);
  };

  const submitManualFallback = async () => {
    if (!photoFile) { setError('Please capture or select a photo.'); return; }
    setLoading(true);
    
    const idempotencyKey = generateId();
    try {
      const storagePath = `photos/${idempotencyKey}/before.jpg`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, photoFile);
      
      const loc = location ?? { lat: 12.9716, lng: 77.5946 };
      
      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/issues`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          photo_refs: [storagePath],
          location: loc,
          description: description.trim() ? description.trim() : null,
          manual_category_override: manualCategory,
          manual_severity_override: manualSeverity,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError('Session expired. Please log in again.');
          localStorage.removeItem('civicmind_citizen_auth');
          setTimeout(() => navigate('/auth'), 2000);
          setLoading(false);
          return;
        }
        throw new Error('Submission failed');
      }
      const data = await res.json();
      
      navigate('/report/classify', {
        state: {
          issueId: data.issue_id,
          suggestedCategory: manualCategory,
          categoryConfidence: 1.0,
          suggestedSeverity: manualSeverity,
          severityConfidence: 1.0,
          requiresConfirmation: false, // Bypass confirmation since manual
          photoPreview: preview,
          location: location ?? { lat: 12.9716, lng: 77.5946 },
        },
      });
    } catch (err) {
      setError('Failed to submit manual report. Please try again.');
    }
    setLoading(false);
  };

  if (preview) {
    // Photo selected — show preview with analyze button
    return (
      <div className="screen" style={{ height: '100dvh', background: 'var(--color-bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '20px' }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => { setPreview(null); setPhotoFile(null); }} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.05)', color: 'var(--color-text-primary)', fontSize: '24px', cursor: 'pointer', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>←</button>
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: '18px', fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em' }}>Photo Captured</span>
          <div style={{ width: '44px' }} />
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '16px 0' }}>
          <img
            src={preview}
            alt="Captured photo"
            style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '16px', objectFit: 'contain' }}
          />
        </div>

        {/* Location chip */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {location ? (
            <div style={{ width: '100%', height: '220px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <MapPlaceholder
                userLocation={location}
                pins={[{ id: 'current', lat: location.lat, lng: location.lng, category: 'other', status: 'submitted', severity: 'medium' }]}
                interactive={true}
                onMapClick={async (e) => {
                  if (e.detail?.latLng) {
                    const lat = e.detail.latLng.lat;
                    const lng = e.detail.latLng.lng;
                    setLocation({ lat, lng });
                    try {
                      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_CLIENT_API_KEY;
                      if (apiKey) {
                        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
                        const data = await res.json();
                        if (data.results && data.results.length > 0) {
                          setAddressText(data.results[0].formatted_address);
                        }
                      }
                    } catch (err) {}
                  }
                }}
              />
              <div style={{ position: 'absolute', top: '8px', left: '8px', right: '8px', background: 'rgba(255,255,255,0.95)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', color: '#1e293b', zIndex: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)' }}>
                <div style={{ fontWeight: 700, marginBottom: '2px' }}>Location:</div>
                <div style={{ color: '#64748b', fontSize: '12px' }}>{addressText || 'Fetching address...'}</div>
                <div style={{ color: '#3b82f6', fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>Tap map to adjust exact issue location</div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'hsl(36 100% 97%)', borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid hsl(36 100% 80%)' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <span style={{ color: '#92400e', fontSize: '13px', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                {locationError || 'Detecting location…'}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-sans)', paddingLeft: '4px' }}>
              Additional Details & Exact Address
            </label>
            <textarea
              placeholder="e.g. Near the main gate, huge pothole..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-input"
              style={{
                background: 'white',
                color: 'var(--color-text-primary)',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '16px',
                minHeight: '80px',
                fontSize: '14px',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.15)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(239,68,68,0.3)' }}>
              <span style={{ color: '#fca5a5', fontSize: '13px', fontFamily: 'var(--font-sans)' }}>{error}</span>
            </div>
          )}

          {isManualFallback ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ color: '#dc2626', fontSize: '13px', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>AI analysis unavailable. Please provide details manually.</div>
              <select value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} style={{ padding: '12px', borderRadius: '12px', background: 'var(--color-brand-50)', color: 'var(--color-text-primary)', border: '1px solid var(--color-brand-200)', outline: 'none' }}>
                <option value="pothole">Pothole</option>
                <option value="streetlight">Broken Streetlight</option>
                <option value="garbage">Garbage Overflow</option>
                <option value="water_leakage">Water Leakage</option>
                <option value="drainage">Drainage Issue</option>
                <option value="road_damage">Road Damage</option>
                <option value="traffic_signal">Traffic Signal</option>
                <option value="other">Other</option>
              </select>
              <select value={manualSeverity} onChange={(e) => setManualSeverity(e.target.value)} style={{ padding: '12px', borderRadius: '12px', background: 'var(--color-brand-50)', color: 'var(--color-text-primary)', border: '1px solid var(--color-brand-200)', outline: 'none' }}>
                <option value="low">{t('lowSeverity')}</option>
                <option value="medium">{t('mediumSeverity')}</option>
                <option value="high">{t('highSeverity')}</option>
                <option value="critical">{t('criticalSeverity')}</option>
              </select>
              <button className="btn-primary" onClick={submitManualFallback} disabled={loading} style={{ height: '50px', fontSize: '15px', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)' }}>
                {loading ? <LoadingSpinner size={20} /> : t('submitReport')}
              </button>
            </div>
          ) : (
            <button
              className="btn-primary"
              onClick={handleAnalyze}
              disabled={loading}
              style={{ height: '56px', fontSize: '16px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)' }}
            >
              {loading ? (
                <><LoadingSpinner size={20} /> {t('analyzing')}</>
              ) : (
                <>🤖 {t('analyzeWithAI')}</>
              )}
            </button>
          )}

          <button onClick={() => { setPreview(null); setPhotoFile(null); setIsManualFallback(false); }} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '16px', padding: '16px', color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            {t('retakePhoto')}
          </button>
        </div>
      </div>
    );
  }

  // Camera / gallery picker
  return (
    <div className="screen" style={{ height: '100dvh', background: 'var(--color-bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '20px', width: '100%' }}>
      {/* Header */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.05)', color: 'var(--color-text-primary)', fontSize: '24px', cursor: 'pointer', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>←</button>
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: '18px', fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em' }}>{t('uploadPhoto')}</span>
        <div style={{ width: '44px' }} />
      </div>

      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={handleDrop}
        style={{
          width: '100%',
          maxWidth: '380px',
          aspectRatio: '4/3',
          border: '2px dashed hsl(220 87% 73%)',
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--color-brand-500)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'hsl(220 87% 73%)'; }}
      >
        <div style={{ 
          width: '72px', height: '72px', borderRadius: '50%', background: 'var(--color-brand-50)', border: '1px solid var(--color-brand-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)'
        }}>
          <span style={{ fontSize: '32px', color: 'var(--color-brand-500)' }}>📤</span>
        </div>
        <div style={{ color: 'var(--color-text-primary)', fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-sans)', marginBottom: '8px' }}>
          {t('tapToUpload')}
        </div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', fontFamily: 'var(--font-sans)', textAlign: 'center', padding: '0 20px' }}>
          {t('uploadDesc')}
        </div>
      </div>

      {/* Location status */}
      {location ? (
        <div style={{ background: 'white', borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid rgba(0,0,0,0.05)', width: '100%', maxWidth: '380px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--color-brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, border: '1px solid var(--color-brand-200)' }}>
            📍
          </div>
          <div style={{ color: 'var(--color-text-primary)', fontSize: '13px', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '-0.01em' }}>{t('location')}</span>
            {addressText ? (
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {addressText}
              </span>
            ) : (
              <div className="skeleton" style={{ height: '14px', width: '80%', borderRadius: '4px' }} />
            )}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--color-bg-primary)', borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '380px', border: '1px solid var(--color-brand-200)', boxShadow: '0 8px 24px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'hsl(220 100% 95%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--color-brand-400)', animation: 'pulse 1.5s infinite ease-in-out', border: '3px solid white', boxShadow: '0 0 0 2px hsl(220 87% 60% / 0.3)' }} />
          </div>
          <span style={{ color: 'hsl(220 87% 40%)', fontSize: '14px', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>{t('locatingYou')}</span>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.15)', borderRadius: '10px', padding: '10px 14px', width: '100%', maxWidth: '380px', border: '1px solid rgba(239,68,68,0.3)' }}>
          <span style={{ color: '#fca5a5', fontSize: '13px', fontFamily: 'var(--font-sans)' }}>{error}</span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
    </div>
  );
}
