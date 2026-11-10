import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, Field } from '../../components/ui'
import { useAuth } from '../../context/useAuth'

export default function Login() {
  const { login, isAuthenticated, usuario } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  if (isAuthenticated && usuario) return <Navigate to={usuario.rol === 'Admin' ? '/admin/usuarios' : '/'} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const u = await login(email, password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? (u.rol === 'Admin' ? '/admin/usuarios' : '/'), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="auth-page">
      <Card title="Iniciar sesión" className="auth-card">
        <form onSubmit={onSubmit} className="form">
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Contraseña">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </Field>
          {error && <p role="alert" className="form-error">{error}</p>}
          <Button type="submit" disabled={cargando}>{cargando ? 'Ingresando…' : 'Ingresar'}</Button>
        </form>
        <p className="muted">¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
      </Card>
    </div>
  )
}
