import { get, put } from './http'
import type { AdminUsuario, FiltroUsuarios, Paginado, Rol, UsuariosResumen } from './types'

export const resumenUsuarios = () => get<UsuariosResumen>('/api/admin/usuarios/resumen')

export const listarRoles = () => get<Rol[]>('/api/admin/roles')

export function listarUsuarios(f: FiltroUsuarios) {
  const qs = new URLSearchParams()
  Object.entries(f).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v))
  })
  return get<Paginado<AdminUsuario>>(`/api/admin/usuarios?${qs}`)
}

export const cambiarRol = (id: string, idRol: number) =>
  put<AdminUsuario>(`/api/admin/usuarios/${id}/rol`, { idRol })

export const cambiarEstado = (id: string, activo: boolean) =>
  put<AdminUsuario>(`/api/admin/usuarios/${id}/estado`, { activo })
