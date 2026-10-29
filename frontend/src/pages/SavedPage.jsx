import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bookmark,
  Search,
  ExternalLink,
  Trash2,
  FileText,
  Plus
} from 'lucide-react'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import PatentMeta from '../components/PatentMeta'
import { patentApi } from '../services/api'
import { useToast } from '../hooks/ToastContext'
import { missing } from '../utils/format'

export default function SavedPage() {
  const toast = useToast()
  const [data, setData] = useState({ items: [], total: 0, page: 1 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filterText, setFilterText] = useState('')

  async function load(page = 1) {
    setLoading(true)
    try {
      setData(await patentApi.saved(page))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
  }, [])

  async function unsave(id, title) {
    try {
      await patentApi.unsave(id)
      toast.info(`Removed from saved library`)
      load(data.page)
    } catch (err) {
      toast.error(err.message || 'Failed to remove patent')
    }
  }

  const filteredItems = useMemo(() => {
    if (!filterText.trim()) return data.items
    const term = filterText.toLowerCase()
    return data.items.filter((row) => {
      const p = row.patent
      return (
        (p.title || '').toLowerCase().includes(term) ||
        (p.publication_number || '').toLowerCase().includes(term) ||
        (p.country || '').toLowerCase().includes(term) ||
        (p.inventor || '').toLowerCase().includes(term)
      )
    })
  }, [data.items, filterText])

  if (loading && data.items.length === 0) return <LoadingState label="Loading saved patents…" />

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: 4 }}>Saved Patents</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            Bookmarked patent records for reference and claim review
          </p>
        </div>

        <Link to="/app/search" className="btn">
          <Plus size={16} />
          <span>New Search</span>
        </Link>
      </div>

      <ErrorState message={error} />

      {/* Filter Bar */}
      {data.items.length > 0 && (
        <div className="panel" style={{ padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={15} className="text-muted" />
            <input
              type="text"
              placeholder="Filter by title, publication number, or jurisdiction…"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '4px 0', fontSize: '0.88rem', outline: 'none' }}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      {data.items.length === 0 ? (
        <EmptyState
          title="No saved patents yet"
          body="Bookmark relevant patents from your search results to keep track of them here."
          actionLink="/app/search"
          actionLabel="Run a Search"
          icon={Bookmark}
        />
      ) : filteredItems.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
          No saved patents match "{filterText}".
        </div>
      ) : (
        <div className="card-list">
          {filteredItems.map((row) => {
            const patent = row.patent
            return (
              <article key={row.id} className="panel result-card">
                <div className="result-card-header">
                  <div style={{ flex: 1 }}>
                    <Link
                      to={`/app/patents/${patent.id}`}
                      className="result-card-title"
                    >
                      {missing(patent.title, 'Untitled Record')}
                    </Link>
                    <PatentMeta patent={patent} />
                  </div>
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                  {missing(patent.abstract, 'No abstract provided in source data.')}
                </p>

                <div className="row-actions" style={{ marginTop: 6, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                  <Link className="btn btn-sm" to={`/app/patents/${patent.id}`}>
                    <FileText size={14} />
                    <span>View Claims</span>
                  </Link>

                  <button
                    className="btn ghost btn-sm"
                    type="button"
                    onClick={() => unsave(patent.id, patent.title)}
                    style={{ color: 'var(--lc-red)' }}
                  >
                    <Trash2 size={14} />
                    <span>Remove</span>
                  </button>

                  {patent.source_url && (
                    <a
                      className="btn ghost btn-sm"
                      href={patent.source_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ marginLeft: 'auto' }}
                    >
                      <ExternalLink size={14} />
                      <span>Source</span>
                    </a>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
