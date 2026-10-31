import { useState, useEffect, useRef } from 'react'
import { ShieldAlert, X, Eye, EyeOff, Lock, AlertTriangle } from 'lucide-react'

export default function SecretConfirmDialog({
  open,
  title = 'Admin Authorization Required',
  description,
  warning = 'This action is permanent and cannot be undone.',
  confirmText = 'Confirm & Delete',
  onConfirm,
  onCancel,
  isDanger = true,
}) {
  const [secretPassword, setSecretPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setSecretPassword('')
      setShowPassword(false)
      setError(null)
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && open && !loading) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, loading, onCancel])

  if (!open) return null

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    if (!secretPassword.trim()) {
      setError('Please enter the admin secret authorization password')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await onConfirm(secretPassword.trim())
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Authorization failed or invalid secret password'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={() => {
        if (!loading) onCancel()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480, width: '92%' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: isDanger ? 'var(--lc-red-subtle)' : 'var(--accent-orange-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDanger ? 'var(--lc-red)' : 'var(--accent-orange)',
                border: isDanger ? '1px solid rgba(239, 71, 67, 0.35)' : '1px solid rgba(255, 161, 22, 0.35)',
              }}
            >
              {isDanger ? <ShieldAlert size={20} /> : <Lock size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{title}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Protected Administrative Action
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn ghost btn-sm"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close modal"
            style={{ padding: 6, color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Description & Warning */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 10px' }}>
            {description}
          </p>

          {warning && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 6,
                background: 'rgba(239, 71, 67, 0.1)',
                border: '1px solid rgba(239, 71, 67, 0.25)',
                color: 'var(--lc-red)',
                fontSize: '0.8rem',
              }}
            >
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <span>{warning}</span>
            </div>
          )}
        </div>

        {/* Secret Password Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="secret-pass-input"
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 6,
              }}
            >
              Enter Admin Secret Password:
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="secret-pass-input"
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                className="input"
                value={secretPassword}
                onChange={(e) => {
                  setSecretPassword(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="Enter secret authorization password"
                disabled={loading}
                style={{ width: '100%', paddingRight: 40, fontFamily: showPassword ? 'inherit' : 'monospace' }}
                autoComplete="off"
              />
              <button
                type="button"
                className="btn ghost"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: 6,
                  color: 'var(--text-muted)',
                  border: 'none',
                  background: 'transparent',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: '0.8rem',
                  color: 'var(--lc-red)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>⚠️ {error}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              className="btn secondary"
              type="button"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className={`btn ${isDanger ? 'danger' : ''}`}
              type="submit"
              disabled={loading || !secretPassword.trim()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {loading && <div className="spinner" style={{ width: 14, height: 14 }} />}
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
