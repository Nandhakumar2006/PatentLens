import { Navigate, Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../hooks/AuthContext'

export default function AppLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Loading session…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="layout">
      <Navbar />
      <main>
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
