import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { Button } from './ui'

/** Shell mínimo (barra superior + contenido). El Bloque 4 puede reemplazarlo por el definitivo. */
export default function Layout() {
  const { usuario, logout, hasRole } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">SmashZone</NavLink>
        <nav>
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/perfil">Mi perfil</NavLink>
          {hasRole('Admin') && <NavLink to="/admin/usuarios">Admin · Usuarios</NavLink>}
        </nav>
        <div className="topbar-user">
          <span>{usuario?.nombre} <small>({usuario?.rol})</small></span>
          <Button variant="ghost" onClick={() => { logout(); navigate('/login') }}>Salir</Button>
        </div>
      </header>
      <main className="content"><Outlet /></main>
    </div>
  )
}
