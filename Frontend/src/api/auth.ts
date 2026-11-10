import { get, post, put } from './http'
import type { LoginRespuesta, RegistroPayload, Usuario } from './types'

export const login = (email: string, password: string) =>
  post<LoginRespuesta>('/api/auth/login', { email, password })

export const registro = (data: RegistroPayload) => post<Usuario>('/api/auth/registro', data)

export const heartbeat = () => post<void>('/api/auth/heartbeat')

export const obtenerPerfil = () => get<Usuario>('/api/usuarios/me')

export const actualizarPerfil = (data: { nombre: string; apellido: string; telefono: string | null }) =>
  put<Usuario>('/api/usuarios/me', data)

export const cambiarPassword = (passwordActual: string, passwordNueva: string) =>
  put<void>('/api/usuarios/me/password', { passwordActual, passwordNueva })
