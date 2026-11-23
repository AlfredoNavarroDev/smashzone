import { get } from './http'
import type { HoraPico, IngresoMes, PaqueteDemanda } from './types'

export const ingresosPorMes = () => get<IngresoMes[]>('/api/reportes/ingresos-por-mes')
export const paquetesMasDemandados = () => get<PaqueteDemanda[]>('/api/reportes/paquete-mas-demandado')
export const horasPico = () => get<HoraPico[]>('/api/reportes/horas-pico')
