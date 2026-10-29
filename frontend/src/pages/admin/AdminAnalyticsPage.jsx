import { useState, useEffect } from 'react'
import { BarChart3, ChevronLeft, ChevronRight, Search, TrendingUp } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useToast } from '../../hooks/ToastContext'

export default function AdminAnalyticsPage() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: 20 })
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  function loadSearches(page = 1) {
    setLoading(true)
    adminApi
      .globalSearches(page)
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadSearches() }, [])

  const totalPages = Math.ceil(data.total / data.page_size) || 1

  // Derive quick stats
  const uniqueUsers = new Set(data.items.map((s) => s.user_email)).size
  const avgResults = data.items.length > 0
    ? (data.items.reduce((sum, s) => sum + s.results_count, 0) / data.items.length).toFixed(1)
    : 0
  const zeroHitCount = data.items.filter((s) => s.results_count === 0).length

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>
          <BarChart3 size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Search Analytics
        </h2>
        <p className="muted small" style={{ margin: '4px 0 0' }}>
          Platform-wide search intelligence and usage patterns
        </p>
      </div>

      {/* Quick Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="stat-label">Total Searches</div>
            <div className="stat-value">{data.total}</div>
          </div>
          <div className="stat-icon" style={{ color: 'var(--accent-orange)' }}>
            <Search size={20} />
          </div>
        </div>
        <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="stat-label">Avg Results/Search</div>
            <div className="stat-value">{avgResults}</div>
          </div>
          <div className="stat-icon" style={{ color: 'var(--lc-green)' }}>
            <TrendingUp size={20} />
          </div>
        </div>
        <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="stat-label">Zero-Hit Queries</div>
            <div className="stat-value" style={{ color: zeroHitCount > 0 ? 'var(--lc-red)' : 'var(--lc-green)' }}>
              {zeroHitCount}
            </div>
          </div>
          <div className="stat-icon" style={{ color: zeroHitCount > 0 ? 'var(--lc-red)' : 'var(--lc-green)' }}>
            <Search size={20} />
          </div>
        </div>
      </div>

      {/* Global Search Feed */}
      <h3 style={{ marginBottom: 12 }}>All Searches</h3>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto' }} />
        </div>
      ) : data.items.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
          No search activity recorded
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Query Title</th>
                  <th>Results</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>#{s.id}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.user_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.user_email}</div>
                    </td>
                    <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.query_title || 'Untitled'}
                    </td>
                    <td>
                      <span
                        className="score-badge"
                        style={
                          s.results_count > 0
                            ? { background: 'var(--lc-green-subtle)', color: 'var(--lc-green)', border: '1px solid rgba(44,187,93,0.3)' }
                            : { background: 'var(--lc-red-subtle)', color: 'var(--lc-red)', border: '1px solid rgba(239,71,67,0.3)' }
                        }
                      >
                        {s.results_count} result{s.results_count !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {s.created_at ? new Date(s.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16, alignItems: 'center' }}>
              <button className="btn secondary btn-sm" disabled={data.page <= 1} onClick={() => loadSearches(data.page - 1)}>
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="muted small">Page {data.page} of {totalPages}</span>
              <button className="btn secondary btn-sm" disabled={data.page >= totalPages} onClick={() => loadSearches(data.page + 1)}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
