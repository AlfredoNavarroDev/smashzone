export type RolNombre = 'Admin' | 'Staff' | 'Cliente'

export interface Usuario {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  documentoIdentidad: string | null
  rol: RolNombre
  activo: boolean
  fechaRegistro: string | null
}

export interface LoginRespuesta {
  token: string
  expiraEn: string
  usuario: Usuario
}

export interface RegistroPayload {
  nombre: string
  apellido: string
  email: string
  password: string
  telefono?: string
}

export interface AdminUsuario {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  idRol: number
  rol: RolNombre
  activo: boolean
  online: boolean
  fechaRegistro: string | null
  ultimoAcceso: string | null
  ultimaActividad: string | null
}

export interface Paginado<T> {
  items: T[]
  total: number
  pagina: number
  tamanoPagina: number
}

export interface Rol {
  id: number
  nombre: string
  descripcion: string | null
}

export interface UsuariosResumen {
  totalRegistrados: number
  habilitados: number
  deshabilitados: number
  onlineAhora: number
  activos7Dias: number
  porRol: { rol: string; cantidad: number }[]
  registrosPorDia: { fecha: string; cantidad: number }[]
}

export interface FiltroUsuarios {
  texto?: string
  idRol?: number
  activo?: boolean
  online?: boolean
  pagina?: number
  tamanoPagina?: number
}
