import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import ErrorState from '../components/ErrorState'
import { useAuth } from '../hooks/AuthContext'
import { useToast } from '../hooks/ToastContext'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await login(form, 'register')
      toast.success('Account created!')
      navigate('/app')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 440, padding: '48px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div className="brand-icon-wrapper" style={{ margin: '0 auto 12px', width: 36, height: 36, fontSize: '1rem', fontWeight: 800 }}>
          PL
        </div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Create Account</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
          Get started with prior-art retrieval tools
        </p>
      </div>

      <div className="panel" style={{ padding: 24 }}>
        <ErrorState message={error} />

        <form className="form-stack" onSubmit={onSubmit}>
          <div>
            <label className="label" htmlFor="name">
              <User size={13} className="text-muted" />
              <span>Full Name</span>
            </label>
            <input
              id="name"
              type="text"
              required
              placeholder="Dr. Jane Doe"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>

          <div>
            <label className="label" htmlFor="email">
              <Mail size={13} className="text-muted" />
              <span>Email Address</span>
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="jane@university.edu"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              <Lock size={13} className="text-muted" />
              <span>Password (minimum 8 characters)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                placeholder="••••••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={{ paddingRight: 36 }}
              />
              <button
                type="button"
                className="btn ghost btn-sm"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: 4,
                  color: 'var(--text-muted)',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button className="btn btn-lg" disabled={busy} type="submit" style={{ marginTop: 6 }}>
            {busy ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="spinner" style={{ width: 15, height: 15 }} />
                <span>Creating…</span>
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserPlus size={16} />
                <span>Create Account</span>
              </span>
            )}
          </button>
        </form>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
