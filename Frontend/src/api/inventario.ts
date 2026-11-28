import { loadDb, saveDb, tryFetchLive, ApiDomainError } from './engine'
import type { ActualizarItemExtraDTO, CrearItemExtraDTO, ItemExtraDTO } from '../types/api.types'

export async function listarInventario(filtros?: {
  categoria?: string
  activo?: boolean
}): Promise<ItemExtraDTO[]> {
  const params = new URLSearchParams()
  if (filtros?.categoria && filtros.categoria !== 'Todos') params.set('categoria', filtros.categoria)
  if (typeof filtros?.activo === 'boolean') params.set('activo', String(filtros.activo))
  const qs = params.toString() ? `?${params.toString()}` : ''

  const live = await tryFetchLive<ItemExtraDTO[]>(`/inventario${qs}`)
  if (live.handled) return live.data

  const db = loadDb()
  return db.inventario.filter((item) => {
    if (filtros?.categoria && filtros.categoria !== 'Todos' && item.categoria !== filtros.categoria) {
      return false
    }
    if (typeof filtros?.activo === 'boolean' && item.activo !== filtros.activo) {
      return false
    }
    return true
  })
}

export async function crearItemInventario(dto: CrearItemExtraDTO, token?: string | null): Promise<ItemExtraDTO> {
  const live = await tryFetchLive<ItemExtraDTO>('/inventario', { method: 'POST', body: JSON.stringify(dto) }, token)
  if (live.handled) return live.data

  const db = loadDb()
  if (db.inventario.some((i) => i.nombre.toLowerCase() === dto.nombre.trim().toLowerCase())) {
    throw new ApiDomainError(409, 'Ya existe un ítem en inventario con ese nombre.')
  }
  const nuevo: ItemExtraDTO = {
    id: Math.max(0, ...db.inventario.map((i) => i.id)) + 1,
    nombre: dto.nombre.trim(),
    categoria: dto.categoria,
    precioUnitario: Number(dto.precioUnitario),
    stockDisponible: Number(dto.stockDisponible),
    activo: true,
  }
  db.inventario.push(nuevo)
  saveDb(db)
  return nuevo
}

export async function actualizarItemInventario(
  id: number,
  dto: ActualizarItemExtraDTO,
  token?: string | null
): Promise<ItemExtraDTO> {
  const live = await tryFetchLive<ItemExtraDTO>(`/inventario/${id}`, { method: 'PUT', body: JSON.stringify(dto) }, token)
  if (live.handled) return live.data

  const db = loadDb()
  const item = db.inventario.find((i) => i.id === id)
  if (!item) throw new ApiDomainError(404, 'Ítem no encontrado.')
  item.nombre = dto.nombre.trim()
  item.categoria = dto.categoria
  item.precioUnitario = Number(dto.precioUnitario)
  item.stockDisponible = Number(dto.stockDisponible)
  saveDb(db)
  return item
}

export async function cambiarEstadoInventario(id: number, activo: boolean, token?: string | null): Promise<void> {
  const live = await tryFetchLive<void>(`/inventario/${id}/estado`, { method: 'PUT', body: JSON.stringify({ activo }) }, token)
  if (live.handled) return

  const db = loadDb()
  const item = db.inventario.find((i) => i.id === id)
  if (!item) throw new ApiDomainError(404, 'Ítem no encontrado.')
  item.activo = activo
  saveDb(db)
}
