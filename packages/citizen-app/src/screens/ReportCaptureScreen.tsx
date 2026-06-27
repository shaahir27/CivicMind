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

export default function ReportCaptureScreen() {
  const navigate = useNavigate();
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
              if (data.results && data.results.length > 0) {
                setAddressText(data.results[0].formatted_address);
              }
            }
          } catch (err) {
            console.error('Failed to reverse geocode', err);
          }
        },
        () => setLocationError('Location unavailable — you can adjust the pin after submission.')
      );
    } else {
      setLocationError('Geolocation not supported.');
    }
  }, []);

  const handleFile = (file: File) => {
    setError('');
    // Client-side validation per feature_specifications.md Feature 1
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > MAX_PHOTO_SIZE_BYTES) { setError(`File must be under 10MB. Selected: ${(file.size / 1024 / 1024).toFixed(1)}MB`); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
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
      
      const res = await fetch('/api/v1/issues', {
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

      if (!res.ok) throw new Error('Submission failed');
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
      <div className="screen" style={{ height: '100dvh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '20px' }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => { setPreview(null); setPhotoFile(null); }} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <span style={{ color: 'white', fontWeight: 600, fontSize: '16px', fontFamily: 'var(--font-sans)' }}>Photo Captured</span>
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
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📍</span>
              <span style={{ color: 'white', fontSize: '13px', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 600 }}>Location</span>
                <span style={{ fontSize: '12px', opacity: 0.9 }}>
                  {addressText || 'Fetching address...'}
                </span>
              </span>
            </div>
          ) : (
            <div style={{ background: 'rgba(245,158,11,0.15)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(245,158,11,0.3)' }}>
              <span>⚠️</span>
              <span style={{ color: '#fbbf24', fontSize: '13px', fontFamily: 'var(--font-sans)' }}>
                {locationError || 'Detecting location…'}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontFamily: 'var(--font-sans)', paddingLeft: '4px' }}>
              Additional Details & Exact Address
            </label>
            <textarea
              placeholder="e.g. Near the main gate, huge pothole..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-input"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                minHeight: '80px',
                fontSize: '14px'
              }}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.15)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(239,68,68,0.3)' }}>
              <span style={{ color: '#fca5a5', fontSize: '13px', fontFamily: 'var(--font-sans)' }}>{error}</span>
            </div>
          )}

          {isManualFallback ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#fca5a5', fontSize: '13px', fontFamily: 'var(--font-sans)' }}>AI analysis unavailable. Please provide details manually.</div>
              <select value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} style={{ padding: '12px', borderRadius: '8px', background: '#1e293b', color: 'white', border: '1px solid #334155' }}>
                <option value="pothole">Pothole</option>
                <option value="streetlight">Broken Streetlight</option>
                <option value="garbage">Garbage Overflow</option>
                <option value="water_leakage">Water Leakage</option>
                <option value="drainage">Drainage Issue</option>
                <option value="road_damage">Road Damage</option>
                <option value="traffic_signal">Traffic Signal</option>
                <option value="other">Other</option>
              </select>
              <select value={manualSeverity} onChange={(e) => setManualSeverity(e.target.value)} style={{ padding: '12px', borderRadius: '8px', background: '#1e293b', color: 'white', border: '1px solid #334155' }}>
                <option value="low">Low Severity</option>
                <option value="medium">Medium Severity</option>
                <option value="high">High Severity</option>
                <option value="critical">Critical Severity</option>
              </select>
              <button className="btn-primary" onClick={submitManualFallback} disabled={loading} style={{ height: '50px', fontSize: '15px', borderRadius: '10px' }}>
                {loading ? <LoadingSpinner size={20} /> : 'Submit Report'}
              </button>
            </div>
          ) : (
            <button
              className="btn-primary"
              onClick={handleAnalyze}
              disabled={loading}
              style={{ height: '56px', fontSize: '16px', borderRadius: '14px' }}
            >
              {loading ? (
                <><LoadingSpinner size={20} /> Analyzing with AI…</>
              ) : (
                <>🤖 Analyze with AI</>
              )}
            </button>
          )}

          <button onClick={() => { setPreview(null); setPhotoFile(null); setIsManualFallback(false); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', padding: '14px', color: 'white', fontFamily: 'var(--font-sans)', fontSize: '14px', cursor: 'pointer' }}>
            Retake Photo
          </button>
        </div>
      </div>
    );
  }

  // Camera / gallery picker
  return (
    <div className="screen" style={{ height: '100dvh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '20px', width: '100%' }}>
      {/* Header */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <span style={{ color: 'white', fontWeight: 600, fontSize: '16px', fontFamily: 'var(--font-sans)' }}>Upload Photo</span>
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
          border: '2px dashed rgba(255,255,255,0.2)',
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.03)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
      >
        <div style={{ 
          width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(59,130,246,0.2)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' 
        }}>
          <span style={{ fontSize: '28px', color: '#60a5fa' }}>📤</span>
        </div>
        <div style={{ color: 'white', fontSize: '16px', fontWeight: 500, fontFamily: 'var(--font-sans)', marginBottom: '8px' }}>
          Tap to Upload or Drag & Drop
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'var(--font-sans)', textAlign: 'center', padding: '0 20px' }}>
          Please upload a clear photo of the civic issue.
        </div>
      </div>

      {/* Location status */}
      {location ? (
        <div style={{ background: 'rgba(34,197,94,0.15)', borderRadius: '10px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(34,197,94,0.3)', width: '100%', maxWidth: '380px' }}>
          <span>📍</span>
          <span style={{ color: '#86efac', fontSize: '13px', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontWeight: 600 }}>Location</span>
            <span style={{ fontSize: '12px', opacity: 0.9 }}>
              {addressText || 'Fetching address...'}
            </span>
          </span>
        </div>
      ) : (
        <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '10px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '380px' }}>
          <LoadingSpinner size={14} />
          <span style={{ color: '#fbbf24', fontSize: '13px', fontFamily: 'var(--font-sans)' }}>Detecting location…</span>
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
