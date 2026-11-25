import type { CSSProperties } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import './Layout.css'

function NavIcon({ name }: { name: 'profile' | 'dashboard' | 'users' | 'sessions' | 'logout' | 'hammer' }) {
  const paths = {
    profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
    dashboard: <><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5" /></>,
    sessions: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
    hammer: <><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9" /><path d="M17.64 15 22 10.64" /><path d="m20.91 3.26-6.36 6.36" /><path d="m14.54 9.62 1.42-1.41" /><path d="m10.1 13.84 1.41-1.41" /></>,
    logout: <><path d="M10 4H4v16h6M9 12h12m-4-4 4 4-4 4" /></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export default function Layout() {
  const { logout, hasRole, usuario } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Siempre es admin si la ruta es /admin o si el rol es Admin/Staff
  const admin = pathname.startsWith('/admin') || hasRole('Admin') || hasRole('Staff')
  const perfilAdmin = pathname === '/perfil'

  let activeIndex = 0
  if (pathname.startsWith('/admin/usuarios')) activeIndex = 1
  else if (pathname.startsWith('/admin/sesiones')) activeIndex = 2
  else if (pathname === '/admin') activeIndex = 0
  else activeIndex = -1

  return (
    <div className={`shell shell-admin${perfilAdmin ? ' shell-profile' : ''}`}>
      {!perfilAdmin && (
        <header className="topbar">
          {/* LADO IZQUIERDO: LOGO Y VOLVER A 3D */}
          <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NavLink to="/admin" className="brand" aria-label="SmashZone">
              <img className="brand-logo" src="/images/icon/image.png" alt="SmashZone" />
            </NavLink>
            <NavLink
              to="/"
              className="btn-back-3d"
              title="Volver a la experiencia inmersiva del mazo"
            >
              <NavIcon name="hammer" />
              <span>IR A SMASHZONE 3D</span>
            </NavLink>
          </div>

          {/* CENTRO: PESTAÑAS FLOTANTES DE CRISTAL */}
          <nav
            aria-label="Navegación principal"
            className="shell-nav"
            style={
              {
                '--nav-index': Math.max(0, activeIndex),
              } as CSSProperties
            }
          >
            <span
              className="shell-nav-indicator"
              data-visible={activeIndex >= 0}
              data-tab={activeIndex}
              aria-hidden="true"
            />
            <NavLink to="/admin" end>
              <NavIcon name="dashboard" />
              <span>Panel admin</span>
            </NavLink>
            <NavLink to="/admin/usuarios">
              <NavIcon name="users" />
              <span>Usuarios</span>
            </NavLink>
            <NavLink to="/admin/sesiones">
              <NavIcon name="sessions" />
              <span>Bóvedas</span>
            </NavLink>
          </nav>

          {/* LADO DERECHO: PERFIL Y SALIR */}
          <div className="topbar-user">
            <NavLink to="/perfil" className="shell-account" title="Ver mi perfil">
              <div className="shell-avatar">
                <img src="/images/perfil/admin-warm.png" alt="Avatar" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <strong>{usuario?.nombre || 'Alexis'}</strong>
                <small>{usuario?.rol || 'Admin'}</small>
              </div>
            </NavLink>
            <button
              className="shell-logout"
              type="button"
              title="Cerrar sesión"
              onClick={() => {
                logout()
                navigate('/')
              }}
            >
              <NavIcon name="logout" />
              <span>Salir</span>
            </button>
          </div>
        </header>
      )}
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
