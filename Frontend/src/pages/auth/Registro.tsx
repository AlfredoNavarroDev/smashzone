import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as authApi from '../../api/auth'
import { Button, Card, Field } from '../../components/ui'
import { useAuth } from '../../context/useAuth'

export default function Registro() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', telefono: '', password: '', confirmar: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmar) return setError('Las contraseñas no coinciden.')
    setCargando(true)
    try {
      await authApi.registro({
        nombre: form.nombre, apellido: form.apellido, email: form.email,
        password: form.password, telefono: form.telefono || undefined,
      })
      await login(form.email, form.password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el registro.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="auth-page">
      <Card title="Crear cuenta" className="auth-card">
        <form onSubmit={onSubmit} className="form">
          <div className="grid-2">
            <Field label="Nombre"><input value={form.nombre} onChange={set('nombre')} required maxLength={100} /></Field>
            <Field label="Apellido"><input value={form.apellido} onChange={set('apellido')} required maxLength={100} /></Field>
          </div>
          <Field label="Email"><input type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></Field>
          <Field label="Teléfono (opcional)"><input value={form.telefono} onChange={set('telefono')} maxLength={20} /></Field>
          <Field label="Contraseña">
            <input type="password" value={form.password} onChange={set('password')} required minLength={8} autoComplete="new-password" />
            <small className="muted">Mínimo 8 caracteres, con mayúscula, minúscula y número.</small>
          </Field>
          <Field label="Confirmar contraseña">
            <input type="password" value={form.confirmar} onChange={set('confirmar')} required autoComplete="new-password" />
          </Field>
          {error && <p role="alert" className="form-error">{error}</p>}
          <Button type="submit" disabled={cargando}>{cargando ? 'Creando…' : 'Registrarme'}</Button>
        </form>
        <p className="muted">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
      </Card>
    </div>
  )
}
