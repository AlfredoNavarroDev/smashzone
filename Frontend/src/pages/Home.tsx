import { Link } from 'react-router-dom'
import { Card } from '../components/ui'
import { useAuth } from '../context/useAuth'

export default function Home() {
  const { usuario, hasRole } = useAuth()
  return (
    <div className="stack">
      <h1>Hola, {usuario?.nombre} 👋</h1>
      <Card>
        <p>Bienvenido a SmashZone. Las reservas y el catálogo se sumarán aquí con los demás bloques.</p>
        <p><Link to="/perfil">Editar mi perfil</Link></p>
        {hasRole('Admin') && <p><Link to="/admin/usuarios">Ir al panel de usuarios</Link></p>}
      </Card>
    </div>
  )
}
