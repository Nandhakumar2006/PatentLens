import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  SlidersHorizontal,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  User,
  Building
} from 'lucide-react'
import PatentMeta from './PatentMeta'
import ScoreBadge from './ScoreBadge'
import { missing } from '../utils/format'
import { useToast } from '../hooks/ToastContext'

export default function ResultCard({ item, searchId, onSave, saved }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const [showAllExcerpts, setShowAllExcerpts] = useState(false)

  const pubNum = item.publication_number || item.patent_id

  function handleCopy(e) {
    e.stopPropagation()
    navigator.clipboard.writeText(pubNum)
    setCopied(true)
    toast.info(`Copied ${pubNum}`)
    setTimeout(() => setCopied(false), 2000)
  }

  const excerpts = item.excerpts || []
  const displayedExcerpts = showAllExcerpts ? excerpts : excerpts.slice(0, 1)

  return (
    <article className="panel result-card">
      <div className="result-card-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Link
              to={`/app/patents/${item.id}?search=${searchId || ''}`}
              className="result-card-title"
            >
              {missing(item.title, 'Untitled Patent')}
            </Link>
            <button
              type="button"
              className="btn ghost btn-sm"
              onClick={handleCopy}
              title="Copy publication number"
              style={{ padding: '2px 5px', color: 'var(--text-muted)' }}
            >
              {copied ? <Check size={13} style={{ color: 'var(--lc-green)' }} /> : <Copy size={13} />}
            </button>
          </div>
          <PatentMeta patent={item} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <ScoreBadge value={item.similarity_score} />
          {item.rank && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              #{item.rank}
            </span>
          )}
        </div>
      </div>

      <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
        {missing(item.abstract, 'No abstract provided in source data.')}
      </p>

      {/* Bibliographic snippet */}
      {(item.inventor || item.applicant) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {item.inventor && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <User size={12} />
              <span>Inventor: <strong style={{ color: 'var(--text-primary)' }}>{item.inventor}</strong></span>
            </span>
          )}
          {item.applicant && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Building size={12} />
              <span>Assignee: <strong style={{ color: 'var(--text-primary)' }}>{item.applicant}</strong></span>
            </span>
          )}
        </div>
      )}

      {/* Relevant Excerpts section */}
      {excerpts.length > 0 && (
        <div style={{ marginTop: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Matching Excerpts ({excerpts.length})
            </span>
            {excerpts.length > 1 && (
              <button
                type="button"
                className="btn ghost btn-sm"
                onClick={() => setShowAllExcerpts(!showAllExcerpts)}
                style={{ fontSize: '0.75rem', padding: '2px 5px', color: 'var(--accent-orange)' }}
              >
                {showAllExcerpts ? (
                  <>Less <ChevronUp size={12} /></>
                ) : (
                  <>Show all ({excerpts.length}) <ChevronDown size={12} /></>
                )}
              </button>
            )}
          </div>

          {displayedExcerpts.map((ex, idx) => (
            <div key={idx} className="excerpt-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="excerpt-badge">
                  {ex.chunk_type || 'Excerpt'}
                </span>
              </div>
              <div style={{ fontStyle: 'italic', lineHeight: 1.5 }}>
                "{ex.text}"
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons row */}
      <div className="row-actions" style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
        <Link className="btn btn-sm" to={`/app/patents/${item.id}?search=${searchId || ''}`}>
          <FileText size={14} />
          <span>Claims & Disclosure</span>
        </Link>

        {searchId && (
          <Link className="btn secondary btn-sm" to={`/app/compare/${searchId}`}>
            <SlidersHorizontal size={14} />
            <span>Compare Features</span>
          </Link>
        )}

        {onSave && (
          <button
            className="btn secondary btn-sm"
            type="button"
            onClick={() => onSave(item)}
            style={saved ? { color: 'var(--lc-green)', borderColor: 'rgba(44, 187, 93, 0.35)' } : {}}
          >
            {saved ? (
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
        )}

        {item.source_url && (
          <a
            className="btn ghost btn-sm"
            href={item.source_url}
            target="_blank"
            rel="noreferrer"
            style={{ marginLeft: 'auto' }}
          >
            <ExternalLink size={14} />
            <span>Registry</span>
          </a>
        )}
      </div>
    </article>
  )
}
