import { useState, useEffect } from 'react'
import { Shield, ShieldOff, UserCheck, UserX, ChevronLeft, ChevronRight, Trash2, Lock } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useToast } from '../../hooks/ToastContext'
import SecretConfirmDialog from '../../components/SecretConfirmDialog'

const PRIMARY_ADMIN_EMAIL = 'nandhakumar2006@gmail.com'

export default function AdminUsersPage() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: 20 })
  const [loading, setLoading] = useState(true)
  const [userToDelete, setUserToDelete] = useState(null)
  const [roleTarget, setRoleTarget] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)
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

  function requestRoleToggle(user) {
    if (user.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() && user.role === 'admin') {
      toast.error('The primary predefined administrator cannot be demoted')
      return
    }
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    setRoleTarget({ user, newRole })
  }

  async function handleConfirmRoleChange(secretPassword) {
    if (!roleTarget) return
    const { user, newRole } = roleTarget
    await adminApi.updateRole(user.id, newRole, secretPassword)
    toast.success(`${user.bio_name || user.full_name || user.email} is now ${newRole}`)
    setRoleTarget(null)
    loadUsers(data.page)
  }

  function requestStatusToggle(user) {
    if (user.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() && user.is_active) {
      toast.error('The primary predefined administrator cannot be suspended')
      return
    }
    const newStatus = !user.is_active
    setStatusTarget({ user, newStatus })
  }

  async function handleConfirmStatusChange(secretPassword) {
    if (!statusTarget) return
    const { user, newStatus } = statusTarget
    await adminApi.updateStatus(user.id, newStatus, secretPassword)
    toast.success(`${user.bio_name || user.full_name || user.email} ${newStatus ? 'activated' : 'suspended'}`)
    setStatusTarget(null)
    loadUsers(data.page)
  }

  async function handleConfirmDeleteUser(secretPassword) {
    if (!userToDelete) return
    await adminApi.deleteUser(userToDelete.id, secretPassword)
    toast.success(`User ${userToDelete.bio_name || userToDelete.full_name || userToDelete.email} removed successfully`)
    setUserToDelete(null)
    loadUsers(data.page)
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
                  <th>User (Bio & Username)</th>
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
                    <td style={{ fontWeight: 600 }}>
                      <div>{u.bio_name || u.full_name}</div>
                      {u.username && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', fontFamily: 'monospace' }}>
                          @{u.username}
                        </div>
                      )}
                    </td>
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
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {u.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() ? (
                          <button
                            className="btn secondary btn-sm"
                            disabled
                            title="Primary predefined administrator cannot be demoted"
                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                          >
                            <Shield size={13} /> Admin
                          </button>
                        ) : (
                          <button
                            className="btn secondary btn-sm"
                            onClick={() => requestRoleToggle(u)}
                            title={u.role === 'admin' ? 'Demote to User (Requires Secret Password)' : 'Promote to Admin (Requires Secret Password)'}
                          >
                            {u.role === 'admin' ? <ShieldOff size={13} /> : <Shield size={13} />}
                            {u.role === 'admin' ? 'Demote' : 'Promote'}
                          </button>
                        )}

                        {u.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() ? (
                          <button
                            className="btn btn-sm secondary"
                            disabled
                            title="Primary predefined administrator cannot be suspended"
                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                          >
                            <UserCheck size={13} /> Active
                          </button>
                        ) : (
                          <button
                            className={`btn btn-sm ${u.is_active ? 'secondary' : ''}`}
                            style={!u.is_active ? { background: 'var(--lc-green)', color: '#fff' } : {}}
                            onClick={() => requestStatusToggle(u)}
                            title={u.is_active ? 'Suspend Account (Requires Secret Password)' : 'Activate Account (Requires Secret Password)'}
                          >
                            {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>
                        )}

                        {u.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() ? (
                          <span
                            className="score-badge"
                            style={{
                              fontSize: '0.72rem',
                              opacity: 0.75,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              padding: '4px 8px',
                            }}
                            title="Primary predefined administrator account is protected and cannot be deleted"
                          >
                            <Lock size={11} /> Primary Admin
                          </span>
                        ) : u.role === 'admin' ? (
                          <button
                            className="btn btn-sm secondary"
                            disabled
                            title="Administrators cannot be deleted directly. Demote this admin to a regular user first."
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, opacity: 0.45, cursor: 'not-allowed' }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm danger"
                            onClick={() => setUserToDelete(u)}
                            title="Permanently remove user (Requires Secret Password)"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
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

      {/* User Deletion Secret Password Confirmation Modal */}
      <SecretConfirmDialog
        open={Boolean(userToDelete)}
        title="Remove User Account"
        description={
          userToDelete ? (
            <span>
              Are you sure you want to permanently delete user{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {userToDelete.bio_name || userToDelete.full_name}
              </strong>{' '}
              {userToDelete.username && (
                <span style={{ color: 'var(--accent-orange)', fontFamily: 'monospace' }}>
                  (@{userToDelete.username})
                </span>
              )}{' '}
              with email <span style={{ fontFamily: 'monospace' }}>{userToDelete.email}</span>?
              All associated user searches, saved patents, and activity will be permanently removed.
            </span>
          ) : null
        }
        warning="This action is permanent and cannot be undone."
        confirmText="Confirm & Remove User"
        onConfirm={handleConfirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
        isDanger={true}
      />

      {/* Role Change (Promote/Demote) Secret Password Confirmation Modal */}
      <SecretConfirmDialog
        open={Boolean(roleTarget)}
        title={roleTarget?.newRole === 'admin' ? 'Promote User to Administrator' : 'Demote Administrator to User'}
        description={
          roleTarget ? (
            <span>
              Are you sure you want to {roleTarget.newRole === 'admin' ? 'promote' : 'demote'}{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {roleTarget.user.bio_name || roleTarget.user.full_name}
              </strong>{' '}
              {roleTarget.user.username && (
                <span style={{ color: 'var(--accent-orange)', fontFamily: 'monospace' }}>
                  (@{roleTarget.user.username})
                </span>
              )}{' '}
              to <strong style={{ color: roleTarget.newRole === 'admin' ? 'var(--accent-orange)' : 'var(--lc-blue)' }}>{roleTarget.newRole.toUpperCase()}</strong>?
              <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {roleTarget.newRole === 'admin'
                  ? '✨ This user will gain administrative access to manage patents, users, and ingestion.'
                  : '⚠️ This user will lose administrative access. (Once demoted, their account can be deleted if needed).'}
              </div>
            </span>
          ) : null
        }
        warning={
          roleTarget?.newRole === 'user'
            ? 'Demoting this administrator will revoke their admin privileges and allow their account to be deleted.'
            : 'Promoting a user grants them administrative capabilities across the platform.'
        }
        confirmText={roleTarget?.newRole === 'admin' ? 'Confirm Promotion' : 'Confirm Demotion'}
        onConfirm={handleConfirmRoleChange}
        onCancel={() => setRoleTarget(null)}
        isDanger={roleTarget?.newRole === 'user'}
      />

      {/* Account Status Change (Suspend/Activate) Secret Password Confirmation Modal */}
      <SecretConfirmDialog
        open={Boolean(statusTarget)}
        title={statusTarget?.newStatus ? 'Activate User Account' : 'Suspend User Account'}
        description={
          statusTarget ? (
            <span>
              Are you sure you want to {statusTarget.newStatus ? 'activate' : 'suspend'} the account of{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {statusTarget.user.bio_name || statusTarget.user.full_name}
              </strong>{' '}
              {statusTarget.user.username && (
                <span style={{ color: 'var(--accent-orange)', fontFamily: 'monospace' }}>
                  (@{statusTarget.user.username})
                </span>
              )}{' '}
              (<span style={{ fontFamily: 'monospace' }}>{statusTarget.user.email}</span>)?
              <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {!statusTarget.newStatus
                  ? '🚫 Suspending this user will immediately revoke their ability to log in and access the system.'
                  : '✅ Activating this user will restore their access to the platform.'}
              </div>
            </span>
          ) : null
        }
        warning={
          !statusTarget?.newStatus
            ? 'The user will be locked out until an administrator reactivates their account.'
            : 'Access will be restored immediately.'
        }
        confirmText={statusTarget?.newStatus ? 'Confirm Activation' : 'Confirm Suspension'}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setStatusTarget(null)}
        isDanger={!statusTarget?.newStatus}
      />
    </div>
  )
}
