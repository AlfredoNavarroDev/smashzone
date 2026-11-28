import { loadDb, saveDb, nowIso, tryFetchLive, ApiDomainError } from './engine'
import type { CrearPagoDTO, UsuarioDTO, VoucherDTO } from '../types/api.types'

export async function procesarPago(dto: CrearPagoDTO, actor: UsuarioDTO, token?: string | null): Promise<VoucherDTO> {
  const live = await tryFetchLive<VoucherDTO>('/pagos', { method: 'POST', body: JSON.stringify(dto) }, token)
  if (live.handled) return live.data

  const db = loadDb()
  const reserva = db.reservas.find((r) => r.id === dto.idReserva)
  if (!reserva) {
    throw new ApiDomainError(404, 'La reserva no existe.')
  }

  if (reserva.estado !== 'Pendiente') {
    throw new ApiDomainError(409, `Solo se pueden pagar reservas en estado "Pendiente" (estado actual: "${reserva.estado}").`)
  }

  if (reserva.montoTotal <= 0) {
    throw new ApiDomainError(400, 'El monto a pagar debe ser mayor a 0.')
  }

  let transaccionRef = ''
  let nombreMetodo = ''

  if (dto.idMetodoPago === 1) {
    // Tarjeta vía Culqi
    if (!dto.culqiToken?.trim()) {
      throw new ApiDomainError(400, 'Los datos de la tarjeta son obligatorios para procesar el pago online.')
    }
    if (dto.culqiToken.includes('declined') || dto.culqiToken.includes('fail')) {
      db.pagos.push({
        idPago: crypto.randomUUID(),
        idReserva: reserva.id,
        monto: reserva.montoTotal,
        metodoPago: 'Tarjeta de Crédito/Débito (Culqi)',
        transaccionRef: `DECLINED-${Date.now()}`,
        fechaPago: nowIso(),
        exitoso: false,
      })
      saveDb(db)
      throw new ApiDomainError(
        400,
        'Tarjeta rechazada por la pasarela de pagos (Fondos insuficientes o rechazo del banco emisor). La reserva continúa Pendiente.'
      )
    }
    nombreMetodo = 'Tarjeta de Crédito/Débito (Culqi)'
    transaccionRef = `CULQI-${Math.floor(10000000 + Math.random() * 90000000)}`
  } else {
    // Pago manual: Transferencia (2) o Efectivo (3) -> Solo Staff/Admin
    if (actor.rol === 'Cliente') {
      throw new ApiDomainError(400, 'Solo el personal en local puede registrar pagos manuales en efectivo o transferencia.')
    }
    if (typeof dto.exitoso !== 'boolean') {
      throw new ApiDomainError(400, 'Debe indicar si el pago manual fue exitoso.')
    }
    nombreMetodo = dto.idMetodoPago === 2 ? 'Transferencia Bancaria' : 'Efectivo en Taquilla'
    transaccionRef = dto.transaccionRef?.trim() || `MAN-${Math.floor(100000 + Math.random() * 900000)}`

    if (!dto.exitoso) {
      db.pagos.push({
        idPago: crypto.randomUUID(),
        idReserva: reserva.id,
        monto: reserva.montoTotal,
        metodoPago: nombreMetodo,
        transaccionRef,
        fechaPago: nowIso(),
        exitoso: false,
      })
      saveDb(db)
      throw new ApiDomainError(400, 'El pago manual fue registrado como no exitoso. La reserva permanece Pendiente.')
    }
  }

  // Pago Exitoso -> Confirma automáticamente la reserva en la misma operación
  const ahora = nowIso()
  const idPago = crypto.randomUUID()
  db.pagos.push({
    idPago,
    idReserva: reserva.id,
    monto: reserva.montoTotal,
    metodoPago: nombreMetodo,
    transaccionRef,
    fechaPago: ahora,
    exitoso: true,
  })

  reserva.estado = 'Confirmada'
  if (!db.historiales[reserva.id]) db.historiales[reserva.id] = []
  db.historiales[reserva.id].push({
    id: Date.now(),
    estadoAnterior: 'Pendiente',
    estadoNuevo: 'Confirmada',
    idUsuarioCambio: dto.idMetodoPago === 1 ? null : actor.id,
    nombreUsuarioCambio:
      dto.idMetodoPago === 1 ? 'Confirmación Automática (Pago Culqi)' : `${actor.nombre} (${actor.rol} — Pago Manual)`,
    fechaCambio: ahora,
  })

  saveDb(db)

  return {
    idPago,
    idReserva: reserva.id,
    monto: reserva.montoTotal,
    metodoPago: nombreMetodo,
    transaccionRef,
    fechaPago: ahora,
    estadoReserva: 'Confirmada',
    sala: reserva.nombreSala,
    paquete: reserva.nombrePaquete,
    fechaHoraInicio: reserva.fechaHoraInicio,
    fechaHoraFin: reserva.fechaHoraFin,
  }
}
