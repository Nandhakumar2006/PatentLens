import { useState, useEffect } from 'react'
import {
  Users,
  Database,
  Search,
  FileText,
  Activity,
  Cpu,
  HardDrive,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { adminApi } from '../../services/adminApi'

export default function AdminOverviewPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi
      .overview()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 12px' }} />
        <p className="muted small">Loading admin overview…</p>
      </div>
    )
  }

  if (error) {
    return <div className="banner error">{error}</div>
  }

  const { stats, health, recent_searches } = data

  const statCards = [
    { label: 'Total Users', value: stats.total_users, icon: Users, color: '#ffa116' },
    { label: 'Total Patents', value: stats.total_patents, icon: Database, color: '#2cbb5d' },
    { label: 'Total Claims', value: stats.total_claims, icon: FileText, color: '#ffc01e' },
    { label: 'Total Chunks', value: stats.total_chunks, icon: HardDrive, color: '#007aff' },
    { label: 'Total Searches', value: stats.total_searches, icon: Search, color: '#ffa116' },
    { label: 'Total Reports', value: stats.total_reports, icon: FileText, color: '#2cbb5d' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Admin Overview</h2>
        <p className="muted small" style={{ margin: '4px 0 0' }}>Platform statistics and system health at a glance</p>
      </div>

      {/* Platform Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {statCards.map((s) => (
          <div key={s.label} className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
            <div className="stat-icon" style={{ color: s.color }}>
              <s.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* System Health */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12 }}>System Health</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          <HealthCard
            label="Database"
            ok={health.database_ok}
            details={[
              `Engine: ${health.database_type}`,
              health.is_sqlite ? 'Mode: Local SQLite (fallback)' : 'Mode: MySQL Production',
            ]}
          />
          <HealthCard
            label="FAISS Vector Index"
            ok={health.faiss_loaded}
            details={[
              `Vectors Indexed: ${health.faiss_vectors}`,
              `Dimension: ${health.faiss_dimension}d`,
              `Model: ${health.embedding_model || 'N/A'}`,
            ]}
          />
        </div>
      </div>

      {/* Recent Global Searches */}
      <div>
        <h3 style={{ marginBottom: 12 }}>Recent Platform Searches</h3>
        {recent_searches.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
            No searches recorded yet
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Query Title</th>
                  <th>Results</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent_searches.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.user_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.user_email}</div>
                    </td>
                    <td>{s.query_title || 'Untitled'}</td>
                    <td>
                      <span className="brand-badge">{s.results_count} results</span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function HealthCard({ label, ok, details }) {
  return (
    <div className="panel" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ marginTop: 2 }}>
        {ok ? (
          <CheckCircle size={22} style={{ color: 'var(--lc-green)' }} />
        ) : (
          <XCircle size={22} style={{ color: 'var(--lc-red)' }} />
        )}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>{label}</div>
        <div
          className="score-badge"
          style={ok ? { background: 'var(--lc-green-subtle)', color: 'var(--lc-green)', border: '1px solid rgba(44,187,93,0.3)' } : { background: 'var(--lc-red-subtle)', color: 'var(--lc-red)', border: '1px solid rgba(239,71,67,0.3)' }}
        >
          {ok ? 'Healthy' : 'Offline'}
        </div>
        <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {details.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
