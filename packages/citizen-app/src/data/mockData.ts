/**
 * CivicMind — Mock data for development / demo when backend is offline.
 * Matches api_specification.md payload shapes exactly.
 */

import type { IssueDetail } from '../../../shared/src/api-client.js';

export const MOCK_ISSUES: IssueDetail[] = [
  {
    issue_id: 'ISS-001',
    category: 'pothole',
    severity: 'high',
    status: 'in_progress',
    location: { lat: 12.9716, lng: 77.5946, address_text: '12th Main Rd, Indiranagar, Bengaluru' },
    corroboration_count: 7,
    department_name: 'BBMP — Roads & Infrastructure',
    sla_deadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    time_remaining_seconds: 4 * 3600,
    created_at: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    description: 'Large pothole near the signal causing vehicle damage. Multiple accidents reported.',
    photos: [
      { photo_id: 'PH-001', photo_type: 'before', url: 'https://picsum.photos/seed/civicsense1/400/300' },
    ],
    status_history: [
      { to_status: 'submitted', created_at: new Date(Date.now() - 2 * 86400 * 1000).toISOString(), reason: null },
      { to_status: 'validating', created_at: new Date(Date.now() - 2 * 86400 * 1000 + 30000).toISOString(), reason: null },
      { to_status: 'routed', created_at: new Date(Date.now() - 2 * 86400 * 1000 + 120000).toISOString(), reason: 'Routed to BBMP Roads & Infrastructure (Ward: Indiranagar)' },
      { to_status: 'in_progress', created_at: new Date(Date.now() - 86400 * 1000).toISOString(), reason: 'Maintenance crew dispatched' },
    ],
    ward_or_area_id: 'ward-101-indiranagar',
  },
  {
    issue_id: 'ISS-002',
    category: 'streetlight',
    severity: 'medium',
    status: 'routed',
    location: { lat: 12.9352, lng: 77.6245, address_text: 'BTM Layout 2nd Stage, Bengaluru' },
    corroboration_count: 3,
    department_name: 'BESCOM — Electrical Infrastructure',
    sla_deadline: new Date(Date.now() + 26 * 3600 * 1000).toISOString(),
    time_remaining_seconds: 26 * 3600,
    created_at: new Date(Date.now() - 86400 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1800 * 1000).toISOString(),
    description: null,
    photos: [
      { photo_id: 'PH-002', photo_type: 'before', url: 'https://picsum.photos/seed/civicsense2/400/300' },
    ],
    status_history: [
      { to_status: 'submitted', created_at: new Date(Date.now() - 86400 * 1000).toISOString(), reason: null },
      { to_status: 'validating', created_at: new Date(Date.now() - 86400 * 1000 + 20000).toISOString(), reason: null },
      { to_status: 'routed', created_at: new Date(Date.now() - 86400 * 1000 + 90000).toISOString(), reason: null },
    ],
    ward_or_area_id: 'ward-109-btm',
  },
  {
    issue_id: 'ISS-003',
    category: 'garbage',
    severity: 'high',
    status: 'verified_resolved',
    location: { lat: 12.9141, lng: 77.6410, address_text: 'HSR Layout Sector 2, Bengaluru' },
    corroboration_count: 12,
    department_name: 'BBMP — Solid Waste Management',
    sla_deadline: null,
    time_remaining_seconds: null,
    created_at: new Date(Date.now() - 7 * 86400 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 86400 * 1000).toISOString(),
    description: 'Overflowing garbage bins near community park. Health hazard.',
    photos: [
      { photo_id: 'PH-003', photo_type: 'before', url: 'https://picsum.photos/seed/civicsense3/400/300' },
      { photo_id: 'PH-004', photo_type: 'after', url: 'https://picsum.photos/seed/civicsense4/400/300' },
    ],
    status_history: [
      { to_status: 'submitted', created_at: new Date(Date.now() - 7 * 86400 * 1000).toISOString(), reason: null },
      { to_status: 'validating', created_at: new Date(Date.now() - 7 * 86400 * 1000 + 20000).toISOString(), reason: null },
      { to_status: 'routed', created_at: new Date(Date.now() - 7 * 86400 * 1000 + 80000).toISOString(), reason: null },
      { to_status: 'in_progress', created_at: new Date(Date.now() - 5 * 86400 * 1000).toISOString(), reason: null },
      { to_status: 'resolved', created_at: new Date(Date.now() - 2 * 86400 * 1000).toISOString(), reason: 'Area cleaned by maintenance team' },
      { to_status: 'verifying', created_at: new Date(Date.now() - 2 * 86400 * 1000 + 1000).toISOString(), reason: null },
      { to_status: 'verified_resolved', created_at: new Date(Date.now() - 86400 * 1000).toISOString(), reason: 'AI confidence: 0.94 — Area visually confirmed clean' },
    ],
    ward_or_area_id: 'ward-103-hsrlayout',
  },
  {
    issue_id: 'ISS-004',
    category: 'water_leakage',
    severity: 'critical',
    status: 'escalated',
    location: { lat: 12.9784, lng: 77.6408, address_text: 'Koramangala 4th Block, Bengaluru' },
    corroboration_count: 4,
    department_name: 'BWSSB — Water Supply & Sewerage',
    sla_deadline: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    time_remaining_seconds: -7200,
    created_at: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    description: 'Major water pipe burst on main road. Road waterlogged.',
    photos: [
      { photo_id: 'PH-005', photo_type: 'before', url: 'https://picsum.photos/seed/civicsense5/400/300' },
    ],
    status_history: [
      { to_status: 'submitted', created_at: new Date(Date.now() - 3 * 86400 * 1000).toISOString(), reason: null },
      { to_status: 'validating', created_at: new Date(Date.now() - 3 * 86400 * 1000 + 15000).toISOString(), reason: null },
      { to_status: 'routed', created_at: new Date(Date.now() - 3 * 86400 * 1000 + 60000).toISOString(), reason: null },
      { to_status: 'escalated', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), reason: 'SLA breached — escalated to Department Head' },
    ],
    ward_or_area_id: 'ward-102-koramangala',
  },
  {
    issue_id: 'ISS-005',
    category: 'drainage',
    severity: 'medium',
    status: 'submitted',
    location: { lat: 12.9582, lng: 77.6484, address_text: 'Jayanagar 4th Block, Bengaluru' },
    corroboration_count: 1,
    department_name: null,
    sla_deadline: null,
    time_remaining_seconds: null,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    description: null,
    photos: [
      { photo_id: 'PH-006', photo_type: 'before', url: 'https://picsum.photos/seed/civicsense6/400/300' },
    ],
    status_history: [
      { to_status: 'submitted', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), reason: null },
    ],
    ward_or_area_id: 'ward-104-jayanagar',
  },
];

export const MOCK_MAP_PINS = MOCK_ISSUES.map((issue) => ({
  id: issue.issue_id,
  lat: issue.location.lat,
  lng: issue.location.lng,
  category: issue.category,
  status: issue.status,
  severity: issue.severity,
}));

export const MOCK_NOTIFICATIONS = [
  {
    notification_id: 'N-001',
    issue_id: 'ISS-001',
    message_text: '🔧 Your pothole report is now In Progress — crew dispatched.',
    created_at: new Date(Date.now() - 86400 * 1000).toISOString(),
    read: false,
  },
  {
    notification_id: 'N-002',
    issue_id: 'ISS-003',
    message_text: '✅ Your garbage report is Verified Resolved. Thank you for contributing!',
    created_at: new Date(Date.now() - 86400 * 1000 + 1000).toISOString(),
    read: false,
  },
  {
    notification_id: 'N-003',
    issue_id: 'ISS-004',
    message_text: '⚠️ Your water leakage report has been Escalated to Department Head.',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    read: true,
  },
];
