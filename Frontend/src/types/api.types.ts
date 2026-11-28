// ============================================================================
// SMASHZONE — CONTRATOS OFICIALES DE API (1:1 con api-contracts.md y Backend .NET 10)
// ============================================================================

export type RolNombre = 'Admin' | 'Staff' | 'Cliente';

export type EstadoReservaNombre =
  | 'Pendiente'
  | 'Confirmada'
  | 'EnProceso'
  | 'Completada'
  | 'Cancelada';

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string[]>;
}

// ----------------------------------------------------------------------------
// BLOQUE 1 — AUTH Y USUARIOS
// ----------------------------------------------------------------------------
export interface RegistroDTO {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  telefono?: string | null;
  documentoIdentidad?: string | null;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UsuarioDTO {
  id: string; // GUID
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  documentoIdentidad: string | null;
  rol: RolNombre;
  activo: boolean;
  fechaRegistro: string; // ISO-8601 UTC
}

export interface LoginRespuestaDTO {
  token: string;
  expiraEn: string; // ISO-8601 UTC
  usuario: UsuarioDTO;
}

export interface ActualizarPerfilDTO {
  nombre: string;
  apellido: string;
  telefono?: string | null;
}

export interface CambiarPasswordDTO {
  passwordActual: string;
  passwordNueva: string;
}

export interface AdminUsuarioDTO extends UsuarioDTO {
  online: boolean;
  ultimoAcceso: string | null;
  ultimaActividad: string | null;
}

export interface PaginadoDTO<T> {
  items: T[];
  total: number;
  pagina: number;
  tamanoPagina: number;
}

export interface UsuariosResumenDTO {
  totalRegistrados: number;
  habilitados: number;
  deshabilitados: number;
  onlineAhora: number;
  activos7Dias: number;
  porRol: { rol: RolNombre; cantidad: number }[];
  registrosPorDia: { fecha: string; cantidad: number }[];
}

export interface RolDTO {
  id: number;
  nombre: RolNombre;
  descripcion: string;
}

// ----------------------------------------------------------------------------
// BLOQUE 2 — CATÁLOGO (SALAS, PAQUETES, INVENTARIO)
// ----------------------------------------------------------------------------
export interface SalaDTO {
  id: number;
  nombre: string;
  capacidadMaxima: number;
  descripcion: string | null;
  activa: boolean;
}

export interface CrearSalaDTO {
  nombre: string;
  capacidadMaxima: number;
  descripcion?: string | null;
}

export type ActualizarSalaDTO = CrearSalaDTO;

export interface PaqueteDTO {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  duracionMinutos: number;
  maxParticipantes: number;
  cantidadItemsEstandar: number;
  activo: boolean;
}

export interface CrearPaqueteDTO {
  nombre: string;
  descripcion?: string | null;
  precio: number;
  duracionMinutos: number;
  maxParticipantes: number;
  cantidadItemsEstandar: number;
}

export type ActualizarPaqueteDTO = CrearPaqueteDTO;

export interface ItemExtraDTO {
  id: number;
  nombre: string;
  categoria: 'Vidrio' | 'Electrodomésticos' | 'Electrónica' | string;
  precioUnitario: number;
  stockDisponible: number;
  activo: boolean;
}

export interface CrearItemExtraDTO {
  nombre: string;
  categoria: string;
  precioUnitario: number;
  stockDisponible: number;
}

export type ActualizarItemExtraDTO = CrearItemExtraDTO;

export interface CambiarEstadoDTO {
  activo: boolean;
}

// ----------------------------------------------------------------------------
// BLOQUE 3 — CORE TRANSACCIONAL (RESERVAS Y PAGOS)
// ----------------------------------------------------------------------------
export interface ReservaExtraInputDTO {
  idItemExtra: number;
  cantidad: number;
}

export interface CrearReservaDTO {
  idSala: number;
  idPaquete: number;
  fechaHoraInicio: string; // ISO-8601 UTC
  numParticipantes: number;
  notasEspeciales?: string | null;
  idCliente?: string | null; // Opcional para Staff/Admin
  extras: ReservaExtraInputDTO[];
}

export interface DetalleReservaExtraDTO {
  idItemExtra: number;
  nombreItem: string;
  categoria: string;
  cantidad: number;
  precioUnitarioHistorico: number;
  subtotal: number;
}

export interface ReservaDetalleDTO {
  id: string; // GUID
  idCliente: string;
  nombreCliente?: string;
  idSala: number;
  nombreSala: string;
  idPaquete: number;
  nombrePaquete: string;
  fechaHoraInicio: string; // ISO-8601 UTC
  fechaHoraFin: string; // ISO-8601 UTC (Calculada server-side)
  numParticipantes: number;
  estado: EstadoReservaNombre;
  montoPaquete: number;
  montoExtras: number;
  montoTotal: number;
  notasEspeciales: string | null;
  fechaCreacion: string;
  extras: DetalleReservaExtraDTO[];
}

export interface CambiarEstadoReservaDTO {
  nuevoEstado: EstadoReservaNombre;
}

export interface HistorialEstadoDTO {
  id: number;
  estadoAnterior: EstadoReservaNombre | null;
  estadoNuevo: EstadoReservaNombre;
  idUsuarioCambio: string | null;
  nombreUsuarioCambio?: string | null;
  fechaCambio: string; // ISO-8601 UTC
}

export interface CrearPagoDTO {
  idReserva: string; // GUID
  idMetodoPago: 1 | 2 | 3; // 1 = Tarjeta (Culqi), 2 = Transferencia, 3 = Efectivo
  culqiToken?: string; // Requerido si idMetodoPago === 1
  exitoso?: boolean; // Requerido si idMetodoPago === 2 o 3 (Staff/Admin)
  transaccionRef?: string; // Referencia manual
}

export interface VoucherDTO {
  idPago: string;
  idReserva: string;
  monto: number;
  metodoPago: string;
  transaccionRef: string;
  fechaPago: string;
  estadoReserva: EstadoReservaNombre;
  sala: string;
  paquete: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
}

// ----------------------------------------------------------------------------
// BLOQUE 4 — REPORTES (ADMIN DASHBOARD)
// ----------------------------------------------------------------------------
export interface IngresoMesDTO {
  anio: number;
  mes: number;
  totalIngresos: number;
}

export interface PaqueteDemandaDTO {
  idPaquete: number;
  paquete: string;
  totalReservas: number;
}

export interface HoraPicoDTO {
  hora: number; // 0 - 23 UTC
  totalReservas: number;
}

