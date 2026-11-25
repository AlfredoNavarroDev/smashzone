import { get } from './http'
import type { HoraPico, IngresoMes, PaqueteDemanda } from './types'
import { smashzoneApi } from './smashzoneApi'

export const ingresosPorMes = async (): Promise<IngresoMes[]> => {
  try {
    return await get<IngresoMes[]>('/api/reportes/ingresos-por-mes')
  } catch {
    const data = await smashzoneApi.reporteIngresosPorMes()
    return data.map((d) => ({
      anio: d.anio,
      mes: d.mes,
      totalIngresos: d.totalIngresos,
    }))
  }
}

export const paquetesMasDemandados = async (): Promise<PaqueteDemanda[]> => {
  try {
    return await get<PaqueteDemanda[]>('/api/reportes/paquete-mas-demandado')
  } catch {
    const data = await smashzoneApi.reportePaqueteMasDemandado()
    return data.map((d) => ({
      idPaquete: d.idPaquete,
      paquete: d.paquete,
      totalReservas: d.totalReservas,
    }))
  }
}

export const horasPico = async (): Promise<HoraPico[]> => {
  try {
    return await get<HoraPico[]>('/api/reportes/horas-pico')
  } catch {
    const data = await smashzoneApi.reporteHorasPico()
    return data.map((d) => ({
      hora: d.hora,
      totalReservas: d.totalReservas,
    }))
  }
}
