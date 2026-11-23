import type { CSSProperties } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import './Layout.css'

function NavIcon({ name }: { name: 'profile' | 'dashboard' | 'users' | 'logout' }) {
  const paths = {
    profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
    dashboard: <><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5" /></>,
    logout: <><path d="M10 4H4v16h6M9 12h12m-4-4 4 4-4 4" /></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export default function Layout() {
  const { logout, hasRole } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const admin = hasRole('Admin')
  const perfilAdmin = admin && pathname === '/perfil'
  const activeIndex = pathname.startsWith('/admin/usuarios') ? 1 : pathname === '/admin' ? 0 : -1

  return (
    <div className={`shell${admin ? ' shell-admin' : ' shell-client'}${perfilAdmin ? ' shell-profile' : ''}`}>
      {!perfilAdmin && <header className="topbar">
        <NavLink to={admin ? '/admin' : '/perfil'} className="brand" aria-label="SmashZone">
          <img className="brand-logo" src="/images/icon/image.png" alt="" />
        </NavLink>
        <nav aria-label="Navegación principal" className="shell-nav" style={{ '--nav-index': Math.max(0, activeIndex) } as CSSProperties}>
          {admin && <span className="shell-nav-indicator" data-visible={activeIndex >= 0} data-side={activeIndex === 1 ? 'right' : 'left'} aria-hidden="true" />}
          {!admin && <NavLink to="/perfil"><NavIcon name="profile" /><span>Mi perfil</span></NavLink>}
          {admin && <NavLink to="/admin" end><NavIcon name="dashboard" /><span>Panel admin</span></NavLink>}
          {admin && <NavLink to="/admin/usuarios"><NavIcon name="users" /><span>Usuarios</span></NavLink>}
        </nav>
        <div className="topbar-user">
          <button className="shell-logout" type="button" onClick={() => { logout(); navigate('/login') }}><NavIcon name="logout" /><span>Salir</span></button>
        </div>
      </header>}
      <main className="content"><Outlet /></main>
    </div>
  )
}
