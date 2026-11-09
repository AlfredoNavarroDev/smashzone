# Contratos de API

Documento vivo: cada bloque agrega aquí sus endpoints a medida que los
implementa, para que el Frontend (y los otros bloques) sepan qué DTO
esperar sin leer el código del Backend.

Convención general:
- Base path: `/api/<recurso-en-plural>` (ej. `/api/reservas`).
- Todo endpoint autenticado requiere header `Authorization: Bearer <jwt>`.
- Respuestas de error usan el formato estándar de ASP.NET Core
  `ProblemDetails` (`400`, `401`, `403`, `404`, `409`).

## Bloque 1 — Auth

### `POST /api/auth/registro`
Request (`RegistroDTO`):
```json
{ "nombre": "string", "email": "string", "password": "string", "telefono": "string" }
```
Response `201 Created` (`UsuarioDTO`, sin password).

### `POST /api/auth/login`
Request:
```json
{ "email": "string", "password": "string" }
```
Response `200 OK`:
```json
{ "token": "jwt...", "usuario": { "usuarioId": 1, "nombre": "...", "rol": "Cliente" } }
```

## Bloque 2 — Catálogo

_A completar por el responsable del bloque: `GET/POST/PUT /api/salas`,
`GET/POST/PUT /api/paquetes`, `GET/POST/PUT /api/inventario`._

## Bloque 3 — Core transaccional

### `POST /api/reservas`
Request (`CrearReservaDTO`):
```json
{
  "salaId": 1,
  "paqueteId": 2,
  "fechaHoraInicio": "2026-12-10T16:00:00",
  "extras": [{ "itemId": 5, "cantidad": 2 }]
}
```
Response `201 Created` (`ReservaDetalleDTO`).
Response `409 Conflict` si hay solapamiento de horario en la sala.

_A completar: `POST /api/pagos`, `PUT /api/reservas/{id}/estado`._

## Bloque 4 — Reportes

_A completar: `GET /api/reportes/ingresos-por-mes`,
`GET /api/reportes/paquete-mas-demandado`, `GET /api/reportes/horas-pico`._
