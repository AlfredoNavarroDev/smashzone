import { useCallback, useEffect, useId, useRef, useState } from 'react'
import ShardIconLink from '../../components/ui/ShardIconLink'
import { createPortal } from 'react-dom'
import * as reportes from '../../api/reportes'
import type { HoraPico, IngresoMes, PaqueteDemanda } from '../../api/types'
import { Button } from '../../components/ui'
import './DashboardNegocio.css'
import GlassPanelSurface from '../../components/ui/glass-panel-surface'
import GlassMosaic from '../../components/ui/glass-mosaic'

const REFRESCO_MS = 30_000
const moneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })
const mesCorto = new Intl.DateTimeFormat('es-PE', { month: 'short', timeZone: 'UTC' })
const reservasTexto = (cantidad: number) => `${cantidad} ${cantidad === 1 ? 'reserva' : 'reservas'}`

type DatosReportes = {
  ingresos: IngresoMes[]
  paquetes: PaqueteDemanda[]
  horas: HoraPico[]
}

function ultimosMeses(ingresos: IngresoMes[], periodo: number) {
  const hoy = new Date()
  return Array.from({ length: periodo }, (_, i) => {
    const fecha = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - periodo + 1 + i, 1))
    const anio = fecha.getUTCFullYear()
    const mes = fecha.getUTCMonth() + 1
    return {
      clave: `${anio}-${String(mes).padStart(2, '0')}`,
      etiqueta: mesCorto.format(fecha).replace('.', ''),
      total: ingresos.find((dato) => dato.anio === anio && dato.mes === mes)?.totalIngresos ?? 0,
    }
  })
}

function IngresosChart({ ingresos, periodo, vista, onPeriodoChange, onVistaChange }: {
  ingresos: IngresoMes[]
  periodo: number
  vista: 'curva' | 'barras'
  onPeriodoChange: (periodo: number) => void
  onVistaChange: (vista: 'curva' | 'barras') => void
}) {
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [mostrarImportes, setMostrarImportes] = useState(false)
  const importesTriggerRef = useRef<HTMLButtonElement>(null)
  const importesPanelRef = useRef<HTMLDialogElement>(null)
  const importesId = useId()

  useEffect(() => {
    const dialog = importesPanelRef.current
    if (!dialog) return
    if (mostrarImportes && !dialog.open) dialog.showModal()
    if (!mostrarImportes && dialog.open) dialog.close()
  }, [mostrarImportes])
  const meses = ultimosMeses(ingresos, periodo)
  const total = meses.reduce((suma, mes) => suma + mes.total, 0)
  const maximo = Math.max(1, ...meses.map((mes) => mes.total))
  const puntos = meses.map((mes, i) => ({ ...mes, x: 20 + i * 560 / (meses.length - 1), y: 205 - mes.total / maximo * 165 }))
  const linea = puntos.map((p, i) => {
    if (!i) return `M ${p.x} ${p.y}`
    const anterior = puntos[i - 1]
    const centro = (anterior.x + p.x) / 2
    return `C ${centro} ${anterior.y}, ${centro} ${p.y}, ${p.x} ${p.y}`
  }).join(' ')
  const actual = puntos.find((p) => p.clave === seleccion)
  const ultimo = meses[meses.length - 1].total
  const anterior = meses[meses.length - 2].total
  const diferencia = ultimo - anterior
  return (
    <div className="metric-contenido">

      <div className="metric-cuerpo">
        <div className="metric-principal">
          <strong>{moneda.format(total)}</strong>
          <div className="metric-resumen">
            <p className="metric-cambio"><b>{diferencia > 0 ? '+' : diferencia < 0 ? '−' : ''}{moneda.format(Math.abs(diferencia))}</b><span>frente al mes anterior</span></p>
            <dl>
              <div><dt>Máximo</dt><dd>{moneda.format(Math.max(...meses.map((mes) => mes.total)))}</dd></div>
              <div><dt>Mínimo</dt><dd>{moneda.format(Math.min(...meses.map((mes) => mes.total)))}</dd></div>
              <div><dt>Promedio</dt><dd>{moneda.format(total / meses.length)}</dd></div>
            </dl>
            <div className="metric-importes"><button ref={importesTriggerRef} type="button" className="metric-importes-trigger" aria-expanded={mostrarImportes} aria-controls={importesId} onClick={() => setMostrarImportes((abierto) => !abierto)}>Ver importes por mes</button></div>
          </div>
        </div>
        <div className="metric-grafico">
          <div className="negocio-chart-controls">
            <div className="negocio-periodos" data-selected={periodo === 6 ? 'first' : 'second'} role="group" aria-label="Periodo de ingresos">{[6, 12].map((n) => <button key={n} type="button" aria-pressed={periodo === n} onClick={() => onPeriodoChange(n)}>{n} meses</button>)}</div>
            <div className="metric-vistas" data-selected={vista === 'curva' ? 'first' : 'second'} role="group" aria-label="Estilo del gráfico"><button type="button" aria-pressed={vista === 'curva'} onClick={() => onVistaChange('curva')}>Curva</button><button type="button" aria-pressed={vista === 'barras'} onClick={() => onVistaChange('barras')}>Barras</button></div>
          </div>
          <div className="metric-plot">
          <svg viewBox="0 0 600 250" role="img" aria-label={`Ingresos por mes: ${meses.map((mes) => `${mes.clave}: ${moneda.format(mes.total)}`).join(', ')}`}>
            <defs><linearGradient id="metric-barras" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff7626" /><stop offset="100%" stopColor="#8f3b2c" /></linearGradient><linearGradient id="metric-relleno" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff7024" stopOpacity=".38" /><stop offset="100%" stopColor="#ff7024" stopOpacity="0" /></linearGradient><pattern id="metric-puntos" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#ffffff" opacity=".14" /></pattern></defs>
            <rect width="600" height="220" fill="url(#metric-puntos)" />
            <path className={vista === 'curva' ? 'metric-curva visible' : 'metric-curva'} d={`${linea} L 580 220 L 20 220 Z`} fill="url(#metric-relleno)" />
            {actual && <line x1={actual.x} x2={actual.x} y1="30" y2="220" stroke="#ff7024" strokeOpacity=".5" strokeDasharray="4 6" />}
            {vista === 'curva' && <path key={periodo} className="metric-linea-animada" d={linea} pathLength="1" fill="none" stroke="#ff7024" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />}
            {puntos.filter((p) => p.total > 0).map((p) => <rect key={p.clave} className={vista === 'barras' ? 'metric-barra visible' : 'metric-barra'} x={p.x - Math.min(18, 230 / puntos.length)} y={p.y} width={Math.min(36, 460 / puntos.length)} height={220 - p.y} rx="7" fill="url(#metric-barras)" style={{ transformOrigin: `${p.x}px 220px` }} />)}
            {puntos.map((p) => <g key={p.clave} onMouseEnter={() => setSeleccion(p.clave)} onMouseLeave={() => setSeleccion(null)} onMouseDown={(e) => e.preventDefault()} onFocus={() => setSeleccion(p.clave)} onBlur={() => setSeleccion(null)} onClick={() => setSeleccion(p.clave)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSeleccion(p.clave) } }} role="button" tabIndex={0} aria-label={`${p.clave}: ${moneda.format(p.total)}`}><rect x={p.x - Math.min(24, 275 / puntos.length)} y="25" width={Math.min(48, 550 / puntos.length)} height="195" fill="transparent" /><circle className={vista === 'curva' ? 'metric-curva visible' : 'metric-curva'} cx={p.x} cy={p.y} r={p.clave === actual?.clave ? 7 : 4} fill={p.clave === actual?.clave ? '#fff' : '#ff7024'} stroke="#dc4c12" strokeWidth="2" /><title>{`${p.clave}: ${moneda.format(p.total)}`}</title></g>)}
          </svg>
          {actual && <div className="metric-tooltip" role="status" style={{ left: `${Math.max(14, Math.min(84, actual.x / 6))}%`, top: `${Math.max(10, actual.y / 2.5)}%` }}><span>{actual.etiqueta} {actual.clave.slice(0, 4)}</span><strong>{moneda.format(actual.total)}</strong></div>}
          <div className="metric-meses">{meses.map((mes) => <span key={mes.clave}>{mes.etiqueta}</span>)}</div>
          </div>
        </div>
      </div>
      {createPortal(<dialog ref={importesPanelRef} id={importesId} className="metric-importes-panel" aria-labelledby={`${importesId}-title`} onCancel={() => setMostrarImportes(false)} onClose={() => setMostrarImportes(false)} onClick={(event) => { if (event.target === event.currentTarget) setMostrarImportes(false) }}>
        <div className="metric-importes-sheet">
          <div className="metric-importes-header"><div><span className="metric-importes-eyebrow">INGRESOS · {periodo} MESES</span><h3 id={`${importesId}-title`}>Detalle mensual</h3></div><button type="button" aria-label="Cerrar importes por mes" onClick={() => setMostrarImportes(false)}>×</button></div>
          <div className="negocio-periodos metric-importes-periodos" data-selected={periodo === 6 ? 'first' : 'second'} role="group" aria-label="Periodo del detalle mensual">
            {[6, 12].map((n) => (
              <button key={n} type="button" aria-pressed={periodo === n} onClick={() => {
                onPeriodoChange(n)
                importesPanelRef.current?.querySelector('ul')?.scrollTo({ top: 0 })
              }}>{n} meses</button>
            ))}
          </div>
          <div className="metric-importes-total">
            <div className="metric-importes-amount"><strong>{moneda.format(total)}</strong><span>Pagos completados en el período</span></div>
          </div>
          <ul>{meses.map((mes) => <li key={mes.clave} className={mes.total > 0 ? 'con-ingresos' : ''}><div><span>{mes.etiqueta} <small>{mes.clave.slice(0, 4)}</small></span><strong>{moneda.format(mes.total)}</strong></div><div className="metric-importes-track" aria-hidden="true"><i style={{ width: `${mes.total / maximo * 100}%` }} /></div></li>)}</ul>
          <p className="metric-importes-foot">{meses.filter((mes) => mes.total > 0).length} de {periodo} meses con ingresos</p>
        </div>
      </dialog>, document.body)}
    </div>
  )
}

function BarrasHorizontales({
  items,
  vacio,
}: {
  items: { etiqueta: string; cantidad: number; detalle: string }[]
  vacio: string
}) {
  if (items.length === 0) return <p className="negocio-empty">{vacio}</p>
  const maximo = Math.max(1, ...items.map((item) => item.cantidad))
  return (
    <ul className="negocio-rank-list">
      {items.map((item, i) => (
        <li key={item.etiqueta}>
          <div className="negocio-rank-heading">
            <span className="negocio-rank-name"><span className="negocio-rank-number">{String(i + 1).padStart(2, '0')}</span>{item.etiqueta}</span>
            <strong>{item.detalle}</strong>
          </div>
          <div className="negocio-progress-track"><span style={{ width: `${(item.cantidad / maximo) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  )
}

export default function DashboardNegocio() {
  const [datos, setDatos] = useState<DatosReportes | null>(null)
  const [error, setError] = useState('')
  const [periodo, setPeriodo] = useState(6)
  const [vista, setVista] = useState<'curva' | 'barras'>('curva')

  const cargar = useCallback(async () => {
    try {
      const [ingresos, paquetes, horas] = await Promise.all([
        reportes.ingresosPorMes(),
        reportes.paquetesMasDemandados(),
        reportes.horasPico(),
      ])
      setDatos({ ingresos, paquetes, horas })
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los reportes.')
    }
  }, [])

  useEffect(() => {
    // La carga inicial sincroniza el panel con la API; las siguientes se programan con el intervalo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar()
    const id = setInterval(cargar, REFRESCO_MS)
    return () => clearInterval(id)
  }, [cargar])

  const meses = ultimosMeses(datos?.ingresos ?? [], periodo)
  const totalIngresos = meses.reduce((total, mes) => total + mes.total, 0)
  const totalReservas = datos?.paquetes.reduce((total, paquete) => total + paquete.totalReservas, 0) ?? 0
  const paqueteLider = datos?.paquetes[0]
  const lideresEmpatados = datos?.paquetes.filter((paquete) => paquete.totalReservas === paqueteLider?.totalReservas).length ?? 0
  const horaPico = datos?.horas[0]

  return (
    <GlassMosaic>


      {error && <div className="negocio-error" role="alert"><span>{error}</span><Button variant="ghost" onClick={() => void cargar()}>Reintentar</Button></div>}

      <section className="negocio-kpis" aria-label="Indicadores principales">
        <div className="negocio-kpi negocio-kpi-highlight"><GlassPanelSurface piece="income" /><span>INGRESOS · {periodo} MESES</span><strong>{datos ? moneda.format(totalIngresos) : '—'}</strong><small>Pagos completados</small></div>
        <div className="negocio-kpi"><GlassPanelSurface piece="bookings" /><span>RESERVAS</span><strong>{datos ? totalReservas : '—'}</strong><small>Histórico sin canceladas</small></div>
        <div className="negocio-kpi"><GlassPanelSurface piece="leader" /><span>PAQUETE LÍDER</span><strong className="negocio-kpi-text">{datos ? lideresEmpatados > 1 ? 'Empate' : paqueteLider?.paquete ?? 'Sin datos' : '—'}</strong><small>{paqueteLider ? lideresEmpatados > 1 ? `${lideresEmpatados} paquetes con ${reservasTexto(paqueteLider.totalReservas)}` : reservasTexto(paqueteLider.totalReservas) : 'Por demanda'}</small></div>
        <div className="negocio-kpi"><GlassPanelSurface piece="peak" /><span>HORA PICO</span><strong>{datos ? horaPico ? `${String(horaPico.hora).padStart(2, '0')}:00` : '—' : '—'}</strong><small>Inicio de reservas</small></div>
      </section>

      <section className="negocio-card negocio-main-card" aria-labelledby="ingresos-titulo"><GlassPanelSurface piece="chart" warm />
        <div className="negocio-card-heading"><h2 id="ingresos-titulo">Ingresos por mes</h2></div>
        {datos ? <IngresosChart ingresos={datos.ingresos} periodo={periodo} vista={vista} onPeriodoChange={setPeriodo} onVistaChange={setVista} /> : <div className="negocio-chart-loading">Cargando ingresos…</div>}
      </section>

      <div className="negocio-secondary-grid">
        <section className="negocio-card" aria-labelledby="paquetes-titulo"><GlassPanelSurface piece="packages" />
          <div className="negocio-card-heading"><div><h2 id="paquetes-titulo">Paquetes más demandados</h2><p>Reservas históricas sin canceladas</p></div></div>
          {datos ? <BarrasHorizontales items={datos.paquetes.slice(0, 5).map((p) => ({ etiqueta: p.paquete, cantidad: p.totalReservas, detalle: reservasTexto(p.totalReservas) }))} vacio="Aún no hay reservas para comparar paquetes." /> : <p className="negocio-empty">Cargando paquetes…</p>}
        </section>
        <section className="negocio-card" aria-labelledby="horas-titulo"><GlassPanelSurface piece="hours" />
          <div className="negocio-card-heading"><div><h2 id="horas-titulo">Horas pico</h2><p>Horarios con más inicios de reserva</p></div></div>
          {datos ? <BarrasHorizontales items={datos.horas.slice(0, 5).map((h) => ({ etiqueta: `${String(h.hora).padStart(2, '0')}:00`, cantidad: h.totalReservas, detalle: reservasTexto(h.totalReservas) }))} vacio="Aún no hay reservas para identificar horas pico." /> : <p className="negocio-empty">Cargando horarios…</p>}
        </section>
      </div>

      <section className="negocio-card negocio-profile"><GlassPanelSurface piece="profile" warm="bottom-right" />
        <div className="negocio-profile-content">
          <span className="negocio-section-tag">ACCESO PERSONAL</span>
          <h2>Tu cuenta<br />bajo control.</h2>
          <p className="negocio-profile-description">Actualiza tus datos y protege tu acceso al panel.</p>

        </div>
        <ShardIconLink to="/perfil" className="negocio-profile-action" label="Gestionar cuenta" direction="right"><GlassPanelSurface piece="profile" warm="bottom-right" /></ShardIconLink>
      </section>
    </GlassMosaic>
  )
}
