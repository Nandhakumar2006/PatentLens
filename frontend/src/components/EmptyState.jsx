import { SearchX, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function EmptyState({
  title = 'No records found',
  body = 'No matches found in the current view.',
  actionLink,
  actionLabel,
  icon: Icon = SearchX
}) {
  return (
    <div className="panel" style={{
      textAlign: 'center',
      padding: '48px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      background: 'rgba(19, 28, 49, 0.4)',
      borderColor: 'var(--border-subtle)',
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
      }}>
        <Icon size={26} />
      </div>

      <div style={{ maxWidth: 440 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem' }}>{title}</h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {body}
        </p>
      </div>

      {actionLink && actionLabel && (
        <Link to={actionLink} className="btn btn-sm" style={{ marginTop: 8 }}>
          <span>{actionLabel}</span>
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  )
}
