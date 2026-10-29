import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const token = localStorage.getItem('patentlens_token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const me = await authApi.me()
      setUser(me)
    } catch {
      localStorage.removeItem('patentlens_token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function login(payload, mode = 'login') {
    const data = mode === 'register' ? await authApi.register(payload) : await authApi.login(payload)
    localStorage.setItem('patentlens_token', data.access_token)
    await refresh()
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      /* token discard is enough for stateless JWT */
    }
    localStorage.removeItem('patentlens_token')
    setUser(null)
  }

  const value = useMemo(() => ({ user, loading, login, logout, refresh }), [user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
