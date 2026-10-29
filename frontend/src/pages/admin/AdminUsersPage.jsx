import { useState, useEffect } from 'react'
import { Shield, ShieldOff, UserCheck, UserX, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useToast } from '../../hooks/ToastContext'

export default function AdminUsersPage() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: 20 })
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  function loadUsers(page = 1) {
    setLoading(true)
    adminApi
      .users(page)
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadUsers() }, [])

  async function toggleRole(user) {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    try {
      await adminApi.updateRole(user.id, newRole)
      toast.success(`${user.full_name} is now ${newRole}`)
      loadUsers(data.page)
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function toggleStatus(user) {
    try {
      await adminApi.updateStatus(user.id, !user.is_active)
      toast.success(`${user.full_name} ${!user.is_active ? 'activated' : 'suspended'}`)
      loadUsers(data.page)
    } catch (e) {
      toast.error(e.message)
    }
  }

  const totalPages = Math.ceil(data.total / data.page_size) || 1

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>User Management</h2>
        <p className="muted small" style={{ margin: '4px 0 0' }}>
          {data.total} registered user{data.total !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto' }} />
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Searches</th>
                  <th>Joined</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{u.id}</td>
                    <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                    <td style={{ fontSize: '0.82rem' }}>{u.email}</td>
                    <td>
                      <span
                        className="score-badge"
                        style={
                          u.role === 'admin'
                            ? { background: 'var(--accent-orange-subtle)', color: 'var(--accent-orange)', border: '1px solid rgba(255,161,22,0.35)' }
                            : { background: 'var(--lc-blue-subtle)', color: 'var(--lc-blue)', border: '1px solid rgba(0,122,255,0.35)' }
                        }
                      >
                        {u.role === 'admin' ? <Shield size={12} /> : null}
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className="score-badge"
                        style={
                          u.is_active
                            ? { background: 'var(--lc-green-subtle)', color: 'var(--lc-green)', border: '1px solid rgba(44,187,93,0.3)' }
                            : { background: 'var(--lc-red-subtle)', color: 'var(--lc-red)', border: '1px solid rgba(239,71,67,0.3)' }
                        }
                      >
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{u.searches_count}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn secondary btn-sm"
                          onClick={() => toggleRole(u)}
                          title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                        >
                          {u.role === 'admin' ? <ShieldOff size={13} /> : <Shield size={13} />}
                          {u.role === 'admin' ? 'Demote' : 'Promote'}
                        </button>
                        <button
                          className={`btn btn-sm ${u.is_active ? 'danger' : ''}`}
                          style={!u.is_active ? { background: 'var(--lc-green)', color: '#fff' } : {}}
                          onClick={() => toggleStatus(u)}
                          title={u.is_active ? 'Suspend Account' : 'Activate Account'}
                        >
                          {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16, alignItems: 'center' }}>
              <button
                className="btn secondary btn-sm"
                disabled={data.page <= 1}
                onClick={() => loadUsers(data.page - 1)}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="muted small">
                Page {data.page} of {totalPages}
              </span>
              <button
                className="btn secondary btn-sm"
                disabled={data.page >= totalPages}
                onClick={() => loadUsers(data.page + 1)}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
