# Bloque 4 — Reportes + Dashboard + Frontend shell

## Alcance

- Dashboard con gráficos: ingresos por mes, paquete más demandado, horas
  pico de reserva.
- **Estructura base del Frontend** (routing, layout general, tema,
  componentes compartidos) — este bloque es responsable de que el
  "esqueleto" de la SPA exista para que los otros 3 bloques puedan montar
  sus páginas encima.
- Infra básica de desarrollo (scripts, configuración de Vite/entorno).

## Backend — piezas a implementar

- `ReportesController`: `GET /api/reportes/ingresos-por-mes`,
  `GET /api/reportes/paquete-mas-demandado`,
  `GET /api/reportes/horas-pico`.
- `ReportesService`: queries de agregación sobre `Reservas` y `Pagos`
  (ej. `GroupBy` mes, `GroupBy` paqueteId con `Count`/`Sum`). Solo lectura,
  sin modificar datos de otros bloques.
- Protegido para `Admin` (y posiblemente `Staff` de solo lectura).

## Frontend — piezas a implementar

- **Shell de la app**: layout (sidebar/navbar), `Router` con rutas
  protegidas por rol, tema visual base, componentes compartidos
  (`Button`, `Card`, `Table`, etc.) que los otros bloques van a reutilizar.
- Dashboard con librería de gráficos (ej. Recharts o Chart.js) consumiendo
  los 3 endpoints de reportes.
- Layout del panel Admin/Staff vs. layout del cliente final.

## Contrato de API

Completar en `docs/api-contracts.md#bloque-4--reportes`.

## Coordinación con otros bloques

- Este bloque entrega el shell del Frontend **primero**, lo antes posible,
  porque los otros 3 bloques dependen de él para montar sus páginas (Login
  necesita el Router, Reservas necesita el layout, etc.). Priorizar esta
  pieza al inicio del proyecto, antes del dashboard en sí.
- Lee datos de `Reservas`, `Pagos` y `Paquetes` de los bloques 2 y 3 — solo
  lectura, no modifica esas tablas.
