import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  History,
  Search,
  Trash2,
  Calendar,
  ArrowRight,
  Plus
} from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import { searchApi } from '../services/api'
import { useToast } from '../hooks/ToastContext'
import { formatDate } from '../utils/format'

export default function HistoryPage() {
  const toast = useToast()
  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: 10 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState(null)

  async function load(page = 1) {
    setLoading(true)
    try {
      setData(await searchApi.history(page))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
  }, [])

  async function remove(id) {
    try {
      await searchApi.remove(id)
      setPendingId(null)
      toast.info('Search query removed from history')
      load(data.page)
    } catch (err) {
      toast.error(err.message || 'Failed to delete search history')
    }
  }

  if (loading && data.items.length === 0) return <LoadingState label="Loading search query history…" />

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: 4 }}>Search History</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            Review past searches and reopen prior-art results
          </p>
        </div>

        <Link to="/app/search" className="btn">
          <Plus size={16} />
          <span>New Search</span>
        </Link>
      </div>

      <ErrorState message={error} />

      {data.items.length === 0 ? (
        <EmptyState
          title="No search history yet"
          body="Your prior-art search queries will be preserved here so you can review previous patent inquiries."
          actionLink="/app/search"
          actionLabel="Start a Search"
          icon={History}
        />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '50%' }}>Invention Query</th>
                <th style={{ width: '15%' }}>Results</th>
                <th style={{ width: '20%' }}>Search Date</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
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
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={13} className="text-muted" />
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Link
                        className="btn secondary btn-sm"
                        to={`/app/results/${item.id}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <span>Reopen</span>
                        <ArrowRight size={13} />
                      </Link>
                      <button
                        className="btn ghost btn-sm"
                        type="button"
                        onClick={() => setPendingId(item.id)}
                        style={{ color: 'var(--lc-red)', padding: '5px' }}
                        title="Delete search"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data.total > data.page_size && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
          {data.page > 1 && (
            <button
              className="btn secondary btn-sm"
              onClick={() => load(data.page - 1)}
            >
              Previous
            </button>
          )}
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Page {data.page} of {Math.ceil(data.total / data.page_size)}
          </span>
          {data.page * data.page_size < data.total && (
            <button
              className="btn secondary btn-sm"
              onClick={() => load(data.page + 1)}
            >
              Next
            </button>
          )}
        </div>
      )}

      {/* Modern Confirmation Modal */}
      <ConfirmDialog
        open={pendingId !== null}
        title="Delete Search Query?"
        body="This will permanently delete this search query and its cached patent results from your history."
        confirmText="Yes, Delete"
        onConfirm={() => remove(pendingId)}
        onCancel={() => setPendingId(null)}
      />
    </div>
  )
}
