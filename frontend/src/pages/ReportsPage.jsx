import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  Download,
  Calendar,
  ExternalLink,
  Plus
} from 'lucide-react'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import { reportApi } from '../services/api'
import { useToast } from '../hooks/ToastContext'
import { formatDate } from '../utils/format'

export default function ReportsPage() {
  const toast = useToast()
  const [data, setData] = useState({ items: [], total: 0 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState(null)

  useEffect(() => {
    reportApi
      .list(1)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleDownload(id, filename) {
    setDownloadingId(id)
    try {
      await reportApi.download(id, filename)
      toast.success(`Downloaded ${filename}`)
    } catch (err) {
      toast.error(err.message || 'Download failed')
    } finally {
      setDownloadingId(null)
    }
  }

  if (loading) return <LoadingState label="Loading audit reports…" />

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: 4 }}>Audit Reports</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            Download PDF summaries generated from your invention searches
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
          title="No reports generated yet"
          body="Generate a PDF report directly from the results page of any search to keep an audit trail."
          actionLink="/app/search"
          actionLabel="Start a Search"
          icon={FileText}
        />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Document Name</th>
                <th style={{ width: '20%' }}>Search Origin</th>
                <th style={{ width: '20%' }}>Generated Date</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={18} style={{ color: 'var(--accent-orange)', flexShrink: 0 }} />
                      <div>
                        <strong style={{ color: '#ffffff', fontSize: '0.9rem', display: 'block' }}>
                          {item.filename}
                        </strong>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Link
                      to={`/app/results/${item.search_id}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.88rem', color: 'var(--accent-orange)' }}
                    >
                      <span>Search #{item.search_id}</span>
                      <ExternalLink size={12} />
                    </Link>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={13} className="text-muted" />
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn secondary btn-sm"
                      type="button"
                      disabled={downloadingId === item.id}
                      onClick={() => handleDownload(item.id, item.filename)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      {downloadingId === item.id ? (
                        <>
                          <span className="spinner" style={{ width: 12, height: 12 }} />
                          <span>Downloading…</span>
                        </>
                      ) : (
                        <>
                          <Download size={13} />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
