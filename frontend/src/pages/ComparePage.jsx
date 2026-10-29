import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  SlidersHorizontal,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  FileText,
  Layers,
  X
} from 'lucide-react'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import { analysisApi, searchApi } from '../services/api'
import { useToast } from '../hooks/ToastContext'

export default function ComparePage() {
  const { searchId } = useParams()
  const toast = useToast()

  const [features, setFeatures] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const search = await searchApi.detail(searchId)
        const featList = search.technical_features || []
        setFeatures(featList.join('\n'))
        if (featList.length > 0) {
          setBusy(true)
          const result = await analysisApi.compare({
            search_id: Number(searchId),
            technical_features: featList,
          })
          setData(result)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setInitialLoading(false)
        setBusy(false)
      }
    }
    load()
  }, [searchId])

  async function onSubmit(e) {
    e.preventDefault()
    const list = features.split('\n').map((s) => s.trim()).filter(Boolean)
    if (!list.length) {
      setError('Enter at least one technical feature to evaluate.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await analysisApi.compare({
        search_id: Number(searchId),
        technical_features: list,
      })
      setData(result)
      toast.success('Feature comparison updated!')
    } catch (err) {
      setError(err.message)
      toast.error('Feature comparison failed')
    } finally {
      setBusy(false)
    }
  }

  if (initialLoading) return <LoadingState label="Loading feature comparison…" />

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto' }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Link to={`/app/results/${searchId}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: '#818cf8', fontWeight: 500 }}>
          <ArrowLeft size={16} />
          <span>Back to Results</span>
        </Link>
        <span className="brand-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
          Search #{searchId} Analysis
        </span>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: 6 }}>Feature & Claim Comparison</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Evaluate each of your invention's technical features against the claims and text of retrieved patents.
        </p>
      </div>

      <ErrorState message={error} />

      {/* Feature Input Panel */}
      <form className="panel form-stack" onSubmit={onSubmit} style={{ marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="label" htmlFor="features" style={{ margin: 0 }}>
              <SlidersHorizontal size={15} className="text-muted" />
              <span>Features to Compare (One per line)</span>
            </label>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {features.split('\n').filter(Boolean).length} features
            </span>
          </div>
          <textarea
            id="features"
            rows={4}
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder="Enter features to evaluate against claims..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" disabled={busy} type="submit">
            {busy ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" style={{ width: 16, height: 16 }} />
                <span>Evaluating…</span>
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SlidersHorizontal size={16} />
                <span>Update Comparison</span>
              </span>
            )}
          </button>
        </div>
      </form>

      {busy && (
        <div style={{ marginBottom: 24 }}>
          <LoadingState
            label="Comparing technical features with patent claims…"
            subtext="Analyzing similarities and identifying novelty opportunities"
          />
        </div>
      )}

      {/* Comparison Results */}
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {data.comparisons.map((row, idx) => {
            const hasNoEvidence = row.no_evidence_found
            const topSimilarity = row.evidence?.[0]?.similarity || 0

            return (
              <section
                key={idx}
                className="panel matrix-card"
                style={{
                  borderLeftColor: hasNoEvidence ? '#10b981' : topSimilarity >= 0.65 ? '#f43f5e' : '#6366f1',
                  background: 'rgba(19, 28, 49, 0.75)',
                }}
              >
                {/* Feature Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                      Feature #{idx + 1}
                    </span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '1.2rem', color: '#fff' }}>
                      {row.feature}
                    </h3>
                  </div>

                  <div>
                    {hasNoEvidence ? (
                      <span className="score-badge score-high" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.35)' }}>
                        <Sparkles size={13} />
                        Novelty Opportunity (No Direct Prior Art)
                      </span>
                    ) : (
                      <span className={`score-badge ${topSimilarity >= 0.65 ? 'score-high' : 'score-mid'}`}>
                        {topSimilarity >= 0.65 ? 'Prior-Art Overlap Detected' : 'Partial Overlap Found'}
                        {' '}({Math.round(topSimilarity * 100)}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Novelty Opportunity Callout */}
                {hasNoEvidence ? (
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}>
                    <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong style={{ color: '#34d399', display: 'block', fontSize: '0.92rem', marginBottom: 2 }}>
                        Potential Novelty Opportunity
                      </strong>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#a7f3d0', lineHeight: 1.5 }}>
                        No direct matching claims were found for this feature in the top retrieved patents. This feature may represent an inventive novelty.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Interpretation / Explanation */}
                <div style={{
                  background: 'rgba(9, 13, 22, 0.6)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: 16,
                  fontSize: '0.88rem',
                  color: 'var(--text-secondary)',
                }}>
                  <strong style={{ color: 'var(--text-primary)', marginRight: 6 }}>
                    Summary:
                  </strong>
                  {row.interpretation}
                </div>

                {/* Evidence Table */}
                {row.evidence?.length > 0 ? (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '25%' }}>Patent Document</th>
                          <th style={{ width: '18%' }}>Source Section</th>
                          <th style={{ width: '15%' }}>Match Score</th>
                          <th>Relevant Prior-Art Excerpt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.evidence.map((ev, evIdx) => (
                          <tr key={evIdx}>
                            <td>
                              <strong style={{ color: '#fff', display: 'block' }}>
                                {ev.publication_number || 'Patent Record'}
                              </strong>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {ev.title}
                              </span>
                            </td>
                            <td>
                              <span className="chip" style={{ fontSize: '0.75rem' }}>
                                {ev.source_type}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 700, color: ev.similarity >= 0.65 ? '#f43f5e' : '#fbbf24' }}>
                                  {Math.round(ev.similarity * 100)}%
                                </span>
                              </div>
                              <div className="match-bar-bg" style={{ width: 80 }}>
                                <div
                                  className="match-bar-fill"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, ev.similarity * 100))}%`,
                                    background: ev.similarity >= 0.65 ? '#f43f5e' : 'linear-gradient(90deg, #6366f1, #06b6d4)'
                                  }}
                                />
                              </div>
                            </td>
                            <td style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                              "{ev.source_text}"
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
