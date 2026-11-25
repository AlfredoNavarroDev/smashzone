import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import './Login.css'
import HammerTear from '../../components/ui/HammerTear'

export default function Login() {
  const { login, isAuthenticated, usuario } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  if (isAuthenticated && usuario) return <Navigate to={usuario.rol === 'Admin' ? '/admin' : '/perfil'} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const u = await login(email, password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? (u.rol === 'Admin' ? '/admin' : '/perfil'), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-scene">
      <HammerTear />
      <header className="login-brand">
        <img src="/images/icon/image.png" alt="SmashZone" />
      </header>
      <main className="login-content">
        <div className="login-panel">
          <h1>Iniciar sesión</h1>
          <form onSubmit={onSubmit} className="login-form">
            <label className="login-field">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="tu@correo.com" />
            </label>
            <label className="login-field">
              <span>Contraseña</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Tu contraseña" />
            </label>
            {error && <p role="alert" className="login-error">{error}</p>}
            <button className="login-submit" type="submit" disabled={cargando}><span>{cargando ? 'Ingresando…' : 'Ingresar'}</span></button>
          </form>
        </div>
      </main>
    </div>
  )
}
