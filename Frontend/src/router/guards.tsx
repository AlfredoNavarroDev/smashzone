import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { RolNombre } from '../api/types'
import { useAuth } from '../context/useAuth'

/** Exige sesión iniciada; si no, redirige a /login recordando la ruta pedida. */
export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Exige uno de los roles indicados; un Cliente que entra a una ruta Admin vuelve al inicio. */
export function RequireRole({ roles }: { roles: RolNombre[] }) {
  const { hasRole } = useAuth()
  if (!hasRole(...roles)) return <Navigate to="/" replace />
  return <Outlet />
}
