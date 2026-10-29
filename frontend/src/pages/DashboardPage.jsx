import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Bookmark,
  FileText,
  Clock,
  ArrowRight,
  Plus
} from 'lucide-react'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import { searchApi, patentApi, reportApi } from '../services/api'
import { useAuth } from '../hooks/AuthContext'
import { formatDate } from '../utils/format'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ searches: 0, saved: 0, reports: 0 })
  const [recentSearches, setRecentSearches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [historyData, savedData, reportData] = await Promise.all([
          searchApi.history(1),
          patentApi.saved(1),
          reportApi.list(1),
        ])
        setStats({
          searches: historyData.total || 0,
          saved: savedData.total || 0,
          reports: reportData.total || 0,
        })
        setRecentSearches(historyData.items || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  if (loading) return <LoadingState label="Loading dashboard…" />

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: 4 }}>Welcome, {user.full_name}</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Overview of your prior-art activity and recent searches
          </p>
        </div>
        <Link to="/app/search" className="btn">
          <Plus size={16} />
          <span>New Search</span>
        </Link>
      </div>

      <ErrorState message={error} />

      {/* 1. Activity Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div>
            <div className="stat-label">Prior-Art Searches</div>
            <div className="stat-value">{stats.searches}</div>
          </div>
          <div className="stat-icon">
            <Search size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Saved Patents</div>
            <div className="stat-value">{stats.saved}</div>
          </div>
          <div className="stat-icon" style={{ color: 'var(--lc-green)' }}>
            <Bookmark size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Generated Reports</div>
            <div className="stat-value">{stats.reports}</div>
          </div>
          <div className="stat-icon" style={{ color: 'var(--lc-yellow)' }}>
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* 2. Recent Searches (Below Activity Summary) */}
      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} style={{ color: 'var(--accent-orange)' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Recent Searches</h3>
          </div>
          {recentSearches.length > 0 && (
            <Link to="/app/history" style={{ fontSize: '0.82rem', color: 'var(--accent-orange)' }}>
              View all history →
            </Link>
          )}
        </div>

        {recentSearches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
            <p style={{ margin: '0 0 14px', fontSize: '0.9rem' }}>No searches conducted yet.</p>
            <Link to="/app/search" className="btn btn-sm">
              Start your first search
            </Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '55%' }}>Invention Search</th>
                  <th style={{ width: '15%' }}>Results</th>
                  <th style={{ width: '15%' }}>Date</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentSearches.slice(0, 6).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        to={`/app/results/${item.id}`}
                        style={{ color: '#ffffff', fontWeight: 600, display: 'block', fontSize: '0.92rem' }}
                      >
                        {item.title || item.description?.slice(0, 60) || 'Untitled Search'}
                      </Link>
                      {item.description && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 450 }}>
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="score-badge score-high">
                        {item.result_count} Hits
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {formatDate(item.created_at)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/app/results/${item.id}`}
                        className="btn secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <span>Reopen</span>
                        <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
