import { useState, type FormEvent } from 'react'
import * as authApi from '../../api/auth'
import { Badge, Button, Card, Field } from '../../components/ui'
import { useAuth } from '../../context/useAuth'

export default function Perfil() {
  const { usuario, setUsuario } = useAuth()
  const [datos, setDatos] = useState({
    nombre: usuario?.nombre ?? '', apellido: usuario?.apellido ?? '', telefono: usuario?.telefono ?? '',
  })
  const [pwd, setPwd] = useState({ actual: '', nueva: '' })
  const [msgDatos, setMsgDatos] = useState<{ ok: boolean; texto: string } | null>(null)
  const [msgPwd, setMsgPwd] = useState<{ ok: boolean; texto: string } | null>(null)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    try {
      const u = await authApi.actualizarPerfil({ ...datos, telefono: datos.telefono || null })
      setUsuario(u)
      setMsgDatos({ ok: true, texto: 'Perfil actualizado.' })
    } catch (err) {
      setMsgDatos({ ok: false, texto: err instanceof Error ? err.message : 'Error al guardar.' })
    }
  }

  async function cambiarPwd(e: FormEvent) {
    e.preventDefault()
    try {
      await authApi.cambiarPassword(pwd.actual, pwd.nueva)
      setPwd({ actual: '', nueva: '' })
      setMsgPwd({ ok: true, texto: 'Contraseña actualizada.' })
    } catch (err) {
      setMsgPwd({ ok: false, texto: err instanceof Error ? err.message : 'Error al cambiar la contraseña.' })
    }
  }

  return (
    <div className="stack">
      <h1>Mi perfil</h1>
      <Card title="Datos personales">
        <p className="muted">{usuario?.email} · <Badge tone="info">{usuario?.rol}</Badge></p>
        <form onSubmit={guardar} className="form">
          <div className="grid-2">
            <Field label="Nombre"><input value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} required maxLength={100} /></Field>
            <Field label="Apellido"><input value={datos.apellido} onChange={(e) => setDatos({ ...datos, apellido: e.target.value })} required maxLength={100} /></Field>
          </div>
          <Field label="Teléfono"><input value={datos.telefono} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} maxLength={20} /></Field>
          {msgDatos && <p role="status" className={msgDatos.ok ? 'form-ok' : 'form-error'}>{msgDatos.texto}</p>}
          <Button type="submit">Guardar cambios</Button>
        </form>
      </Card>
      <Card title="Cambiar contraseña">
        <form onSubmit={cambiarPwd} className="form">
          <Field label="Contraseña actual"><input type="password" value={pwd.actual} onChange={(e) => setPwd({ ...pwd, actual: e.target.value })} required autoComplete="current-password" /></Field>
          <Field label="Contraseña nueva"><input type="password" value={pwd.nueva} onChange={(e) => setPwd({ ...pwd, nueva: e.target.value })} required minLength={8} autoComplete="new-password" /></Field>
          {msgPwd && <p role="status" className={msgPwd.ok ? 'form-ok' : 'form-error'}>{msgPwd.texto}</p>}
          <Button type="submit">Actualizar contraseña</Button>
        </form>
      </Card>
    </div>
  )
}
