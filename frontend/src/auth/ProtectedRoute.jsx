import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ROLE_HOME, useAuth } from './AuthContext'

/**
 * Guards a group of routes.
 * - Not logged in: go to /login.
 * - Logged in with the wrong role: go to your own home page.
 */
export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">Loading…</div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (role && user.userType !== role) {
    return <Navigate to={ROLE_HOME[user.userType] ?? '/login'} replace />
  }

  return <Outlet />
}

