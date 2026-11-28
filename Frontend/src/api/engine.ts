// ============================================================================
// MOTOR HÍBRIDO DE CATÁLOGO/RESERVAS/PAGOS
// Intenta backend real (.NET) primero; si no responde, cae a un motor de
// simulación local (mock DB persistida en localStorage) que replica 1:1 las
// reglas de negocio del backend. Portado desde smashzoneApi.ts.
// ============================================================================
import type {
  AdminUsuarioDTO,
  HistorialEstadoDTO,
  ItemExtraDTO,
  PaqueteDTO,
  ReservaDetalleDTO,
  SalaDTO,
} from '../types/api.types'

export class ApiDomainError extends Error {
  status: number
  errors?: Record<string, string[]>

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiDomainError'
    this.status = status
    this.errors = errors
  }
}

const STORAGE_KEY = 'smashzone_keltic_db_v2'

interface MockPaymentRecord {
  idPago: string
  idReserva: string
  monto: number
  metodoPago: string
  transaccionRef: string
  fechaPago: string
  exitoso: boolean
}

export interface MockDatabase {
  usuarios: (AdminUsuarioDTO & { passwordHash: string })[]
  salas: SalaDTO[]
  paquetes: PaqueteDTO[]
  inventario: ItemExtraDTO[]
  reservas: ReservaDetalleDTO[]
  historiales: Record<string, HistorialEstadoDTO[]>
  pagos: MockPaymentRecord[]
}

export const nowIso = () => new Date().toISOString()

function createInitialDb(): MockDatabase {
  const tomorrow18 = new Date()
  tomorrow18.setUTCDate(tomorrow18.getUTCDate() + 1)
  tomorrow18.setUTCHours(18, 0, 0, 0)
  const tomorrow18End = new Date(tomorrow18.getTime() + 45 * 60000)

  const tomorrow20 = new Date()
  tomorrow20.setUTCDate(tomorrow20.getUTCDate() + 1)
  tomorrow20.setUTCHours(20, 0, 0, 0)
  const tomorrow20End = new Date(tomorrow20.getTime() + 60 * 60000)

  const res1Id = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
  const res2Id = '1c8e9a22-7f4e-4a11-8c3a-5f9d6b2a1e09'

  return {
    usuarios: [
      {
        id: 'a0000000-0000-0000-0000-000000000001',
        nombre: 'Valeria',
        apellido: 'Keltic (Admin)',
        email: 'admin@smashzone.pe',
        telefono: '999111222',
        documentoIdentidad: '72819201',
        rol: 'Admin',
        activo: true,
        online: true,
        fechaRegistro: '2026-09-01T12:00:00Z',
        ultimoAcceso: nowIso(),
        ultimaActividad: nowIso(),
        passwordHash: 'Admin123!',
      },
      {
        id: 'b0000000-0000-0000-0000-000000000002',
        nombre: 'Marco',
        apellido: 'Vargas (Instructor)',
        email: 'staff@smashzone.pe',
        telefono: '988777666',
        documentoIdentidad: '45918273',
        rol: 'Staff',
        activo: true,
        online: true,
        fechaRegistro: '2026-09-10T15:30:00Z',
        ultimoAcceso: nowIso(),
        ultimaActividad: nowIso(),
        passwordHash: 'Staff123!',
      },
      {
        id: 'c0000000-0000-0000-0000-000000000003',
        nombre: 'Ana',
        apellido: 'García',
        email: 'ana@correo.com',
        telefono: '999888777',
        documentoIdentidad: '70192834',
        rol: 'Cliente',
        activo: true,
        online: true,
        fechaRegistro: '2026-10-05T18:20:00Z',
        ultimoAcceso: nowIso(),
        ultimaActividad: nowIso(),
        passwordHash: 'Password1!',
      },
      {
        id: 'd0000000-0000-0000-0000-000000000004',
        nombre: 'Diego',
        apellido: 'Mendoza',
        email: 'diego@correo.com',
        telefono: '944555333',
        documentoIdentidad: '71829304',
        rol: 'Cliente',
        activo: false,
        online: false,
        fechaRegistro: '2026-10-18T10:00:00Z',
        ultimoAcceso: '2026-10-25T19:00:00Z',
        ultimaActividad: '2026-10-25T19:25:00Z',
        passwordHash: 'Password1!',
      },
    ],
    salas: [
      {
        id: 1,
        nombre: 'CÁMARA 01 // BÚNKER NUCLEAR',
        capacidadMaxima: 4,
        descripcion:
          'Bóveda acorazada con paredes de hormigón armado de 40cm, iluminación estroboscópica carmesí y sistema de audio subwoofer de 2000W.',
        activa: true,
      },
      {
        id: 2,
        nombre: 'CÁMARA 02 // OFICINA CORPORATIVA',
        capacidadMaxima: 6,
        descripcion:
          'Escenario hiperrealista de cubículos de oficina con escritorios metálicos, impresoras multifuncionales y monitores listos para el bate de acero.',
        activa: true,
      },
      {
        id: 3,
        nombre: 'CÁMARA 03 // LABORATORIO CAOS XL',
        capacidadMaxima: 8,
        descripcion:
          'Arena industrial de doble altura para escuadrones. Equipada con jaula de impacto pesado, barras hidráulicas y zona de demolición libre.',
        activa: true,
      },
      {
        id: 4,
        nombre: 'CÁMARA 04 // SECTOR CRIOGÉNICO',
        capacidadMaxima: 2,
        descripcion:
          'Cámara táctica en calibración acústica y recambio de blindaje de policarbonato.',
        activa: false,
      },
    ],
    paquetes: [
      {
        id: 1,
        nombre: 'RAGE STARTER // SPARK',
        descripcion:
          'Descarga táctica individual o en dupla. Incluye 15 botellas de cristal templado, 4 piezas de cerámica y 1 periférico electrónico con mazo ligero.',
        precio: 89.0,
        duracionMinutos: 30,
        maxParticipantes: 2,
        cantidadItemsEstandar: 20,
        activo: true,
      },
      {
        id: 2,
        nombre: 'COUPLES & DUO // THERAPY',
        descripcion:
          'El protocolo más reservado. 25 botellas de vidrio, 8 platos industriales, 1 impresora de oficina y 1 monitor LCD con bates de aluminio y barretas.',
        precio: 159.0,
        duracionMinutos: 45,
        maxParticipantes: 4,
        cantidadItemsEstandar: 35,
        activo: true,
      },
      {
        id: 3,
        nombre: 'EXECUTIVE MELTDOWN // VIP',
        descripcion:
          'Demolición ejecutiva sin restricciones: 40 piezas de cristal, 2 impresoras corporativas, 1 TV CRT/LED y 1 microondas con mazo de demolición de 5kg.',
        precio: 249.0,
        duracionMinutos: 60,
        maxParticipantes: 6,
        cantidadItemsEstandar: 55,
        activo: true,
      },
      {
        id: 4,
        nombre: 'TOTAL ANNIHILATION // SQUAD',
        descripcion:
          'Aniquilación total para grupos. 75 objetos de vidrio/cerámica, 3 electrodomésticos medianos, 2 monitores y playlist conectada al sistema estroboscópico.',
        precio: 369.0,
        duracionMinutos: 60,
        maxParticipantes: 8,
        cantidadItemsEstandar: 85,
        activo: true,
      },
    ],
    inventario: [
      {
        id: 1,
        nombre: 'Botellas de Cristal Templado (x12)',
        categoria: 'Vidrio',
        precioUnitario: 25.0,
        stockDisponible: 34,
        activo: true,
      },
      {
        id: 2,
        nombre: 'Tazas y Vajilla de Cerámica (x10)',
        categoria: 'Vidrio',
        precioUnitario: 28.0,
        stockDisponible: 22,
        activo: true,
      },
      {
        id: 3,
        nombre: 'Six-Pack de Botellas Duff',
        categoria: 'Vidrio',
        precioUnitario: 35.0,
        stockDisponible: 18,
        activo: true,
      },
      {
        id: 4,
        nombre: 'Impresora Corporativa Multifuncional',
        categoria: 'Electrónica',
        precioUnitario: 55.0,
        stockDisponible: 9,
        activo: true,
      },
      {
        id: 5,
        nombre: 'Monitor CRT de Oficina',
        categoria: 'Electrónica',
        precioUnitario: 65.0,
        stockDisponible: 8,
        activo: true,
      },
      {
        id: 6,
        nombre: 'Televisor Retro 32" de Cristal',
        categoria: 'Electrónica',
        precioUnitario: 75.0,
        stockDisponible: 6,
        activo: true,
      },
      {
        id: 7,
        nombre: 'Lavadora Industrial en Desuso (Boss Item)',
        categoria: 'Electrodomésticos',
        precioUnitario: 120.0,
        stockDisponible: 4,
        activo: true,
      },
    ],
    reservas: [
      {
        id: res1Id,
        idCliente: 'c0000000-0000-0000-0000-000000000003',
        nombreCliente: 'Ana García',
        idSala: 1,
        nombreSala: 'CÁMARA 01 // BÚNKER NUCLEAR',
        idPaquete: 2,
        nombrePaquete: 'COUPLES & DUO // THERAPY',
        fechaHoraInicio: tomorrow18.toISOString(),
        fechaHoraFin: tomorrow18End.toISOString(),
        numParticipantes: 2,
        estado: 'Confirmada',
        montoPaquete: 159.0,
        montoExtras: 55.0,
        montoTotal: 214.0,
        notasEspeciales: 'Playlist Industrial Techno / Heavy Metal activada.',
        fechaCreacion: '2026-11-10T14:20:00Z',
        extras: [
          {
            idItemExtra: 3,
            nombreItem: 'Impresora Corporativa Multifuncional',
            categoria: 'Electrónica',
            cantidad: 1,
            precioUnitarioHistorico: 55.0,
            subtotal: 55.0,
          },
        ],
      },
      {
        id: res2Id,
        idCliente: 'c0000000-0000-0000-0000-000000000003',
        nombreCliente: 'Ana García',
        idSala: 2,
        nombreSala: 'CÁMARA 02 // OFICINA CORPORATIVA',
        idPaquete: 3,
        nombrePaquete: 'EXECUTIVE MELTDOWN // VIP',
        fechaHoraInicio: tomorrow20.toISOString(),
        fechaHoraFin: tomorrow20End.toISOString(),
        numParticipantes: 4,
        estado: 'Pendiente',
        montoPaquete: 249.0,
        montoExtras: 50.0,
        montoTotal: 299.0,
        notasEspeciales: 'Celebración post-exámenes parciales.',
        fechaCreacion: '2026-11-11T19:10:00Z',
        extras: [
          {
            idItemExtra: 1,
            nombreItem: 'Caja x12 Botellas de Cristal Templado',
            categoria: 'Vidrio',
            cantidad: 2,
            precioUnitarioHistorico: 25.0,
            subtotal: 50.0,
          },
        ],
      },
    ],
    historiales: {
      [res1Id]: [
        {
          id: 1,
          estadoAnterior: null,
          estadoNuevo: 'Pendiente',
          idUsuarioCambio: null,
          nombreUsuarioCambio: 'Cliente (Creación Inicial)',
          fechaCambio: '2026-11-10T14:20:00Z',
        },
        {
          id: 2,
          estadoAnterior: 'Pendiente',
          estadoNuevo: 'Confirmada',
          idUsuarioCambio: null,
          nombreUsuarioCambio: 'Pasarela Culqi (Pago Exitoso)',
          fechaCambio: '2026-11-10T14:22:15Z',
        },
      ],
      [res2Id]: [
        {
          id: 3,
          estadoAnterior: null,
          estadoNuevo: 'Pendiente',
          idUsuarioCambio: null,
          nombreUsuarioCambio: 'Cliente (Creación Inicial)',
          fechaCambio: '2026-11-11T19:10:00Z',
        },
      ],
    },
    pagos: [
      {
        idPago: 'pay-901',
        idReserva: 'hist-01',
        monto: 3450.0,
        metodoPago: 'Tarjeta de Crédito/Débito (Culqi)',
        transaccionRef: 'CULQI-202608-01',
        fechaPago: '2026-08-18T19:00:00Z',
        exitoso: true,
      },
      {
        idPago: 'pay-902',
        idReserva: 'hist-02',
        monto: 4890.0,
        metodoPago: 'Tarjeta de Crédito/Débito (Culqi)',
        transaccionRef: 'CULQI-202609-04',
        fechaPago: '2026-09-22T20:00:00Z',
        exitoso: true,
      },
      {
        idPago: 'pay-903',
        idReserva: 'hist-03',
        monto: 6120.0,
        metodoPago: 'Tarjeta de Crédito/Débito (Culqi)',
        transaccionRef: 'CULQI-202610-09',
        fechaPago: '2026-10-19T21:00:00Z',
        exitoso: true,
      },
      {
        idPago: 'pay-904',
        idReserva: res1Id,
        monto: 214.0,
        metodoPago: 'Tarjeta de Crédito/Débito (Culqi)',
        transaccionRef: 'CULQI-77829104',
        fechaPago: '2026-11-10T14:22:15Z',
        exitoso: true,
      },
    ],
  }
}

export function loadDb(): MockDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const initial = createInitialDb()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
      return initial
    }
    return JSON.parse(raw) as MockDatabase
  } catch {
    return createInitialDb()
  }
}

export function saveDb(db: MockDatabase) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // ignore storage quota errors
  }
}

export function resetMockDatabase(): MockDatabase {
  const initial = createInitialDb()
  saveDb(initial)
  return initial
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5021/api'

let isBackendLive = false

export function getEngineMode(): 'LIVE_API' | 'SIMULATION_ENGINE' {
  return isBackendLive ? 'LIVE_API' : 'SIMULATION_ENGINE'
}

export async function tryFetchLive<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<{ handled: true; data: T } | { handled: false }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 900)

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeout)
    isBackendLive = true

    if (res.status === 204) {
      return { handled: true, data: undefined as unknown as T }
    }

    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      let msg =
        body?.detail ||
        body?.title ||
        (body?.errors ? Object.values(body.errors).flat().join(' ') : null) ||
        `No fue posible completar la operación (${res.status}).`
      // Limpiar prefijos técnicos que provengan de excepciones del backend
      msg = msg.replace(
        /^\d{3}\s*(Conflict|ConflictoException|ReglaNegocioException|BadRequest|NotFound|NoEncontradoException):\s*/i,
        ''
      )
      throw new ApiDomainError(res.status, msg, body?.errors)
    }

    return { handled: true, data: body as T }
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof ApiDomainError) {
      throw err
    }
    // Red caída o backend local apagado -> activamos Motor Transaccional Simulado
    isBackendLive = false
    return { handled: false }
  }
}
