import { get, put } from './http'
import type { AdminUsuario, FiltroUsuarios, Paginado, Rol, UsuariosResumen } from './types'

const MOCK_ROLES: Rol[] = [
  { id: 1, nombre: 'Cliente', descripcion: 'Usuario cliente con acceso a reservas y perfil' },
  { id: 2, nombre: 'Staff', descripcion: 'Operador de pista, control de bóvedas y cobro' },
  { id: 3, nombre: 'Admin', descripcion: 'Acceso total a finanzas, analíticas y gestión' },
]

const MOCK_USUARIOS: AdminUsuario[] = [
  {
    id: 'usr-admin-001',
    nombre: 'Alexis',
    apellido: 'Admin',
    email: 'admin@smashzone.pe',
    telefono: '+51 987 654 321',
    idRol: 3,
    rol: 'Admin',
    activo: true,
    online: true,
    fechaRegistro: '2026-01-10T08:00:00Z',
    ultimoAcceso: '2026-11-25T14:30:00Z',
    ultimaActividad: '2026-11-25T14:45:00Z',
  },
  {
    id: 'usr-staff-002',
    nombre: 'Carlos',
    apellido: 'Smash',
    email: 'staff@smashzone.pe',
    telefono: '+51 912 345 678',
    idRol: 2,
    rol: 'Staff',
    activo: true,
    online: true,
    fechaRegistro: '2026-02-15T10:00:00Z',
    ultimoAcceso: '2026-11-25T13:10:00Z',
    ultimaActividad: '2026-11-25T13:55:00Z',
  },
  {
    id: 'usr-client-003',
    nombre: 'Ana',
    apellido: 'García',
    email: 'ana@correo.com',
    telefono: '+51 999 888 777',
    idRol: 1,
    rol: 'Cliente',
    activo: true,
    online: false,
    fechaRegistro: '2026-03-01T12:00:00Z',
    ultimoAcceso: '2026-11-24T18:20:00Z',
    ultimaActividad: '2026-11-24T19:00:00Z',
  },
  {
    id: 'usr-client-004',
    nombre: 'Rodrigo',
    apellido: 'Mendoza',
    email: 'rodrigo.m@gmail.com',
    telefono: '+51 945 112 233',
    idRol: 1,
    rol: 'Cliente',
    activo: true,
    online: false,
    fechaRegistro: '2026-04-12T15:30:00Z',
    ultimoAcceso: '2026-11-22T11:00:00Z',
    ultimaActividad: '2026-11-22T11:45:00Z',
  },
  {
    id: 'usr-client-005',
    nombre: 'Lucía',
    apellido: 'Paredes',
    email: 'lucia.p@outlook.com',
    telefono: null,
    idRol: 1,
    rol: 'Cliente',
    activo: false,
    online: false,
    fechaRegistro: '2026-05-20T17:40:00Z',
    ultimoAcceso: '2026-10-15T09:12:00Z',
    ultimaActividad: '2026-10-15T09:30:00Z',
  },
]

export async function resumenUsuarios(): Promise<UsuariosResumen> {
  try {
    return await get<UsuariosResumen>('/api/admin/usuarios/resumen')
  } catch {
    return {
      totalRegistrados: 24,
      habilitados: 21,
      deshabilitados: 3,
      onlineAhora: 4,
      activos7Dias: 16,
      porRol: [
        { rol: 'Cliente', cantidad: 18 },
        { rol: 'Staff', cantidad: 4 },
        { rol: 'Admin', cantidad: 2 },
      ],
      registrosPorDia: [
        { fecha: '2026-11-19', cantidad: 2 },
        { fecha: '2026-11-20', cantidad: 5 },
        { fecha: '2026-11-21', cantidad: 3 },
        { fecha: '2026-11-22', cantidad: 7 },
        { fecha: '2026-11-23', cantidad: 4 },
        { fecha: '2026-11-24', cantidad: 6 },
        { fecha: '2026-11-25', cantidad: 3 },
      ],
    }
  }
}

export async function listarRoles(): Promise<Rol[]> {
  try {
    return await get<Rol[]>('/api/admin/roles')
  } catch {
    return MOCK_ROLES
  }
}

export async function listarUsuarios(f: FiltroUsuarios): Promise<Paginado<AdminUsuario>> {
  try {
    const qs = new URLSearchParams()
    Object.entries(f).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v))
    })
    return await get<Paginado<AdminUsuario>>(`/api/admin/usuarios?${qs}`)
  } catch {
    let items = [...MOCK_USUARIOS]
    if (f.texto) {
      const q = f.texto.toLowerCase()
      items = items.filter(
        (u) =>
          u.nombre.toLowerCase().includes(q) ||
          u.apellido.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
    }
    if (f.idRol) {
      items = items.filter((u) => u.idRol === f.idRol)
    }
    if (f.activo !== undefined) {
      items = items.filter((u) => u.activo === f.activo)
    }
    if (f.online !== undefined) {
      items = items.filter((u) => u.online === f.online)
    }

    const tamano = f.tamanoPagina || 10
    const pagina = f.pagina || 1
    const inicio = (pagina - 1) * tamano

    return {
      items: items.slice(inicio, inicio + tamano),
      total: items.length,
      pagina,
      tamanoPagina: tamano,
    }
  }
}

export async function cambiarRol(id: string, idRol: number): Promise<AdminUsuario> {
  try {
    return await put<AdminUsuario>(`/api/admin/usuarios/${id}/rol`, { idRol })
  } catch {
    const user = MOCK_USUARIOS.find((u) => u.id === id)
    const rolObj = MOCK_ROLES.find((r) => r.id === idRol)
    if (user && rolObj) {
      user.idRol = idRol
      user.rol = rolObj.nombre as any
      return { ...user }
    }
    throw new Error('Usuario no encontrado')
  }
}

export async function cambiarEstado(id: string, activo: boolean): Promise<AdminUsuario> {
  try {
    return await put<AdminUsuario>(`/api/admin/usuarios/${id}/estado`, { activo })
  } catch {
    const user = MOCK_USUARIOS.find((u) => u.id === id)
    if (user) {
      user.activo = activo
      return { ...user }
    }
    throw new Error('Usuario no encontrado')
  }
}
