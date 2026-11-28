import { loadDb, saveDb, tryFetchLive, ApiDomainError } from './engine'
import type { CrearPaqueteDTO, PaqueteDTO } from '../types/api.types'

export async function listarPaquetes(soloActivos?: boolean): Promise<PaqueteDTO[]> {
  const query = typeof soloActivos === 'boolean' ? `?activo=${soloActivos}` : ''
  const live = await tryFetchLive<PaqueteDTO[]>(`/paquetes${query}`)
  if (live.handled) return live.data

  const db = loadDb()
  return typeof soloActivos === 'boolean'
    ? db.paquetes.filter((p) => p.activo === soloActivos)
    : db.paquetes
}

export async function crearPaquete(dto: CrearPaqueteDTO, token?: string | null): Promise<PaqueteDTO> {
  const live = await tryFetchLive<PaqueteDTO>('/paquetes', { method: 'POST', body: JSON.stringify(dto) }, token)
  if (live.handled) return live.data

  const db = loadDb()
  if (db.paquetes.some((p) => p.nombre.toLowerCase() === dto.nombre.trim().toLowerCase())) {
    throw new ApiDomainError(409, 'Ya existe un paquete con ese nombre.')
  }
  const nuevo: PaqueteDTO = {
    id: Math.max(0, ...db.paquetes.map((p) => p.id)) + 1,
    nombre: dto.nombre.trim(),
    descripcion: dto.descripcion?.trim() || null,
    precio: Number(dto.precio),
    duracionMinutos: Number(dto.duracionMinutos),
    maxParticipantes: Number(dto.maxParticipantes),
    cantidadItemsEstandar: Number(dto.cantidadItemsEstandar),
    activo: true,
  }
  db.paquetes.push(nuevo)
  saveDb(db)
  return nuevo
}

export async function cambiarEstadoPaquete(id: number, activo: boolean, token?: string | null): Promise<void> {
  const live = await tryFetchLive<void>(`/paquetes/${id}/estado`, { method: 'PUT', body: JSON.stringify({ activo }) }, token)
  if (live.handled) return

  const db = loadDb()
  const paq = db.paquetes.find((p) => p.id === id)
  if (!paq) throw new ApiDomainError(404, 'Paquete no encontrado.')
  paq.activo = activo
  saveDb(db)
}
