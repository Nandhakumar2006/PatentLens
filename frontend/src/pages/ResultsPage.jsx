import { useEffect, useState, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  Search,
  SlidersHorizontal,
  FileText,
  Sparkles,
  Download,
  ArrowLeft,
  Filter,
  Bookmark,
  Share2
} from 'lucide-react'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import ResultCard from '../components/ResultCard'
import { analysisApi, patentApi, reportApi, searchApi } from '../services/api'
import { useToast } from '../hooks/ToastContext'

export default function ResultsPage() {
  const { searchId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [summarizing, setSummarizing] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [savedIds, setSavedIds] = useState(new Set())
  
  // Client-side quick filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [sortBy, setSortBy] = useState('score')

  useEffect(() => {
    async function load() {
      try {
        const result = await searchApi.detail(searchId)
        setData(result)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [searchId])

  async function handleSave(item) {
    try {
      if (savedIds.has(item.id)) {
        await patentApi.unsave(item.id)
        setSavedIds((prev) => {
          const next = new Set(prev)
          next.delete(item.id)
          return next
        })
        toast.info('Removed from saved library')
      } else {
        await patentApi.save(item.id)
        setSavedIds((prev) => new Set([...prev, item.id]))
        toast.success(`Saved "${item.publication_number || item.title}"`)
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update saved state')
    }
  }

  async function makeReport() {
    setGeneratingReport(true)
    try {
      const report = await reportApi.generate(searchId)
      toast.success(`Report ${report.filename} generated successfully!`)
      navigate('/app/reports')
    } catch (err) {
      toast.error(err.message || 'Report generation failed')
    } finally {
      setGeneratingReport(false)
    }
  }

  async function summarize() {
    setSummarizing(true)
    try {
      const result = await analysisApi.summarize({ search_id: Number(searchId) })
      setSummary(result)
      toast.success('Summary generated!')
    } catch (err) {
      toast.error(err.message || 'Summarization failed')
    } finally {
      setSummarizing(false)
    }
  }

  const filteredResults = useMemo(() => {
    if (!data?.results) return []
    return data.results
      .filter((item) => {
        if (minScore > 0 && item.similarity_score < minScore) return false
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase()
          const matchTitle = (item.title || '').toLowerCase().includes(term)
          const matchPub = (item.publication_number || '').toLowerCase().includes(term)
          const matchAbs = (item.abstract || '').toLowerCase().includes(term)
          const matchInv = (item.inventor || '').toLowerCase().includes(term)
          if (!matchTitle && !matchPub && !matchAbs && !matchInv) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'score') return b.similarity_score - a.similarity_score
        if (sortBy === 'date') {
          return new Date(b.publication_date || 0) - new Date(a.publication_date || 0)
        }
        return 0
      })
  }, [data?.results, minScore, searchTerm, sortBy])

  if (loading) return <LoadingState label="Retrieving prior-art results…" />
  if (error && !data) return <ErrorState message={error} />

  if (!data?.results?.length) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <ErrorState message={error} />
        <EmptyState
          title="No related patents found"
          body="No patents matched your query criteria and metadata filters. Try adjusting your title or broadening filters."
          actionLink="/app/search"
          actionLabel="Start New Search"
        />
      </div>
    )
  }

  return (
    <div>
      {/* Top Navigation & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <Link to="/app/search" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: '#818cf8', fontWeight: 500 }}>
          <ArrowLeft size={16} />
          <span>New Search</span>
        </Link>
        
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn btn-sm" to={`/app/compare/${searchId}`}>
            <SlidersHorizontal size={15} />
            <span>Feature Gap Matrix</span>
          </Link>
          <button
            className="btn secondary btn-sm"
            type="button"
            onClick={summarize}
            disabled={summarizing}
          >
            {summarizing ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14 }} />
                <span>Summarizing…</span>
              </>
            ) : (
              <>
                <Sparkles size={15} style={{ color: '#38bdf8' }} />
                <span>Generate Summary</span>
              </>
            )}
          </button>
          <button
            className="btn secondary btn-sm"
            type="button"
            onClick={makeReport}
            disabled={generatingReport}
          >
            {generatingReport ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14 }} />
                <span>Generating PDF…</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>Download Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search Header Banner */}
      <div className="panel" style={{
        padding: '24px',
        marginBottom: 20,
        background: 'linear-gradient(135deg, rgba(20, 29, 52, 0.8) 0%, rgba(13, 19, 34, 0.9) 100%)',
        borderColor: 'rgba(99, 102, 241, 0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="brand-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                Search #{data.search_id}
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: 8 }}>
              {data.title || 'Invention Search'}
            </h1>
            {data.description && (
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, maxWidth: 900 }}>
                {data.description}
              </p>
            )}
          </div>
          <div style={{
            background: 'rgba(99, 102, 241, 0.12)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
              {data.results.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginTop: 4 }}>
              Patents Found
            </div>
          </div>
        </div>

        {/* Technical Features Pills */}
        {data.technical_features?.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 8 }}>
              Technical Features Evaluated:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {data.technical_features.map((feat, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '0.82rem',
                    padding: '4px 10px',
                    borderRadius: 9999,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: '#c7d2fe',
                  }}
                >
                  • {feat}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Grounded Summary Box */}
      {summary && (
        <div className="panel" style={{
          marginBottom: 20,
          background: 'rgba(16, 24, 40, 0.85)',
          borderColor: 'rgba(6, 182, 212, 0.3)',
          boxShadow: '0 0 24px rgba(6, 182, 212, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Sparkles size={18} style={{ color: '#38bdf8' }} />
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Prior-Art Overview</h3>
          </div>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.65, margin: 0 }}>
            {summary.summary}
          </p>
        </div>
      )}

      {/* Filter and In-Page Search Bar */}
      <div className="panel" style={{
        padding: '14px 18px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <Search size={16} className="text-muted" />
          <input
            type="text"
            placeholder="Quick search within these results by title, number, or inventor…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '0.88rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <Filter size={14} />
            <span>Match:</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 0.5, 0.7].map((sc) => (
                <button
                  key={sc}
                  type="button"
                  className={`btn btn-sm ${minScore === sc ? '' : 'secondary'}`}
                  style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                  onClick={() => setMinScore(sc)}
                >
                  {sc === 0 ? 'All' : `≥${Math.round(sc * 100)}%`}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ width: 'auto', padding: '6px 10px', fontSize: '0.82rem' }}
            >
              <option value="score">Relevance</option>
              <option value="date">Filing Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header Count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Showing <strong>{filteredResults.length}</strong> of {data.results.length} patent records
        </span>
      </div>

      {/* Cards List */}
      <div className="card-list">
        {filteredResults.map((item, idx) => (
          <ResultCard
            key={item.id}
            item={{ ...item, rank: idx + 1 }}
            searchId={searchId}
            onSave={handleSave}
            saved={savedIds.has(item.id)}
          />
        ))}
      </div>
    </div>
  )
}
