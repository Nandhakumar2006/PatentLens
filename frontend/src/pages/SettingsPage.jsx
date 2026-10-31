import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, LogOut, Shield, ShieldCheck, Lock, Edit3, Check, X, Calendar, AtSign, User } from 'lucide-react'
import { useAuth } from '../hooks/AuthContext'
import { useToast } from '../hooks/ToastContext'
import { authApi } from '../services/api'

const BIONAME_REGEX = /^[a-zA-Z\s]+$/

export default function SettingsPage() {
  const { user, logout, refresh } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [editingBio, setEditingBio] = useState(false)
  const [newBio, setNewBio] = useState(user?.bio_name || '')
  const [savingBio, setSavingBio] = useState(false)
  const [bioError, setBioError] = useState('')

  if (!user) return null

  function startEditing() {
    setNewBio(user.bio_name || '')
    setBioError('')
    setEditingBio(true)
  }

  function cancelEditing() {
    setEditingBio(false)
    setBioError('')
  }

  async function handleSaveBio(e) {
    e.preventDefault()
    setBioError('')
    const clean = newBio.trim()
    if (!clean || !BIONAME_REGEX.test(clean) || !/[a-zA-Z]/.test(clean)) {
      setBioError('Bio name must contain only letters.')
      return
    }

    setSavingBio(true)
    try {
      await authApi.updateProfile({ bio_name: clean })
      await refresh()
      toast.success('Bio name updated successfully!')
      setEditingBio(false)
    } catch (err) {
      setBioError(err.message)
      toast.error(err.message)
    } finally {
      setSavingBio(false)
    }
  }

  const formattedEditableDate = user.bio_name_editable_at
    ? new Date(user.bio_name_editable_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  const formattedJoinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—'

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, marginBottom: 4 }}>Account Settings</h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Manage your personal profile and account credentials
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* User Profile Card */}
        <section className="panel" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '1.05rem' }}>Profile Information</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'var(--accent-orange)',
                color: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {(user.bio_name || user.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
                  {user.bio_name || user.full_name}
                </span>
                <span
                  className="score-badge"
                  style={
                    user.role === 'admin'
                      ? { background: 'var(--accent-orange-subtle)', color: 'var(--accent-orange)', border: '1px solid rgba(255,161,22,0.35)' }
                      : { background: 'var(--lc-blue-subtle)', color: 'var(--lc-blue)', border: '1px solid rgba(0,122,255,0.35)' }
                  }
                >
                  {user.role === 'admin' ? <Shield size={11} style={{ marginRight: 4 }} /> : null}
                  {user.role === 'admin' ? 'Administrator' : 'Standard User'}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--accent-orange)', fontWeight: 600, marginTop: 2 }}>
                @{user.username}
              </div>
            </div>
          </div>

          {/* Detailed Fields Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Username Field (Immutable) */}
            <div style={{ background: 'var(--bg-secondary)', padding: '14px 16px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AtSign size={13} /> Username
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4 }}>
                  <Lock size={10} /> Permanent (Cannot be changed)
                </span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff', fontFamily: 'monospace' }}>
                {user.username}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Contains letters, numbers, dollar ($), underscore (_), and hyphen (-). This identity is fixed.
              </p>
            </div>

            {/* Bio Name Field (Editable after 14 days) */}
            <div style={{ background: 'var(--bg-secondary)', padding: '14px 16px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={13} /> Bio Name
                </span>

                {user.can_edit_bio_name ? (
                  !editingBio && (
                    <button
                      type="button"
                      className="btn secondary btn-sm"
                      onClick={startEditing}
                      style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <Edit3 size={11} /> Edit Bio Name
                    </button>
                  )
                ) : (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--accent-orange)',
                      background: 'var(--accent-orange-subtle)',
                      border: '1px solid rgba(255,161,22,0.3)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Lock size={10} /> Editable in {user.days_until_bio_name_edit} day{user.days_until_bio_name_edit !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {!editingBio ? (
                <>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff' }}>
                    {user.bio_name || user.full_name}
                  </div>
                  {!user.can_edit_bio_name && formattedEditableDate && (
                    <p style={{ margin: '6px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Bio name can only be edited 14 days after creation or last edit. Next available on <strong>{formattedEditableDate}</strong>.
                    </p>
                  )}
                  {user.can_edit_bio_name && (
                    <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Must contain only letters.
                    </p>
                  )}
                </>
              ) : (
                <form onSubmit={handleSaveBio} style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Enter new bio name (letters only)"
                      value={newBio}
                      onChange={(e) => setNewBio(e.target.value)}
                      style={{ flex: 1, padding: '7px 12px' }}
                    />
                    <button
                      type="submit"
                      className="btn btn-sm"
                      disabled={savingBio}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <Check size={13} /> Save
                    </button>
                    <button
                      type="button"
                      className="btn secondary btn-sm"
                      onClick={cancelEditing}
                      disabled={savingBio}
                    >
                      <X size={13} /> Cancel
                    </button>
                  </div>
                  {bioError && (
                    <div style={{ color: 'var(--lc-red)', fontSize: '0.8rem', marginTop: 6 }}>
                      {bioError}
                    </div>
                  )}
                  <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Note: Once updated, your bio name will be locked for another 14 days. Letters only.
                  </p>
                </form>
              )}
            </div>

            {/* Email Field */}
            <div style={{ background: 'var(--bg-secondary)', padding: '14px 16px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={13} /> Email Address
              </div>
              <div style={{ fontSize: '1rem', color: '#ffffff' }}>
                {user.email}
              </div>
            </div>

            {/* Account Created Date */}
            <div style={{ background: 'var(--bg-secondary)', padding: '14px 16px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={13} /> Member Since
              </div>
              <div style={{ fontSize: '0.95rem', color: '#ffffff' }}>
                {formattedJoinedDate}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 18, marginTop: 20, display: 'flex', gap: 10 }}>
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
