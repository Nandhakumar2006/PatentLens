import { Navigate, Outlet } from 'react-router-dom'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Database,
  Upload,
  BarChart3,
  Activity,
  ArrowLeft,
  LogOut,
  Shield,
} from 'lucide-react'
import { useAuth } from '../hooks/AuthContext'
import { useToast } from '../hooks/ToastContext'

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/patents', icon: Database, label: 'Patents' },
  { to: '/admin/ingest', icon: Upload, label: 'Ingestion' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/system', icon: Activity, label: 'System Health' },
]

export default function AdminLayout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  if (loading) {
    return (
      <div className="layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Loading admin session…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/app" replace />

  async function handleLogout() {
    await logout()
    toast.info('Signed out')
    navigate('/')
  }

  const navItemClass = ({ isActive }) =>
    `admin-sidebar-link ${isActive ? 'active' : ''}`

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="brand-icon-wrapper" style={{ width: 28, height: 28, fontSize: '0.72rem' }}>
            <Shield size={14} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Admin Panel</span>
        </div>

        <nav className="admin-sidebar-nav">
          {adminLinks.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={navItemClass}>
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <NavLink to="/app" className="admin-sidebar-link" style={{ color: 'var(--accent-orange)' }}>
            <ArrowLeft size={16} />
            <span>Back to App</span>
          </NavLink>
          <button
            type="button"
            className="admin-sidebar-link"
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
          <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Signed in as <span style={{ color: 'var(--accent-orange)' }}>{user.full_name}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  )
}
