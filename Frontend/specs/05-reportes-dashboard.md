# Spec 05 — Módulo de Reportes y Dashboard Analítico (Admin)

> **Bloque asociado:** Bloque 4 (`reportes`)  
> **Contratos Backend:** [`../../api-contracts.md#bloque-4--reportes`](../../api-contracts.md) y [`../../backend/reportes/`](../../backend/reportes/)

---

## 1. Reglas de Acceso y Filtrado Temporal

1. **Autorización Exclusiva:** Los 3 endpoints requieren rol `Admin` (`[Authorize(Roles = "Admin")]`). Si un usuario `Staff` o `Cliente` intenta acceder, el backend responde `403 Forbidden`.
2. **Filtro Global de Fechas (`?desde=&hasta=`):**
   - Ambos parámetros son opcionales (`ISO-8601 UTC`).
   - Si ambos están presentes, el frontend valida que `desde <= hasta` antes de consultar (evitando el `400 ReglaNegocioException` del servidor).
   - **Comportamiento de Fin de Día en `hasta`:** El backend normaliza `hasta` a las `23:59:59.999` de la fecha indicada, cubriendo el día completo.
3. **Relleno de Huecos en Series Continuas (Regla Crítica de `api-contracts.md`):**
   - El backend **solo devuelve los grupos que tienen actividad** (`total > 0`).
   - El frontend **debe rellenar con `0`** los meses sin ingresos o las horas del día (`00:00` a `23:00`) sin reservas para que los ejes X de los gráficos sean continuos y fieles a la realidad.

---

## 2. Los 3 Reportes Oficiales en el Command Center

### 2.1 Ingresos por Mes (`GET /api/reportes/ingresos-por-mes`)
- **Fuente de datos en servidor:** Tabla `Pagos` filtrada por `FechaPago` y `Exitoso == true`.
- **DTO (`IngresoMesDTO[]`):** `{ anio: number, mes: number, totalIngresos: number }` ordenado ascendente por `anio, mes`.
- **Visualización:** Gráfico de barras/área cinético con gradiente `--accent-rage` → `--accent-ember`, mostrando KPI de ingreso acumulado en el periodo, ticket promedio y crecimiento mensual.

### 2.2 Paquete Más Demandado (`GET /api/reportes/paquete-mas-demandado`)
- **Fuente de datos en servidor:** Tabla `Reservas` filtrada por `FechaHoraInicio` donde `Estado != "Cancelada"`.
- **DTO (`PaqueteDemandaDTO[]`):** `{ idPaquete: number, paquete: string, totalReservas: number }` ordenado descendente por `totalReservas` (ranking completo).
- **Visualización:** Barras horizontales de participación porcentual con medalla `TOP #1 DEMAND` en color `--accent-volt`.

### 2.3 Horas Pico de Reserva (`GET /api/reportes/horas-pico`)
- **Fuente de datos en servidor:** Tabla `Reservas` filtrada por `FechaHoraInicio` donde `Estado != "Cancelada"`, agrupada por hora UTC (`0` a `23`).
- **DTO (`HoraPicoDTO[]`):** `{ hora: number, totalReservas: number }` ordenado descendente por `totalReservas`.
- **Visualización:**
  - Curva/Histograma continuo de 24 horas (`00:00` a `23:00`) rellenando con `0` las horas vacías.
  - Conmutador **UTC / Hora Local (Perú UTC-5)** para facilitar la lectura operativa del administrador.

