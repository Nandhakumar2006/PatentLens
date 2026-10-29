import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({ open, title, body, onConfirm, onCancel, confirmText = 'Confirm Delete', isDanger = true }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && open) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: isDanger ? 'var(--rose-surface)' : 'rgba(99, 102, 241, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDanger ? 'var(--rose)' : 'var(--accent-primary)',
            }}>
              <AlertTriangle size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{title}</h3>
          </div>
          <button
            type="button"
            className="btn ghost btn-sm"
            onClick={onCancel}
            aria-label="Close modal"
            style={{ padding: 6, color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: 24 }}>
          {body}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`btn ${isDanger ? 'danger' : ''}`}
            type="button"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
