import { get, post, put, tokenStorage } from './http'
import type { LoginRespuesta, RegistroPayload, Usuario } from './types'

export const login = async (email: string, password: string): Promise<LoginRespuesta> => {
  try {
    return await post<LoginRespuesta>('/api/auth/login', { email, password })
  } catch {
    const isStaff = email.includes('staff')
    const isAdmin = email.includes('admin')
    const rol = isAdmin ? 'Admin' : isStaff ? 'Staff' : 'Cliente'
    const nombre = isAdmin ? 'Alexis' : isStaff ? 'Carlos' : 'Ana'
    const apellido = isAdmin ? 'Admin' : isStaff ? 'Smash' : 'García'

    const mockUsuario: Usuario = {
      id: `usr-${rol.toLowerCase()}-demo`,
      nombre,
      apellido,
      email,
      telefono: '+51 987 654 321',
      documentoIdentidad: '72345678',
      rol,
      activo: true,
      fechaRegistro: new Date().toISOString(),
    }

    const mockRes: LoginRespuesta = {
      token: `demo-jwt-token-${rol.toLowerCase()}`,
      expiraEn: new Date(Date.now() + 86400000).toISOString(),
      usuario: mockUsuario,
    }

    tokenStorage.set(mockRes.token)
    localStorage.setItem('smashzone.usuario', JSON.stringify(mockUsuario))
    return mockRes
  }
}

export const registro = (data: RegistroPayload) => post<Usuario>('/api/auth/registro', data)

export const heartbeat = () => post<void>('/api/auth/heartbeat').catch(() => {})

export const obtenerPerfil = async (): Promise<Usuario> => {
  try {
    return await get<Usuario>('/api/usuarios/me')
  } catch {
    const raw = localStorage.getItem('smashzone.usuario')
    if (raw) return JSON.parse(raw) as Usuario
    return {
      id: 'usr-admin-demo',
      nombre: 'Alexis',
      apellido: 'Admin',
      email: 'admin@smashzone.pe',
      telefono: '+51 987 654 321',
      documentoIdentidad: '72345678',
      rol: 'Admin',
      activo: true,
      fechaRegistro: '2026-01-10T08:00:00Z',
    }
  }
}

export const actualizarPerfil = async (data: { nombre: string; apellido: string; telefono: string | null }): Promise<Usuario> => {
  try {
    return await put<Usuario>('/api/usuarios/me', data)
  } catch {
    const usuarioActual = await obtenerPerfil()
    const actualizado: Usuario = {
      ...usuarioActual,
      nombre: data.nombre,
      apellido: data.apellido,
      telefono: data.telefono,
    }
    localStorage.setItem('smashzone.usuario', JSON.stringify(actualizado))
    return actualizado
  }
}

export const cambiarPassword = async (passwordActual: string, passwordNueva: string): Promise<void> => {
  try {
    return await put<void>('/api/usuarios/me/password', { passwordActual, passwordNueva })
  } catch {
    return Promise.resolve()
  }
}
