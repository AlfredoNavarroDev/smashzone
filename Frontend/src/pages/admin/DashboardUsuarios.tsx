import { useCallback, useEffect, useState } from 'react'
import * as admin from '../../api/admin'
import type { AdminUsuario, FiltroUsuarios, Paginado, Rol, UsuariosResumen } from '../../api/types'
import { Badge, Button, Card, StatCard } from '../../components/ui'
import { useAuth } from '../../context/useAuth'

const REFRESCO_MS = 30_000
const TAMANO = 10

function fecha(iso: string | null) {
  return iso ? new Date(iso.endsWith('Z') ? iso : iso + 'Z').toLocaleString() : '—'
}

function RegistrosChart({ datos }: { datos: UsuariosResumen['registrosPorDia'] }) {
  const max = Math.max(1, ...datos.map((d) => d.cantidad))
  const w = 600, h = 120, bw = w / datos.length
  return (
    <svg viewBox={`0 0 ${w} ${h + 18}`} role="img" aria-label="Registros por día, últimos 30 días" className="chart">
      {datos.map((d, i) => {
        const bh = (d.cantidad / max) * h
        return (
          <rect key={d.fecha} x={i * bw + 2} y={h - bh} width={bw - 4} height={Math.max(bh, d.cantidad ? 2 : 0)} rx="2" className="chart-bar">
            <title>{`${d.fecha}: ${d.cantidad}`}</title>
          </rect>
        )
      })}
      <text x="0" y={h + 14} className="chart-label">{datos[0]?.fecha}</text>
      <text x={w} y={h + 14} textAnchor="end" className="chart-label">{datos[datos.length - 1]?.fecha}</text>
    </svg>
  )
}

export default function DashboardUsuarios() {
  const { usuario: yo } = useAuth()
  const [resumen, setResumen] = useState<UsuariosResumen | null>(null)
  const [roles, setRoles] = useState<Rol[]>([])
  const [lista, setLista] = useState<Paginado<AdminUsuario> | null>(null)
  const [filtro, setFiltro] = useState<FiltroUsuarios>({ pagina: 1, tamanoPagina: TAMANO })
  const [texto, setTexto] = useState('')
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    try {
      const [r, l] = await Promise.all([admin.resumenUsuarios(), admin.listarUsuarios(filtro)])
      setResumen(r)
      setLista(l)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos.')
    }
  }, [filtro])

  useEffect(() => { admin.listarRoles().then(setRoles).catch(() => {}) }, [])
  useEffect(() => {
    // Carga inicial + refresco periódico para que el estado "online" se mantenga al día.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar()
    const id = setInterval(cargar, REFRESCO_MS)
    return () => clearInterval(id)
  }, [cargar])

  // Búsqueda con debounce
  useEffect(() => {
    const id = setTimeout(() => setFiltro((f) => ({ ...f, texto: texto || undefined, pagina: 1 })), 300)
    return () => clearTimeout(id)
  }, [texto])

  const cambiarFiltro = (patch: Partial<FiltroUsuarios>) => setFiltro((f) => ({ ...f, ...patch, pagina: 1 }))

  async function onCambiarRol(u: AdminUsuario, idRol: number) {
    const rol = roles.find((r) => r.id === idRol)
    if (!rol || !confirm(`¿Cambiar el rol de ${u.nombre} ${u.apellido} a ${rol.nombre}?`)) return
    try { await admin.cambiarRol(u.id, idRol); await cargar() } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
  }

  async function onToggleEstado(u: AdminUsuario) {
    const accion = u.activo ? 'deshabilitar' : 'habilitar'
    if (!confirm(`¿Seguro que deseas ${accion} a ${u.nombre} ${u.apellido}?`)) return
    try { await admin.cambiarEstado(u.id, !u.activo); await cargar() } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
  }

  const totalPaginas = lista ? Math.max(1, Math.ceil(lista.total / lista.tamanoPagina)) : 1

  return (
    <div className="stack">
      <h1>Usuarios y roles</h1>
      {error && <p role="alert" className="form-error">{error}</p>}

      <div className="stats">
        <StatCard label="Registrados" value={resumen?.totalRegistrados ?? '…'} />
        <StatCard label="Online ahora" value={resumen?.onlineAhora ?? '…'} tone="good" hint="actividad en los últimos 5 min" />
        <StatCard label="Activos (7 días)" value={resumen?.activos7Dias ?? '…'} />
        <StatCard label="Habilitados" value={resumen?.habilitados ?? '…'} />
        <StatCard label="Deshabilitados" value={resumen?.deshabilitados ?? '…'} tone="warn" />
      </div>

      <div className="grid-2">
        <Card title="Registros por día (30 días)">{resumen && <RegistrosChart datos={resumen.registrosPorDia} />}</Card>
        <Card title="Usuarios por rol">
          <ul className="role-list">
            {resumen?.porRol.map((r) => (
              <li key={r.rol}><span>{r.rol}</span><strong>{r.cantidad}</strong></li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Gestión de usuarios">
        <div className="filters">
          <input type="search" placeholder="Buscar por nombre o email…" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar" />
          <select aria-label="Filtrar por rol" value={filtro.idRol ?? ''} onChange={(e) => cambiarFiltro({ idRol: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">Todos los roles</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
          <select aria-label="Filtrar por estado" value={filtro.activo === undefined ? '' : String(filtro.activo)} onChange={(e) => cambiarFiltro({ activo: e.target.value === '' ? undefined : e.target.value === 'true' })}>
            <option value="">Cualquier estado</option>
            <option value="true">Habilitados</option>
            <option value="false">Deshabilitados</option>
          </select>
          <select aria-label="Filtrar por conexión" value={filtro.online === undefined ? '' : String(filtro.online)} onChange={(e) => cambiarFiltro({ online: e.target.value === '' ? undefined : e.target.value === 'true' })}>
            <option value="">Online y offline</option>
            <option value="true">Solo online</option>
            <option value="false">Solo offline</option>
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Conexión</th><th>Último acceso</th><th>Registro</th><th /></tr>
            </thead>
            <tbody>
              {lista?.items.map((u) => {
                const esYo = u.id === yo?.id
                return (
                  <tr key={u.id}>
                    <td><strong>{u.nombre} {u.apellido}</strong><br /><small className="muted">{u.email}</small></td>
                    <td>
                      <select aria-label={`Rol de ${u.email}`} value={u.idRol} disabled={esYo} onChange={(e) => onCambiarRol(u, Number(e.target.value))}>
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                      </select>
                    </td>
                    <td><Badge tone={u.activo ? 'good' : 'bad'}>{u.activo ? 'Habilitado' : 'Deshabilitado'}</Badge></td>
                    <td><Badge tone={u.online ? 'good' : 'neutral'}>{u.online ? '● Online' : 'Offline'}</Badge></td>
                    <td>{fecha(u.ultimoAcceso)}</td>
                    <td>{fecha(u.fechaRegistro)}</td>
                    <td>
                      <Button variant={u.activo ? 'danger' : 'ghost'} disabled={esYo} onClick={() => onToggleEstado(u)}>
                        {u.activo ? 'Deshabilitar' : 'Habilitar'}
                      </Button>
                    </td>
                  </tr>
                )
              })}
              {lista && lista.items.length === 0 && <tr><td colSpan={7} className="muted">Sin resultados.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="pager">
          <Button variant="ghost" disabled={(filtro.pagina ?? 1) <= 1} onClick={() => setFiltro((f) => ({ ...f, pagina: (f.pagina ?? 1) - 1 }))}>← Anterior</Button>
          <span>Página {filtro.pagina ?? 1} de {totalPaginas} · {lista?.total ?? 0} usuarios</span>
          <Button variant="ghost" disabled={(filtro.pagina ?? 1) >= totalPaginas} onClick={() => setFiltro((f) => ({ ...f, pagina: (f.pagina ?? 1) + 1 }))}>Siguiente →</Button>
        </div>
      </Card>
    </div>
  )
}
