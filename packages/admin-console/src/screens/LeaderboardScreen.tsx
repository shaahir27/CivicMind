import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';


interface LeaderboardEntry {
  ward_or_area_id: string;
  civic_health_score: number;
  resolution_rate: number;
  avg_resolution_hours: number;
  total_issues: number;
}

export default function LeaderboardScreen() {
  const { token } = useAuth();
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${base}/api/v1/map/leaderboard`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      const data = await response.json();
      setLeaderboard(data.leaderboard);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const generateAll = async () => {
    try {
      setGenerating(true);
      setError('');
      const response = await fetch(`${base}/api/v1/admin/impact-reports/generate-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to generate reports');
      await fetchLeaderboard();
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Ward Leaderboard</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Ranks wards across the city by their Civic Health Score based on the last 30 days of data.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={generateAll}
          disabled={generating}
          style={{ padding: '10px 20px', fontSize: '14px' }}
        >
          {generating ? 'Generating...' : 'Generate Latest Scores'}
        </button>
      </div>

      {error && <div className="card" style={{ color: 'red', marginBottom: '20px' }}>{error}</div>}

      {loading ? (
        <div>Loading leaderboard...</div>
      ) : (
        <div className="card" style={{ padding: '0' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-secondary)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '16px' }}>Rank</th>
                <th style={{ padding: '16px' }}>Ward ID</th>
                <th style={{ padding: '16px' }}>Civic Health Score</th>
                <th style={{ padding: '16px' }}>Resolution Rate</th>
                <th style={{ padding: '16px' }}>Avg Resolution Time</th>
                <th style={{ padding: '16px' }}>Total Issues</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    No data available. Click "Generate Latest Scores".
                  </td>
                </tr>
              ) : (
                leaderboard.map((entry, index) => (
                  <tr key={entry.ward_or_area_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px', fontWeight: index < 3 ? 'bold' : 'normal', fontSize: index < 3 ? '1.1rem' : '1rem' }}>
                      {index === 0 ? '🥇 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : index + 1}
                    </td>
                    <td style={{ padding: '16px', fontWeight: 500 }}>{entry.ward_or_area_id}</td>
                    <td style={{ padding: '16px' }}>
                      <span className="badge" style={{ 
                        background: entry.civic_health_score >= 80 ? 'var(--color-success)' : 
                                    entry.civic_health_score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
                        color: 'white'
                      }}>
                        {entry.civic_health_score} / 100
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>{(entry.resolution_rate * 100).toFixed(1)}%</td>
                    <td style={{ padding: '16px' }}>{entry.avg_resolution_hours.toFixed(1)} hrs</td>
                    <td style={{ padding: '16px' }}>{entry.total_issues}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
