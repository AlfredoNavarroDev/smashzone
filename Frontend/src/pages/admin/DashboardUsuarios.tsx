import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import * as admin from '../../api/admin'
import type { AdminUsuario, FiltroUsuarios, Paginado, Rol, UsuariosResumen } from '../../api/types'
import { Badge, Button, Card } from '../../components/ui'
import './DashboardUsuarios.css'
import UsersGlass from './UsersGlass'
import GlassMosaic from '../../components/ui/glass-mosaic'
import { useAuth } from '../../context/useAuth'

const REFRESCO_MS = 30_000
const TAMANO = 10

function FilterDropdown({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const items = useRef<(HTMLButtonElement | null)[]>([])
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  const selected = Math.max(0, options.findIndex(option => option.value === value))
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); root.current?.querySelector<HTMLButtonElement>('.usuarios-select')?.focus() }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) { setOpen(true); requestAnimationFrame(() => items.current[selected]?.focus()) }
      else { const index = items.current.findIndex(item => item === document.activeElement); items.current[(index + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length]?.focus() }
    }
  }
  return <div className="usuarios-filter-field" ref={root} onKeyDown={onKeyDown}>
    <span>{label}</span>
    <button type="button" className="usuarios-select" aria-label={`Filtrar por ${label.toLowerCase()}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>{options[selected].label}<span className="usuarios-select-chevron" aria-hidden="true" /></button>
    {open && <div className="usuarios-select-menu" role="listbox" aria-label={label}>
      {options.map((option, index) => <button key={option.value} ref={el => { items.current[index] = el }} type="button" role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); setOpen(false); root.current?.querySelector<HTMLButtonElement>('.usuarios-select')?.focus() }}>{option.label}</button>)}
    </div>}
  </div>
}

function RoleDropdown({ user, roles, disabled, onChange }: { user: AdminUsuario; roles: Rol[]; disabled: boolean; onChange: (id: number) => void }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const selected = roles.findIndex(role => role.id === user.idRol)
  const measure = () => {
    const rect = trigger.current?.getBoundingClientRect()
    if (!rect) return
    const menuHeight = roles.length * 40 + 10
    setPosition({ top: rect.bottom + menuHeight + 6 > window.innerHeight ? rect.top - menuHeight - 6 : rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 116) })
  }
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false) }
    const onScroll = () => setOpen(false)
    document.addEventListener('pointerdown', close)
    window.addEventListener('scroll', onScroll, true)
    return () => { document.removeEventListener('pointerdown', close); window.removeEventListener('scroll', onScroll, true) }
  }, [open])
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); trigger.current?.focus() }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) { measure(); setOpen(true); requestAnimationFrame(() => items.current[Math.max(selected, 0)]?.focus()) }
      else { const index = items.current.findIndex(item => item === document.activeElement); items.current[(index + (event.key === 'ArrowDown' ? 1 : roles.length - 1)) % roles.length]?.focus() }
    }
  }
  return <div className="usuarios-role-select" onKeyDown={onKeyDown}>
    <button ref={trigger} type="button" className="usuarios-select" aria-label={`Rol de ${user.email}`} aria-haspopup="listbox" aria-expanded={open} disabled={disabled || roles.length === 0} onClick={() => { if (!open) measure(); setOpen(!open) }}>{user.rol}<span className="usuarios-select-chevron" aria-hidden="true" /></button>
    {open && createPortal(<div ref={menu} className="usuarios-select-menu usuarios-role-menu" role="listbox" aria-label={`Rol de ${user.email}`} style={position}>
      {roles.map((role, index) => <button key={role.id} ref={el => { items.current[index] = el }} type="button" role="option" aria-selected={role.id === user.idRol} onClick={() => { setOpen(false); trigger.current?.focus(); if (role.id !== user.idRol) onChange(role.id) }}>{role.nombre}</button>)}
    </div>, document.body)}
  </div>
}

function fecha(iso: string | null) {
  return iso ? new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(iso) ? iso : iso + 'Z').toLocaleString() : '—'
}

function RegistrosChart({ datos }: { datos: UsuariosResumen['registrosPorDia'] }) {
  const max = Math.max(1, ...datos.map((d) => d.cantidad))
  const dia = (valor?: string) => valor ? new Date(`${valor}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) : ''
  return (
    <div className="usuarios-registration-plot" aria-label="Registros diarios de los últimos 30 días">
      <div className="usuarios-plot-scale"><span>{max} registros</span><span>Por día</span></div>
      <div className="usuarios-plot-bars">
        {datos.map(d => <div key={d.fecha} className="usuarios-plot-day" tabIndex={0} aria-label={`${dia(d.fecha)}: ${d.cantidad} registros`}>
          <span className="usuarios-plot-bar" style={{ height: `${d.cantidad / max * 100}%` }} />
          <span className="usuarios-plot-tip">{dia(d.fecha)}<strong>{d.cantidad} {d.cantidad === 1 ? 'registro' : 'registros'}</strong></span>
        </div>)}
      </div>
      <div className="usuarios-plot-dates"><span>{dia(datos[0]?.fecha)}</span><span>{dia(datos[Math.floor(datos.length / 2)]?.fecha)}</span><span>{dia(datos[datos.length - 1]?.fecha)}</span></div>
    </div>
  )
}

export default function DashboardUsuarios() {
  const { usuario: yo } = useAuth()
  const [resumen, setResumen] = useState<UsuariosResumen | null>(null)
  const [roles, setRoles] = useState<Rol[]>([])
  const [lista, setLista] = useState<Paginado<AdminUsuario> | null>(null)
  const [filtro, setFiltro] = useState<FiltroUsuarios>({ pagina: 1, tamanoPagina: TAMANO })
  const [texto, setTexto] = useState('')
  const [actualizando, setActualizando] = useState(false)
  const [pendiente, setPendiente] = useState<string | null>(null)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setActualizando(true)
    try {
      const [r, l] = await Promise.all([admin.resumenUsuarios(), admin.listarUsuarios(filtro)])
      setResumen(r)
      setLista(l)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos.')
    } finally { setActualizando(false) }
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
    setPendiente(u.id)
    try { await admin.cambiarRol(u.id, idRol); await cargar() } catch (e) { setError(e instanceof Error ? e.message : 'Error') } finally { setPendiente(null) }
  }

  async function onToggleEstado(u: AdminUsuario) {
    const accion = u.activo ? 'deshabilitar' : 'habilitar'
    if (!confirm(`¿Seguro que deseas ${accion} a ${u.nombre} ${u.apellido}?`)) return
    setPendiente(u.id)
    try { await admin.cambiarEstado(u.id, !u.activo); await cargar() } catch (e) { setError(e instanceof Error ? e.message : 'Error') } finally { setPendiente(null) }
  }

  const limpiar = () => { setTexto(''); setFiltro({ pagina: 1, tamanoPagina: TAMANO }) }
  const hayFiltros = !!texto || filtro.idRol !== undefined || filtro.activo !== undefined || filtro.online !== undefined
  const totalPaginas = lista ? Math.max(1, Math.ceil(lista.total / lista.tamanoPagina)) : 1

  return (
    <div className="usuarios-page">
      {error && <p role="alert" className="form-error">{error}</p>}

      <GlassMosaic className="usuarios-mosaic">
      <div className="usuarios-stats">
        <button className="usuarios-stat" onClick={limpiar} aria-pressed={!hayFiltros}><UsersGlass region="total" /><span>CUENTAS</span><strong>{resumen?.totalRegistrados ?? '…'}</strong><small>Ver todas <i>↗</i></small></button>
        <button className="usuarios-stat" onClick={() => cambiarFiltro({ online: filtro.online === true ? undefined : true })} aria-pressed={filtro.online === true}><UsersGlass region="recent" /><span>ACTIVIDAD RECIENTE</span><strong>{resumen?.onlineAhora ?? '…'}</strong><small>Últimos 5 min <i>↗</i></small></button>
        <button className="usuarios-stat" onClick={() => cambiarFiltro({ activo: filtro.activo === true ? undefined : true })} aria-pressed={filtro.activo === true}><UsersGlass region="enabled" /><span>HABILITADOS</span><strong>{resumen?.habilitados ?? '…'}</strong><small>Pueden ingresar <i>↗</i></small></button>
        <button className="usuarios-stat" onClick={() => cambiarFiltro({ activo: filtro.activo === false ? undefined : false })} aria-pressed={filtro.activo === false}><UsersGlass region="disabled" /><span>DESHABILITADOS</span><strong>{resumen?.deshabilitados ?? '…'}</strong><small>Revisar cuentas <i>↗</i></small></button>
      </div>

      <section className="usuarios-tools">
        <UsersGlass region="filters" />
        <div className="usuarios-directory-heading usuarios-tools-heading">
          <div><span className="usuarios-eyebrow">DIRECTORIO</span><h2>Buscar y filtrar</h2></div>
          <Button variant="ghost" onClick={() => void cargar()} disabled={actualizando}>{actualizando ? 'Actualizando…' : 'Actualizar ↻'}</Button>
        </div>
        <div className="usuarios-search-row"><input type="search" placeholder="Buscar nombre o correo" value={texto} onChange={e => setTexto(e.target.value)} aria-label="Buscar usuarios" />
        <div className="usuarios-role-filters" aria-label="Filtrar por rol">
          <button aria-pressed={filtro.idRol === undefined} onClick={() => cambiarFiltro({ idRol: undefined })}>Todos <span>{resumen?.totalRegistrados ?? '…'}</span></button>
          {roles.map(r => <button key={r.id} aria-pressed={filtro.idRol === r.id} onClick={() => cambiarFiltro({ idRol: r.id })}>{r.nombre}<span>{resumen?.porRol.find(item => item.rol === r.nombre)?.cantidad ?? '…'}</span></button>)}
        </div>
        </div>
        <div className="filters">
          <FilterDropdown label="Acceso" value={filtro.activo === undefined ? '' : String(filtro.activo)} onChange={value => cambiarFiltro({ activo: value === '' ? undefined : value === 'true' })} options={[{ value: '', label: 'Cualquier estado' }, { value: 'true', label: 'Habilitados' }, { value: 'false', label: 'Deshabilitados' }]} />
          <FilterDropdown label="Actividad" value={filtro.online === undefined ? '' : String(filtro.online)} onChange={value => cambiarFiltro({ online: value === '' ? undefined : value === 'true' })} options={[{ value: '', label: 'Toda la actividad' }, { value: 'true', label: 'Actividad en últimos 5 min' }, { value: 'false', label: 'Sin actividad reciente' }]} />
          {hayFiltros && <button className="usuarios-clear" onClick={limpiar}>Limpiar filtros ×</button>}
        </div>

      </section>
      <Card className="usuarios-directory">
        <UsersGlass region="directory" />
        <div className="usuarios-directory-heading"><div><span className="usuarios-eyebrow">ACCESOS</span><h2>Directorio de usuarios</h2></div><span className="usuarios-count">{lista?.total ?? '…'} resultados</span></div>
        <div className="table-wrap" aria-busy={actualizando}>
          <table>
            <thead>
              <tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Actividad</th><th>Último acceso</th><th>Registro</th><th>Acceso</th></tr>
            </thead>
            <tbody>
              {lista?.items.map((u) => {
                const esYo = u.id === yo?.id
                return (
                  <tr key={u.id}>
                    <td><div className="usuarios-person"><span className="usuarios-avatar" aria-hidden="true">{u.nombre.slice(0, 1)}{u.apellido.slice(0, 1)}</span><div><strong>{u.nombre} {u.apellido}</strong>{esYo && <span className="usuarios-self">Tú</span>}<small>{u.email}</small></div></div></td>
                    <td>
                      <RoleDropdown user={u} roles={roles} disabled={esYo || pendiente === u.id} onChange={id => onCambiarRol(u, id)} />
                    </td>
                    <td><Badge tone={u.activo ? 'good' : 'bad'}>{u.activo ? 'Habilitado' : 'Deshabilitado'}</Badge></td>
                    <td><Badge tone={u.online ? 'good' : 'neutral'}>{u.online ? '● Reciente' : 'Sin actividad'}</Badge></td>
                    <td><span className="usuarios-date">{fecha(u.ultimoAcceso)}</span></td>
                    <td><span className="usuarios-date">{fecha(u.fechaRegistro)}</span></td>
                    <td>
                      <Button variant={u.activo ? 'danger' : 'ghost'} disabled={esYo || pendiente === u.id} onClick={() => onToggleEstado(u)}>
                        {pendiente === u.id ? 'Guardando…' : u.activo ? 'Deshabilitar' : 'Habilitar'}
                      </Button>
                    </td>
                  </tr>
                )
              })}
              {!lista && <tr><td colSpan={7} className="usuarios-empty">{error ? 'No se pudo cargar el directorio. Intenta actualizar.' : 'Cargando usuarios…'}</td></tr>}
              {lista && lista.items.length === 0 && <tr><td colSpan={7} className="usuarios-empty">No hay usuarios que coincidan con estos filtros.{hayFiltros && <button onClick={limpiar}>Mostrar todos</button>}</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="pager">
          <Button variant="ghost" disabled={(filtro.pagina ?? 1) <= 1} onClick={() => setFiltro((f) => ({ ...f, pagina: (f.pagina ?? 1) - 1 }))}>← Anterior</Button>
          <span>Página {filtro.pagina ?? 1} de {totalPaginas} · {lista?.total ?? 0} usuarios</span>
          <Button variant="ghost" disabled={(filtro.pagina ?? 1) >= totalPaginas} onClick={() => setFiltro((f) => ({ ...f, pagina: (f.pagina ?? 1) + 1 }))}>Siguiente →</Button>
        </div>
      </Card>
      <Card className="usuarios-activity">
        <div className="usuarios-activity-summary"><UsersGlass region="activity-summary" /><span className="usuarios-eyebrow">ÚLTIMOS 30 DÍAS</span><h2>Nuevas cuentas</h2><strong>{resumen ? resumen.registrosPorDia.reduce((n, d) => n + d.cantidad, 0) : '…'}</strong><p>{resumen?.activos7Dias ?? '…'} {resumen?.activos7Dias === 1 ? 'cuenta activa' : 'cuentas activas'} en los últimos 7 días</p></div>
        <div className="usuarios-activity-chart"><UsersGlass region="activity-chart" />{resumen ? <RegistrosChart datos={resumen.registrosPorDia} /> : <p>Cargando registros…</p>}</div>
      </Card>
      </GlassMosaic>
    </div>
  )
}
