import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Search,
  History,
  Bookmark,
  FileText,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  Shield,
} from 'lucide-react'
import { useAuth } from '../hooks/AuthContext'
import { useToast } from '../hooks/ToastContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await logout()
    toast.info('Logged out')
    navigate('/')
  }

  const navItemClass = ({ isActive }) =>
    `nav-link ${isActive ? 'active' : ''}`

  return (
    <header>
      <div className="container nav">
        <NavLink to={user ? '/app' : '/'} className="brand" onClick={() => setMobileOpen(false)}>
          <div className="brand-icon-wrapper">
            PL
          </div>
          <span>PatentLens</span>
        </NavLink>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="btn ghost btn-sm"
          style={{ display: 'none' }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <nav className={`nav-links ${mobileOpen ? 'mobile-open' : ''}`}>
          {user ? (
            <>
              <NavLink to="/app" end className={navItemClass} onClick={() => setMobileOpen(false)}>
                <LayoutDashboard size={15} />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/app/search" className={navItemClass} onClick={() => setMobileOpen(false)}>
                <Search size={15} />
                <span>New Search</span>
              </NavLink>
              <NavLink to="/app/history" className={navItemClass} onClick={() => setMobileOpen(false)}>
                <History size={15} />
                <span>History</span>
              </NavLink>
              <NavLink to="/app/saved" className={navItemClass} onClick={() => setMobileOpen(false)}>
                <Bookmark size={15} />
                <span>Saved</span>
              </NavLink>
              <NavLink to="/app/reports" className={navItemClass} onClick={() => setMobileOpen(false)}>
                <FileText size={15} />
                <span>Reports</span>
              </NavLink>
              <NavLink to="/app/settings" className={navItemClass} onClick={() => setMobileOpen(false)}>
                <Settings size={15} />
                <span>Settings</span>
              </NavLink>

              {user.role === 'admin' && (
                <NavLink
                  to="/admin"
                  className="nav-link"
                  style={{ color: 'var(--accent-orange)', fontWeight: 600 }}
                  onClick={() => setMobileOpen(false)}
                >
                  <Shield size={15} />
                  <span>Admin</span>
                </NavLink>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                <div className="user-menu-pill" title={`@${user.username || ''} (${user.email})`}>
                  <div className="user-avatar">
                    {(user.bio_name || user.full_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {user.bio_name?.split(' ')[0] || user.username || 'User'}
                  </span>
                </div>
                <button
                  className="btn ghost btn-sm"
                  onClick={handleLogout}
                  type="button"
                  title="Sign out"
                  style={{ color: 'var(--text-muted)', padding: '5px' }}
                >
                  <LogOut size={15} />
                </button>
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navItemClass}>
                <LogIn size={15} />
                <span>Sign in</span>
              </NavLink>
              <NavLink to="/register" className="btn btn-sm">
                <UserPlus size={15} />
                <span>Get Started</span>
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
