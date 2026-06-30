import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../config.js';

interface TransparencySummary {
  total_resolved: number;
  total_reported: number;
  avg_resolution_hours: number;
}

interface LeaderboardEntry {
  ward_or_area_id: string;
  civic_health_score: number;
  resolution_rate: number;
  avg_resolution_hours: number;
  total_issues: number;
}

export default function TransparencyPortal() {
  const [summary, setSummary] = useState<TransparencySummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      fetch(`${API_BASE_URL}/map/transparency-summary`).then(res => res.json()),
      fetch(`${API_BASE_URL}/map/leaderboard`).then(res => res.json())
    ]).then(([summaryResult, leaderboardResult]) => {
      if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value.summary);
      if (leaderboardResult.status === 'fulfilled') setLeaderboard(leaderboardResult.value.leaderboard ?? []);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load transparency data:', err);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ paddingTop: '100px', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '48px' }}
        >
          <h1 className="gradient-text" style={{ fontSize: '3rem', marginBottom: '16px' }}>Public Transparency Portal</h1>
          <p style={{ fontSize: '1.2rem', color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
            We believe in open data. Track our city's progress, response times, and civic health in real-time.
          </p>
        </motion.div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading open data...</div>
        ) : (
          <>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '48px' }}
            >
              <div style={{ background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                <h3 style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '8px' }}>Total Issues Resolved</h3>
                <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--color-brand-600)' }}>
                  {summary?.total_resolved.toLocaleString() || '0'}
                </div>
                <p style={{ color: '#10b981', fontWeight: 600, marginTop: '8px' }}>Active and making a difference</p>
              </div>

              <div style={{ background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                <h3 style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '8px' }}>Avg Resolution Time</h3>
                <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--color-brand-600)' }}>
                  {summary?.avg_resolution_hours ? summary.avg_resolution_hours.toFixed(1) : '0'} <span style={{ fontSize: '1.5rem' }}>hrs</span>
                </div>
                <p style={{ color: '#10b981', fontWeight: 600, marginTop: '8px' }}>City-wide response speed</p>
              </div>

              <div style={{ background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                <h3 style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '8px' }}>Overall Report Volume</h3>
                <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--color-brand-600)' }}>
                  {summary?.total_reported.toLocaleString() || '0'}
                </div>
                <p style={{ color: '#64748b', fontWeight: 500, marginTop: '8px' }}>Issues identified by citizens</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 style={{ fontSize: '2rem', color: '#1e293b', marginBottom: '24px', textAlign: 'center' }}>Ward Leaderboard</h2>
              <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: '64px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                      <th style={{ padding: '20px', color: '#475569', fontWeight: 600 }}>Rank</th>
                      <th style={{ padding: '20px', color: '#475569', fontWeight: 600 }}>Ward / Area</th>
                      <th style={{ padding: '20px', color: '#475569', fontWeight: 600 }}>Civic Health Score</th>
                      <th style={{ padding: '20px', color: '#475569', fontWeight: 600 }}>Resolution Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                          No recent data available.
                        </td>
                      </tr>
                    ) : (
                      leaderboard.map((entry, idx) => (
                        <tr key={entry.ward_or_area_id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '20px', fontSize: '1.2rem', fontWeight: idx < 3 ? 700 : 500 }}>
                            {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                          </td>
                          <td style={{ padding: '20px', fontWeight: 600, color: '#334155' }}>
                            {entry.ward_or_area_id}
                          </td>
                          <td style={{ padding: '20px' }}>
                            <div style={{ 
                              display: 'inline-block',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              background: entry.civic_health_score >= 80 ? '#dcfce7' : entry.civic_health_score >= 50 ? '#fef3c7' : '#fee2e2',
                              color: entry.civic_health_score >= 80 ? '#166534' : entry.civic_health_score >= 50 ? '#92400e' : '#991b1b',
                              fontWeight: 700
                            }}>
                              {entry.civic_health_score} / 100
                            </div>
                          </td>
                          <td style={{ padding: '20px', color: '#64748b', fontWeight: 500 }}>
                            {(entry.resolution_rate * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
