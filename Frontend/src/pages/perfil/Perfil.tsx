import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import ShardIconLink from '../../components/ui/ShardIconLink'
import * as authApi from '../../api/auth'
import { useAuth } from '../../context/useAuth'
import CRTWarp from '../../components/ui/CRTWarp'
import './Perfil.css'

function PerfilSurface({ avatar, mobile = false }: { avatar: 'admin' | 'client'; mobile?: boolean }) {
  const id = useId().replace(/:/g, '')
  const width = mobile ? 490 : 1150
  const height = mobile ? 720 : 610
  const portrait = { x: mobile ? 137 : 92, y: mobile ? 35 : 42, width: mobile ? 216 : 416, height: mobile ? 270 : 520 }
  const vidrio = `/images/glass/panel-${mobile ? 'tall' : 'wide'}-v2.png`
  const avatarImage = `/images/perfil/${avatar === 'admin' ? 'admin-warm' : 'client-warm'}.png`
  // Iguala los tonos carbón con la pieza de Reservas conservando los blancos del bisel.
  const glassGamma = mobile ? 0.72 : 0.84
  return <svg className={`perfil-surface${mobile ? ' perfil-surface-mobile' : ''}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <filter id={`${id}-glass`} colorInterpolationFilters="sRGB">
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer result="glassTexture">
          <feFuncR type="gamma" exponent={glassGamma} />
          <feFuncG type="gamma" exponent={glassGamma} />
          <feFuncB type="gamma" exponent={glassGamma} />
        </feComponentTransfer>
        {/* El degradado sigue la silueta alfa y conserva la textura del bisel. */}
        <feMorphology in="SourceAlpha" operator="erode" radius="2" />
        <feGaussianBlur stdDeviation="2" result="edgeFade" />
        <feComposite in="glassTexture" in2="edgeFade" operator="in" />
      </filter>
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height} style={{ maskType: 'alpha' }}><image href={vidrio} width={width} height={height} preserveAspectRatio="none" /></mask>
      <filter id={`${id}-inset`} x="-5%" y="-5%" width="110%" height="110%">
        <feMorphology in="SourceAlpha" operator="erode" radius={mobile ? '10' : '16'} />
        <feGaussianBlur stdDeviation="3" />
      </filter>
      <mask id={`${id}-interior`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height} style={{ maskType: 'alpha' }}><image href={vidrio} width={width} height={height} preserveAspectRatio="none" filter={`url(#${id}-inset)`} /></mask>
      <linearGradient id={`${id}-ambient`} x2={mobile ? '0' : '1'} y2={mobile ? '1' : '0'}><stop offset="0" stopColor="white" /><stop offset=".24" stopColor="white" /><stop offset=".65" stopColor="black" /></linearGradient>
      <mask id={`${id}-ambient-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height} style={{ maskType: 'luminance' }}><rect width={width} height={height} fill={`url(#${id}-ambient)`} /></mask>
      <linearGradient id={`${id}-horizontal`}><stop offset="0" stopColor="black" /><stop offset=".2" stopColor="white" /><stop offset=".75" stopColor="white" /><stop offset="1" stopColor="black" /></linearGradient>
      <linearGradient id={`${id}-vertical`} x2="0" y2="1"><stop offset="0" stopColor="black" /><stop offset=".12" stopColor="white" /><stop offset=".8" stopColor="white" /><stop offset="1" stopColor="black" /></linearGradient>
      <mask id={`${id}-fade-y`} maskUnits="userSpaceOnUse" {...portrait} style={{ maskType: 'luminance' }}><rect {...portrait} fill={`url(#${id}-vertical)`} /></mask>
      <mask id={`${id}-fade`} maskUnits="userSpaceOnUse" {...portrait} style={{ maskType: 'luminance' }}><rect {...portrait} fill={`url(#${id}-horizontal)`} mask={`url(#${id}-fade-y)`} /></mask>
      <filter id={`${id}-black`} colorInterpolationFilters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="1.15" intercept="-.015" /><feFuncG type="linear" slope="1.15" intercept="-.015" /><feFuncB type="linear" slope="1.15" intercept="-.015" /></feComponentTransfer></filter>
    </defs>
    <image href={vidrio} width={width} height={height} preserveAspectRatio="none" opacity={0.98} filter={`url(#${id}-glass)`} />
    <rect width={width} height={height} fill="#000" opacity=".52" mask={`url(#${id}-interior)`} />
    <g mask={`url(#${id})`}>
      <g mask={`url(#${id}-ambient-mask)`} style={{ mixBlendMode: 'screen' }} opacity=".08"><image href="/images/ingresos-luz.png" width={width} height={height} preserveAspectRatio="xMinYMin slice" /></g>
      <g opacity=".9"><g mask={`url(#${id}-fade)`}><image href={avatarImage} {...portrait} preserveAspectRatio="xMidYMin meet" filter={`url(#${id}-black)`} /></g></g>
    </g>
  </svg>
}

export default function Perfil() {
  const { usuario, setUsuario, logout } = useAuth()
  const navigate = useNavigate()
  const [datos, setDatos] = useState({ nombre: usuario?.nombre ?? '', apellido: usuario?.apellido ?? '', telefono: usuario?.telefono ?? '' })
  const [pwd, setPwd] = useState({ actual: '', nueva: '' })
  const [vista, setVista] = useState<'datos' | 'editar' | 'clave'>('datos')
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const nombreCompleto = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ') || 'Mi cuenta'
  const esAdmin = usuario?.rol?.toLowerCase() === 'admin'

  function cambiarVista(siguiente: 'datos' | 'editar' | 'clave') {
    if (siguiente === 'editar') setDatos({ nombre: usuario?.nombre ?? '', apellido: usuario?.apellido ?? '', telefono: usuario?.telefono ?? '' })
    if (siguiente !== 'clave') setPwd({ actual: '', nueva: '' })
    setMensaje(null)
    setVista(siguiente)
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)
    try {
      const u = await authApi.actualizarPerfil({ ...datos, telefono: datos.telefono || null })
      setUsuario(u)
      setDatos({ nombre: u.nombre, apellido: u.apellido, telefono: u.telefono ?? '' })
      setVista('datos')
      setMensaje({ ok: true, texto: 'Tus datos se actualizaron correctamente.' })
    } catch (err) {
      setMensaje({ ok: false, texto: err instanceof Error ? err.message : 'Error al guardar.' })
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarPwd(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)
    try {
      await authApi.cambiarPassword(pwd.actual, pwd.nueva)
      setPwd({ actual: '', nueva: '' })
      setVista('datos')
      setMensaje({ ok: true, texto: 'Tu contraseña se actualizó correctamente.' })
    } catch (err) {
      setMensaje({ ok: false, texto: err instanceof Error ? err.message : 'Error al cambiar la contraseña.' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="perfil-page" aria-labelledby="perfil-titulo">
      <div className="perfil-background" aria-hidden="true">
        <CRTWarp
          color="#ff681f"
          backgroundColor="#080808"
          speed={0.22}
          brightness={0.65}
          bloom={0.85}
          vignette={0.4}
          flicker={0}
          noise={0.035}
          interference={0.06}
          rgbShift={0}
          mouseStrength={0.18}
          changeOnClick={false}
          dpr={1.5}
          fps={30}
        />
      </div>
      <div className="perfil-shell">
      <nav className="perfil-navigation" aria-label={esAdmin ? 'Regresar' : 'Sesión'}>
        {esAdmin ? <ShardIconLink className="perfil-back" to="/admin" label="Volver al panel" direction="left"><PerfilSurface avatar="admin" /><PerfilSurface avatar="admin" mobile /></ShardIconLink> :
          <button className="shard-icon-link perfil-back" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={() => { logout(); navigate('/login', { replace: true }) }}>
            <PerfilSurface avatar="client" /><PerfilSurface avatar="client" mobile />
            <span className="shard-icon-wash" aria-hidden="true" />
            <svg className="shard-icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4H4v16h6M9 12h12m-4-4 4 4-4 4" /></svg>
          </button>}
      </nav>
      <div className="perfil-shard">
        <PerfilSurface avatar={esAdmin ? 'admin' : 'client'} />
        <PerfilSurface avatar={esAdmin ? 'admin' : 'client'} mobile />
        <div className={`perfil-photo${esAdmin ? ' perfil-photo-admin' : ''}`}>
          <div className="perfil-photo-caption">
            <img className="perfil-photo-logo" src="/images/icon/image.png" alt="SmashZone" />
            <span>{esAdmin ? 'Administrador' : usuario?.rol || 'Usuario'}</span>
          </div>
        </div>

        <div className="perfil-panel">
          <div className="perfil-identity">
            <div className="perfil-identity-line"><h1 id="perfil-titulo">{vista === 'datos' ? nombreCompleto : vista === 'editar' ? 'Editar perfil' : 'Contraseña'}</h1>{vista === 'datos' && <button type="button" className="perfil-edit" onClick={() => cambiarVista('editar')} aria-label="Editar mis datos"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z" /></svg><span>Editar</span></button>}</div>
          </div>
          {mensaje && <p role="status" className={`perfil-message ${mensaje.ok ? 'perfil-message-ok' : 'perfil-message-error'}`}>{mensaje.texto}</p>}

          {vista === 'datos' && <div className="perfil-view">
            <dl className="perfil-contact">
              <div><dt><span aria-hidden="true">@</span> Correo</dt><dd>{usuario?.email || '—'}</dd></div>
              <div><dt><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M10 18h4" /></svg> Teléfono</dt><dd>{usuario?.telefono || 'Sin registrar'}</dd></div>
            </dl>
            <button className="perfil-security" type="button" onClick={() => cambiarVista('clave')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg><span><strong>Contraseña</strong><small>Cambiar clave de acceso</small></span><span className="perfil-security-arrow" aria-hidden="true">↗</span></button>
          </div>}

          {vista === 'editar' && <form className="perfil-form" onSubmit={guardar}>
            <div className="perfil-fields">
              <label>Nombre<input value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} required maxLength={100} autoComplete="given-name" /></label>
              <label>Apellido<input value={datos.apellido} onChange={(e) => setDatos({ ...datos, apellido: e.target.value })} required maxLength={100} autoComplete="family-name" /></label>
              <label className="perfil-field-wide">Teléfono<input value={datos.telefono} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} maxLength={20} autoComplete="tel" placeholder="Sin registrar" /></label>
            </div>
            <div className="perfil-actions"><button className="perfil-action-primary" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'} <span aria-hidden="true">↗</span></button><button className="perfil-action-secondary" type="button" onClick={() => cambiarVista('datos')}>Cancelar</button></div>
          </form>}

          {vista === 'clave' && <form className="perfil-form" onSubmit={cambiarPwd}>
            <p className="perfil-form-hint">Usa una contraseña nueva de al menos 8 caracteres.</p>
            <div className="perfil-fields perfil-fields-password">
              <label>Contraseña actual<input type="password" value={pwd.actual} onChange={(e) => setPwd({ ...pwd, actual: e.target.value })} required autoComplete="current-password" /></label>
              <label>Contraseña nueva<input type="password" value={pwd.nueva} onChange={(e) => setPwd({ ...pwd, nueva: e.target.value })} required minLength={8} autoComplete="new-password" /></label>
            </div>
            <div className="perfil-actions"><button className="perfil-action-primary" type="submit" disabled={guardando}>{guardando ? 'Actualizando…' : 'Actualizar contraseña'} <span aria-hidden="true">↗</span></button><button className="perfil-action-secondary" type="button" onClick={() => cambiarVista('datos')}>Cancelar</button></div>
          </form>}
        </div>
      </div>
      </div>
    </section>
  )
}
