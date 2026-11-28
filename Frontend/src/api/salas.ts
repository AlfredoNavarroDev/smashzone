import { loadDb, saveDb, tryFetchLive, ApiDomainError } from './engine'
import type { ActualizarSalaDTO, CrearSalaDTO, SalaDTO } from '../types/api.types'

export async function listarSalas(soloActivas?: boolean): Promise<SalaDTO[]> {
  const query = typeof soloActivas === 'boolean' ? `?activa=${soloActivas}` : ''
  const live = await tryFetchLive<SalaDTO[]>(`/salas${query}`)
  if (live.handled) return live.data

  const db = loadDb()
  return typeof soloActivas === 'boolean'
    ? db.salas.filter((s) => s.activa === soloActivas)
    : db.salas
}

export async function crearSala(dto: CrearSalaDTO, token?: string | null): Promise<SalaDTO> {
  const live = await tryFetchLive<SalaDTO>('/salas', { method: 'POST', body: JSON.stringify(dto) }, token)
  if (live.handled) return live.data

  const db = loadDb()
  if (db.salas.some((s) => s.nombre.toLowerCase() === dto.nombre.trim().toLowerCase())) {
    throw new ApiDomainError(409, 'Ya existe una sala con ese nombre.')
  }
  const nueva: SalaDTO = {
    id: Math.max(0, ...db.salas.map((s) => s.id)) + 1,
    nombre: dto.nombre.trim(),
    capacidadMaxima: Number(dto.capacidadMaxima),
    descripcion: dto.descripcion?.trim() || null,
    activa: true,
  }
  db.salas.push(nueva)
  saveDb(db)
  return nueva
}

export async function actualizarSala(
  id: number,
  dto: ActualizarSalaDTO,
  token?: string | null
): Promise<SalaDTO> {
  const live = await tryFetchLive<SalaDTO>(`/salas/${id}`, { method: 'PUT', body: JSON.stringify(dto) }, token)
  if (live.handled) return live.data

  const db = loadDb()
  const sala = db.salas.find((s) => s.id === id)
  if (!sala) throw new ApiDomainError(404, 'Sala no encontrada.')
  if (db.salas.some((s) => s.id !== id && s.nombre.toLowerCase() === dto.nombre.trim().toLowerCase())) {
    throw new ApiDomainError(409, 'Ya existe otra sala con ese nombre.')
  }
  sala.nombre = dto.nombre.trim()
  sala.capacidadMaxima = Number(dto.capacidadMaxima)
  sala.descripcion = dto.descripcion?.trim() || null
  saveDb(db)
  return sala
}

export async function cambiarEstadoSala(id: number, activo: boolean, token?: string | null): Promise<void> {
  const live = await tryFetchLive<void>(`/salas/${id}/estado`, { method: 'PUT', body: JSON.stringify({ activo }) }, token)
  if (live.handled) return

  const db = loadDb()
  const sala = db.salas.find((s) => s.id === id)
  if (!sala) throw new ApiDomainError(404, 'Sala no encontrada.')
  sala.activa = activo
  saveDb(db)
}
