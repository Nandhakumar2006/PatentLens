import { useState, useEffect } from 'react'
import {
  Activity,
  CheckCircle,
  XCircle,
  Database,
  Cpu,
  HardDrive,
  RefreshCw,
  Zap,
} from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useToast } from '../../hooks/ToastContext'

export default function AdminSystemPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rebuilding, setRebuilding] = useState(false)
  const toast = useToast()

  function loadStatus() {
    setLoading(true)
    adminApi
      .overview()
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadStatus() }, [])

  async function handleRebuild() {
    setRebuilding(true)
    try {
      const result = await adminApi.rebuildIndex()
      if (result.success) {
        toast.success(`Index rebuilt: ${result.total_vectors} vectors`)
        loadStatus()
      } else {
        toast.error(result.message)
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setRebuilding(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 12px' }} />
        <p className="muted small">Loading system diagnostics…</p>
      </div>
    )
  }

  if (!data) return null

  const { stats, health } = data

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0 }}>
            <Activity size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            System Health
          </h2>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Real-time diagnostics for database, AI engine, and corpus coverage
          </p>
        </div>
        <button className="btn secondary btn-sm" onClick={loadStatus}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Health Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Database */}
        <div className="panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Database size={22} style={{ color: health.database_ok ? 'var(--lc-green)' : 'var(--lc-red)' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Database</div>
              <span
                className="score-badge"
                style={
                  health.database_ok
                    ? { background: 'var(--lc-green-subtle)', color: 'var(--lc-green)', border: '1px solid rgba(44,187,93,0.3)' }
                    : { background: 'var(--lc-red-subtle)', color: 'var(--lc-red)', border: '1px solid rgba(239,71,67,0.3)' }
                }
              >
                {health.database_ok ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <div><strong>Engine:</strong> {health.database_type}</div>
            <div><strong>Mode:</strong> {health.is_sqlite ? 'Local SQLite (fallback)' : 'MySQL Production'}</div>
            <div><strong>Total Patents:</strong> {stats.total_patents}</div>
            <div><strong>Total Claims:</strong> {stats.total_claims}</div>
            <div><strong>Total Chunks:</strong> {stats.total_chunks}</div>
          </div>
        </div>

        {/* FAISS Index */}
        <div className="panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Cpu size={22} style={{ color: health.faiss_loaded ? 'var(--lc-green)' : 'var(--lc-red)' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>AI Vector Engine</div>
              <span
                className="score-badge"
                style={
                  health.faiss_loaded
                    ? { background: 'var(--lc-green-subtle)', color: 'var(--lc-green)', border: '1px solid rgba(44,187,93,0.3)' }
                    : { background: 'var(--lc-red-subtle)', color: 'var(--lc-red)', border: '1px solid rgba(239,71,67,0.3)' }
                }
              >
                {health.faiss_loaded ? 'Loaded' : 'Offline'}
              </span>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <div><strong>Indexed Vectors:</strong> {health.faiss_vectors}</div>
            <div><strong>Embedding Dimension:</strong> {health.faiss_dimension}d</div>
            <div><strong>Model:</strong> {health.embedding_model || 'N/A'}</div>
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-sm" onClick={handleRebuild} disabled={rebuilding}>
              {rebuilding ? (
                <><div className="spinner" style={{ width: 13, height: 13 }} /> Rebuilding…</>
              ) : (
                <><Zap size={13} /> Rebuild Entire Index</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Corpus Coverage */}
      <div className="panel">
        <h4 style={{ marginBottom: 14 }}>
          <HardDrive size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Corpus Coverage
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Patents', value: stats.total_patents, color: '#ffa116' },
            { label: 'Claims', value: stats.total_claims, color: '#2cbb5d' },
            { label: 'Text Chunks', value: stats.total_chunks, color: '#ffc01e' },
            { label: 'FAISS Vectors', value: health.faiss_vectors, color: '#007aff' },
          ].map((m) => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: m.color }}>{m.value}</div>
              <div className="stat-label">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
