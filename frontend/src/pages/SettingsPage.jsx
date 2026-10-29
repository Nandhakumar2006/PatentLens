import { useNavigate } from 'react-router-dom'
import { User, Mail, LogOut, Shield, ShieldCheck } from 'lucide-react'
import { useAuth } from '../hooks/AuthContext'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, marginBottom: 4 }}>Account Settings</h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Manage your user profile and session settings
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* User Profile Card */}
        <section className="panel">
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem' }}>Profile Information</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--accent-orange)',
              color: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 800,
            }}>
              {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 600, color: '#ffffff' }}>
                  {user.full_name}
                </span>
                <span
                  className="score-badge"
                  style={
                    user.role === 'admin'
                      ? { background: 'var(--accent-orange-subtle)', color: 'var(--accent-orange)', border: '1px solid rgba(255,161,22,0.35)' }
                      : { background: 'var(--lc-blue-subtle)', color: 'var(--lc-blue)', border: '1px solid rgba(0,122,255,0.35)' }
                  }
                >
                  {user.role === 'admin' ? <Shield size={11} style={{ marginRight: 3 }} /> : null}
                  {user.role === 'admin' ? 'Administrator' : 'Standard User'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
                <Mail size={13} className="text-muted" />
                <span>{user.email}</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, display: 'flex', gap: 10 }}>
            {user.role === 'admin' && (
              <button
                className="btn btn-sm"
                type="button"
                onClick={() => navigate('/admin')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <ShieldCheck size={14} />
                <span>Open Admin Panel</span>
              </button>
            )}
            <button
              className="btn secondary btn-sm"
              type="button"
              onClick={logout}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
