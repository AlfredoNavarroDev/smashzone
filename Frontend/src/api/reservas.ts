import { loadDb, saveDb, nowIso, tryFetchLive, ApiDomainError } from './engine'
import type {
  CrearReservaDTO,
  EstadoReservaNombre,
  HistorialEstadoDTO,
  ReservaDetalleDTO,
  UsuarioDTO,
} from '../types/api.types'

export async function listarReservas(
  actor: UsuarioDTO,
  estadoFiltro?: EstadoReservaNombre | '',
  token?: string | null
): Promise<ReservaDetalleDTO[]> {
  const qs = estadoFiltro ? `?estado=${estadoFiltro}` : ''
  const live = await tryFetchLive<ReservaDetalleDTO[]>(`/reservas${qs}`, { method: 'GET' }, token)
  if (live.handled) return live.data

  const db = loadDb()
  let list = [...db.reservas].sort(
    (a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
  )

  if (actor.rol === 'Cliente') {
    list = list.filter((r) => r.idCliente === actor.id)
  }
  if (estadoFiltro) {
    list = list.filter((r) => r.estado === estadoFiltro)
  }
  return list
}

export async function crearReserva(
  dto: CrearReservaDTO,
  actor: UsuarioDTO,
  token?: string | null
): Promise<ReservaDetalleDTO> {
  const live = await tryFetchLive<ReservaDetalleDTO>('/reservas', { method: 'POST', body: JSON.stringify(dto) }, token)
  if (live.handled) return live.data

  const db = loadDb()

  // 1. Resolver cliente dueño (Si es Cliente, se ignora dto.idCliente)
  let idDueno = actor.id
  let nombreDueno = `${actor.nombre} ${actor.apellido}`
  if ((actor.rol === 'Staff' || actor.rol === 'Admin') && dto.idCliente) {
    const clienteTarget = db.usuarios.find((u) => u.id === dto.idCliente)
    if (!clienteTarget) {
      throw new ApiDomainError(404, 'El cliente indicado no existe.')
    }
    idDueno = clienteTarget.id
    nombreDueno = `${clienteTarget.nombre} ${clienteTarget.apellido}`
  }

  // 2. Validar Sala (404 si no existe, 400 si inactiva)
  const sala = db.salas.find((s) => s.id === dto.idSala)
  if (!sala) throw new ApiDomainError(404, 'La sala seleccionada no existe.')
  if (!sala.activa) throw new ApiDomainError(400, 'La sala seleccionada se encuentra en mantenimiento (inactiva).')

  // 3. Validar Paquete (404 si no existe, 400 si inactivo)
  const paquete = db.paquetes.find((p) => p.id === dto.idPaquete)
  if (!paquete) throw new ApiDomainError(404, 'El paquete seleccionado no existe.')
  if (!paquete.activo) throw new ApiDomainError(400, 'El paquete seleccionado no está activo.')

  // 4. Validar FechaHoraInicio futura
  const inicioMs = new Date(dto.fechaHoraInicio).getTime()
  if (Number.isNaN(inicioMs) || inicioMs <= Date.now()) {
    throw new ApiDomainError(400, 'La fecha y hora de inicio debe ser futura respecto a la hora actual.')
  }

  // 5. Validar NumParticipantes contra Sala.CapacidadMaxima y Paquete.MaxParticipantes
  if (dto.numParticipantes <= 0) {
    throw new ApiDomainError(400, 'El número de participantes debe ser al menos 1.')
  }
  if (dto.numParticipantes > sala.capacidadMaxima) {
    throw new ApiDomainError(
      400,
      `El número de participantes (${dto.numParticipantes}) supera la capacidad máxima de la sala "${sala.nombre}" (${sala.capacidadMaxima}).`
    )
  }
  if (dto.numParticipantes > paquete.maxParticipantes) {
    throw new ApiDomainError(
      400,
      `El número de participantes (${dto.numParticipantes}) supera el cupo máximo del paquete "${paquete.nombre}" (${paquete.maxParticipantes}).`
    )
  }

  // 6. Calcular FechaHoraFin server-side
  const finMs = inicioMs + paquete.duracionMinutos * 60000

  // 7. Regla Crítica: Prevención de Solapamiento de Horarios en la misma Sala
  const conflicto = db.reservas.find((r) => {
    if (r.idSala !== sala.id || r.estado === 'Cancelada') return false
    const rInicio = new Date(r.fechaHoraInicio).getTime()
    const rFin = new Date(r.fechaHoraFin).getTime()
    return inicioMs < rFin && finMs > rInicio
  })

  if (conflicto) {
    const hIni = new Date(conflicto.fechaHoraInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const hFin = new Date(conflicto.fechaHoraFin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    throw new ApiDomainError(
      409,
      `Horario no disponible. La sala "${sala.nombre}" ya tiene una reserva activa entre ${hIni} y ${hFin}. Por favor, elige otro horario o sala.`
    )
  }

  // 8. Validar y descontar stock de Extras + congelar PrecioUnitarioHistorico
  for (const extraReq of dto.extras || []) {
    if (extraReq.cantidad <= 0) continue
    const item = db.inventario.find((i) => i.id === extraReq.idItemExtra)
    if (!item) {
      throw new ApiDomainError(404, 'El ítem extra solicitado no existe.')
    }
    if (!item.activo) {
      throw new ApiDomainError(400, `El ítem "${item.nombre}" se encuentra inactivo.`)
    }
    if (item.stockDisponible < extraReq.cantidad) {
      throw new ApiDomainError(
        400,
        `Stock insuficiente para "${item.nombre}" (disponible: ${item.stockDisponible}, solicitado: ${extraReq.cantidad}).`
      )
    }
  }

  // Descontar en una sola unidad de trabajo
  const detallesExtras = []
  let montoExtras = 0
  for (const extraReq of dto.extras || []) {
    if (extraReq.cantidad <= 0) continue
    const item = db.inventario.find((i) => i.id === extraReq.idItemExtra)!
    item.stockDisponible -= extraReq.cantidad
    const subtotal = Number((item.precioUnitario * extraReq.cantidad).toFixed(2))
    montoExtras += subtotal
    detallesExtras.push({
      idItemExtra: item.id,
      nombreItem: item.nombre,
      categoria: item.categoria,
      cantidad: extraReq.cantidad,
      precioUnitarioHistorico: item.precioUnitario,
      subtotal,
    })
  }

  const montoPaquete = paquete.precio
  const montoTotal = Number((montoPaquete + montoExtras).toFixed(2))
  const nuevaId = crypto.randomUUID()
  const ahora = nowIso()

  const nuevaReserva: ReservaDetalleDTO = {
    id: nuevaId,
    idCliente: idDueno,
    nombreCliente: nombreDueno,
    idSala: sala.id,
    nombreSala: sala.nombre,
    idPaquete: paquete.id,
    nombrePaquete: paquete.nombre,
    fechaHoraInicio: new Date(inicioMs).toISOString(),
    fechaHoraFin: new Date(finMs).toISOString(),
    numParticipantes: dto.numParticipantes,
    estado: 'Pendiente',
    montoPaquete,
    montoExtras,
    montoTotal,
    notasEspeciales: dto.notasEspeciales?.trim() || null,
    fechaCreacion: ahora,
    extras: detallesExtras,
  }

  db.reservas.unshift(nuevaReserva)
  db.historiales[nuevaId] = [
    {
      id: Date.now(),
      estadoAnterior: null,
      estadoNuevo: 'Pendiente',
      idUsuarioCambio: actor.rol === 'Cliente' ? null : actor.id,
      nombreUsuarioCambio:
        actor.rol === 'Cliente' ? 'Cliente (Creación Inicial)' : `${actor.nombre} (${actor.rol})`,
      fechaCambio: ahora,
    },
  ]

  saveDb(db)
  return nuevaReserva
}

export async function cambiarEstadoReserva(
  idReserva: string,
  nuevoEstado: EstadoReservaNombre,
  actor: UsuarioDTO,
  token?: string | null
): Promise<ReservaDetalleDTO> {
  const live = await tryFetchLive<ReservaDetalleDTO>(
    `/reservas/${idReserva}/estado`,
    { method: 'PUT', body: JSON.stringify({ nuevoEstado }) },
    token
  )
  if (live.handled) return live.data

  const db = loadDb()
  const reserva = db.reservas.find((r) => r.id === idReserva)
  if (!reserva) {
    throw new ApiDomainError(404, 'Reserva no encontrada.')
  }

  // 1. Si el actor es Cliente y no es dueño -> 404 (para no filtrar existencia)
  const esStaffOAdmin = actor.rol === 'Staff' || actor.rol === 'Admin'
  if (!esStaffOAdmin && reserva.idCliente !== actor.id) {
    throw new ApiDomainError(404, 'Reserva no encontrada.')
  }

  // 2. Confirmada nunca es destino válido por este endpoint (solo vía pago exitoso)
  if (nuevoEstado === 'Confirmada') {
    throw new ApiDomainError(400, 'El estado "Confirmada" solo se alcanza automáticamente al registrar un pago exitoso.')
  }

  // 3. Estado terminal (Completada / Cancelada)
  if (reserva.estado === 'Completada' || reserva.estado === 'Cancelada') {
    throw new ApiDomainError(400, `La reserva ya se encuentra en estado final (${reserva.estado}).`)
  }

  // 4. Tabla de transiciones válidas (ReservaService.cs:139-146)
  const transicionesValidas: Record<string, EstadoReservaNombre[]> = {
    Pendiente: ['Cancelada'],
    Confirmada: ['Cancelada', 'EnProceso'],
    EnProceso: ['Completada'],
  }

  const permitidas = transicionesValidas[reserva.estado] || []
  if (!permitidas.includes(nuevoEstado)) {
    throw new ApiDomainError(400, `Transición no permitida de "${reserva.estado}" a "${nuevoEstado}".`)
  }

  // 5. Permisos por transición: EnProceso y Completada exigen Staff/Admin
  if ((nuevoEstado === 'EnProceso' || nuevoEstado === 'Completada') && !esStaffOAdmin) {
    throw new ApiDomainError(400, `Solo el personal autorizado puede cambiar la reserva a "${nuevoEstado}".`)
  }

  // 6. Si pasa a Cancelada, reponer stock de todos los DetallesReservaExtra
  if (nuevoEstado === 'Cancelada') {
    for (const det of reserva.extras) {
      const item = db.inventario.find((i) => i.id === det.idItemExtra)
      if (item) {
        item.stockDisponible += det.cantidad
      }
    }
  }

  const estadoAnterior = reserva.estado
  reserva.estado = nuevoEstado

  if (!db.historiales[idReserva]) db.historiales[idReserva] = []
  db.historiales[idReserva].push({
    id: Date.now(),
    estadoAnterior,
    estadoNuevo: nuevoEstado,
    idUsuarioCambio: esStaffOAdmin ? actor.id : null,
    nombreUsuarioCambio: esStaffOAdmin
      ? `${actor.nombre} ${actor.apellido} (${actor.rol})`
      : 'Cliente (Autogestión)',
    fechaCambio: nowIso(),
  })

  saveDb(db)
  return reserva
}

export async function obtenerHistorialReserva(idReserva: string, token?: string | null): Promise<HistorialEstadoDTO[]> {
  const live = await tryFetchLive<HistorialEstadoDTO[]>(`/reservas/${idReserva}/historial`, { method: 'GET' }, token)
  if (live.handled) return live.data

  const db = loadDb()
  return db.historiales[idReserva] || []
}
