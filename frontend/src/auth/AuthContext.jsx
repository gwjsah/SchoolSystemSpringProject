import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { tokenStorage } from '../api/client'

const AuthContext = createContext(null)

/** Where each role lands after logging in. */
export const ROLE_HOME = {
  STUDENT: '/student',
  FACULTY: '/faculty',
  ADMIN: '/admin',
}

/**
 * Holds the logged-in user for the whole app.
 * On first load, if a token is saved, it asks the backend (GET /auth/me) who it belongs to.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(tokenStorage.get()))

  useEffect(() => {
    if (!tokenStorage.get()) return
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => tokenStorage.clear())
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    tokenStorage.set(res.data.token)
    setUser(res.data.user)
    return res.data.user
  }, [])

  const logout = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

