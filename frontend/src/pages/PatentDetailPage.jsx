import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Layers,
  User,
  Building,
  Calendar,
  SlidersHorizontal,
  AlertTriangle
} from 'lucide-react'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import PatentMeta from '../components/PatentMeta'
import { patentApi } from '../services/api'
import { missing, formatDate } from '../utils/format'
import { useToast } from '../hooks/ToastContext'

export default function PatentDetailPage() {
  const { patentId } = useParams()
  const [params] = useSearchParams()
  const searchId = params.get('search')
  const toast = useToast()

  const [patent, setPatent] = useState(null)
  const [claims, setClaims] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('claims')
  const [copiedClaim, setCopiedClaim] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [p, c] = await Promise.all([
          patentApi.get(patentId),
          patentApi.claims(patentId),
        ])
        setPatent(p)
        setClaims(c)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [patentId])

  async function toggleSave() {
    if (!patent) return
    try {
      if (patent.saved) {
        await patentApi.unsave(patent.id)
        setPatent({ ...patent, saved: false })
        toast.info('Removed from saved library')
      } else {
        await patentApi.save(patent.id)
        setPatent({ ...patent, saved: true })
        toast.success('Saved to library')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update saved state')
    }
  }

  function copyText(text, id) {
    navigator.clipboard.writeText(text)
    setCopiedClaim(id)
    toast.info('Copied to clipboard')
    setTimeout(() => setCopiedClaim(null), 2000)
  }

  if (loading) return <LoadingState label="Loading patent details…" />
  if (error) return <ErrorState message={error} />
  if (!patent) return null

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto' }}>
      {/* Top Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        {searchId ? (
          <Link to={`/app/results/${searchId}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: 'var(--accent-orange)' }}>
            <ArrowLeft size={16} />
            <span>Back to Search Results</span>
          </Link>
        ) : (
          <Link to="/app/saved" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: 'var(--accent-orange)' }}>
            <ArrowLeft size={16} />
            <span>Back to Saved Patents</span>
          </Link>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          {searchId && (
            <Link className="btn secondary btn-sm" to={`/app/compare/${searchId}`}>
              <SlidersHorizontal size={14} />
              <span>Compare Features</span>
            </Link>
          )}
          <button
            className={`btn btn-sm ${patent.saved ? 'secondary' : ''}`}
            type="button"
            onClick={toggleSave}
            style={patent.saved ? { color: 'var(--lc-green)', borderColor: 'rgba(44, 187, 93, 0.4)' } : {}}
          >
            {patent.saved ? (
              <>
                <BookmarkCheck size={14} />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Bookmark size={14} />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Patent Header Banner */}
      <div className="panel" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.45rem', marginBottom: 6, color: '#ffffff' }}>
              {missing(patent.title, 'Untitled Patent')}
            </h1>
            <PatentMeta patent={patent} />
          </div>
          {patent.source_url && (
            <a
              className="btn secondary btn-sm"
              href={patent.source_url}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={14} />
              <span>Source Record</span>
            </a>
          )}
        </div>

        {/* Bibliographic Grid */}
        <div className="grid-2" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            <User size={15} className="text-muted" />
            <span style={{ color: 'var(--text-muted)' }}>Inventor:</span>
            <strong style={{ color: '#ffffff' }}>{missing(patent.inventor)}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            <Building size={15} className="text-muted" />
            <span style={{ color: 'var(--text-muted)' }}>Applicant:</span>
            <strong style={{ color: '#ffffff' }}>{missing(patent.applicant)}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            <Calendar size={15} className="text-muted" />
            <span style={{ color: 'var(--text-muted)' }}>Publication Date:</span>
            <strong style={{ color: '#ffffff' }}>{formatDate(patent.publication_date)}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            <Layers size={15} className="text-muted" />
            <span style={{ color: 'var(--text-muted)' }}>Classification:</span>
            <strong style={{ color: '#ffffff' }}>{missing(patent.ipc_cpc_codes)}</strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border-subtle)', marginBottom: 16, paddingBottom: 6 }}>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'claims' ? '' : 'ghost'}`}
          onClick={() => setActiveTab('claims')}
        >
          <Layers size={14} />
          <span>Claims ({claims.length})</span>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'abstract' ? '' : 'ghost'}`}
          onClick={() => setActiveTab('abstract')}
        >
          <FileText size={14} />
          <span>Abstract</span>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'description' ? '' : 'ghost'}`}
          onClick={() => setActiveTab('description')}
        >
          <FileText size={14} />
          <span>Description</span>
        </button>
      </div>

      {/* Tab: Segmented Claims */}
      {activeTab === 'claims' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {claims.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>
              No claims extracted for this record.
            </div>
          ) : (
            claims.map((claim) => (
              <div
                key={claim.id}
                className="panel"
                style={{
                  padding: 16,
                  borderLeft: claim.claim_number === 1 ? '3px solid var(--accent-orange)' : '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="brand-badge" style={{
                      background: claim.claim_number === 1 ? 'var(--accent-orange-subtle)' : 'var(--bg-surface-elevated)',
                      color: claim.claim_number === 1 ? 'var(--accent-orange)' : 'var(--text-secondary)'
                    }}>
                      Claim {claim.claim_number}
                    </span>
                    {claim.claim_number === 1 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', fontWeight: 600 }}>
                        Independent
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn ghost btn-sm"
                    onClick={() => copyText(claim.claim_text, claim.id)}
                    style={{ padding: '3px 6px', fontSize: '0.75rem' }}
                  >
                    {copiedClaim === claim.id ? (
                      <>
                        <Check size={12} style={{ color: 'var(--lc-green)' }} />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  color: '#d0d0d0',
                  whiteSpace: 'pre-wrap',
                }}>
                  {claim.claim_text}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Abstract */}
      {activeTab === 'abstract' && (
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Abstract</h3>
            <button
              type="button"
              className="btn ghost btn-sm"
              onClick={() => copyText(patent.abstract, 'abstract')}
            >
              {copiedClaim === 'abstract' ? <Check size={13} style={{ color: 'var(--lc-green)' }} /> : <Copy size={13} />}
              <span>Copy</span>
            </button>
          </div>
          <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: '#e0e0e0', whiteSpace: 'pre-wrap', margin: 0 }}>
            {missing(patent.abstract)}
          </p>
        </div>
      )}

      {/* Tab: Detailed Description */}
      {activeTab === 'description' && (
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Detailed Description</h3>
            <button
              type="button"
              className="btn ghost btn-sm"
              onClick={() => copyText(patent.description, 'description')}
            >
              {copiedClaim === 'description' ? <Check size={13} style={{ color: 'var(--lc-green)' }} /> : <Copy size={13} />}
              <span>Copy</span>
            </button>
          </div>
          <div style={{
            fontSize: '0.9rem',
            lineHeight: 1.6,
            color: '#d0d0d0',
            whiteSpace: 'pre-wrap',
          }}>
            {missing(patent.description, 'No detailed description available in this record.')}
          </div>
        </div>
      )}
    </div>
  )
}
