# Contratos de API

Documento vivo: cada bloque agrega aquí sus endpoints a medida que los
implementa, para que el Frontend (y los otros bloques) sepan qué DTO
esperar sin leer el código del Backend.

Convención general:
- Base path: `/api/<recurso-en-plural>` (ej. `/api/reservas`).
- Todo endpoint autenticado requiere header `Authorization: Bearer <jwt>`.
- Respuestas de error usan el formato estándar de ASP.NET Core
  `ProblemDetails` (`400`, `401`, `403`, `404`, `409`).

## Bloque 1 — Auth y Usuarios

Roles: `Admin`, `Staff`, `Cliente`. El `id` de usuario es un GUID. Errores en
formato `ProblemDetails`; las validaciones devuelven `400` con `errors` por campo.
Contraseña: mínimo 8 caracteres con mayúscula, minúscula y número.

### `POST /api/auth/registro` (público)
Request (`RegistroDTO`):
```json
{ "nombre": "Ana", "apellido": "Garcia", "email": "ana@correo.com", "password": "Password1!", "telefono": "999888777" }
```
`apellido` es obligatorio; `telefono` y `documentoIdentidad` opcionales.
Response `201 Created` (`UsuarioDTO`, sin password; rol siempre `Cliente`). `409` si el email ya existe (sin distinguir mayúsculas).

### `POST /api/auth/login` (público)
Request: `{ "email": "string", "password": "string" }`
Response `200 OK`:
```json
{ "token": "jwt...", "expiraEn": "2026-11-09T21:00:00Z",
  "usuario": { "id": "guid", "nombre": "Ana", "apellido": "Garcia", "email": "ana@correo.com",
               "telefono": null, "documentoIdentidad": null, "rol": "Cliente", "activo": true, "fechaRegistro": "..." } }
```
`401` con mensaje genérico si las credenciales son inválidas o la cuenta está deshabilitada. Registra `UltimoAcceso`.

### `POST /api/auth/heartbeat` (autenticado)
`204 No Content`. El frontend lo llama cada 60 s; actualiza `UltimaActividad`. `401` si la cuenta fue deshabilitada
(el frontend cierra la sesión).

### `GET /api/usuarios/me` · `PUT /api/usuarios/me` (autenticado)
`PUT` recibe `{ "nombre", "apellido", "telefono" }` y devuelve el `UsuarioDTO` actualizado.

### `PUT /api/usuarios/me/password` (autenticado)
`{ "passwordActual": "...", "passwordNueva": "..." }` → `204`. `400` si la actual es incorrecta.

### Administración de usuarios — solo rol `Admin` (`403` para otros roles)

| Endpoint | Descripción |
|---|---|
| `GET /api/admin/usuarios?texto=&idRol=&activo=&online=&pagina=1&tamanoPagina=20` | Lista paginada (`{ items, total, pagina, tamanoPagina }`) de `AdminUsuarioDTO` (incluye `rol`, `activo`, `online`, `ultimoAcceso`, `ultimaActividad`). `tamanoPagina` máx. 100. |
| `GET /api/admin/usuarios/{id}` | Detalle de un usuario. |
| `GET /api/admin/usuarios/resumen` | `{ totalRegistrados, habilitados, deshabilitados, onlineAhora, activos7Dias, porRol[], registrosPorDia[30] }` |
| `PUT /api/admin/usuarios/{id}/rol` | Body `{ "idRol": 2 }`. |
| `PUT /api/admin/usuarios/{id}/estado` | Body `{ "activo": false }` (habilitar/deshabilitar; no se borra). |
| `GET /api/admin/roles` | Lista de roles (`id`, `nombre`, `descripcion`). |

Definiciones:
- **Online**: cuenta habilitada con `UltimaActividad` en los últimos 5 minutos (heartbeat; aproximación, no tiempo real).
- **Activo 7 días**: cuenta habilitada con actividad en los últimos 7 días.
- Reglas de protección (`400`): un Admin no puede deshabilitarse ni quitarse su propio rol, y siempre debe quedar al menos otro Admin activo.

## Bloque 2 — Catálogo

Lectura (`GET`) pública, sin token — el Cliente navega el catálogo sin
loguearse. Mutaciones (`POST`/`PUT`) requieren `[Authorize(Roles = "Admin")]`
y devuelven `403` para otros roles. No hay `DELETE`: "eliminar" es
desactivar vía `PUT .../{id}/estado` (las tablas de Reservas/Detalles
referencian estas filas sin cascada, borrarlas en duro rompería el
historial). Nombre único por entidad → `409 Conflict` si ya existe.

### Salas
- `GET /api/salas?activa=true` — lista (`SalaDTO[]`), filtro opcional por `activa`.
- `GET /api/salas/{id}` — `404` si no existe.
- `POST /api/salas` (`CrearSalaDTO`: `nombre`, `capacidadMaxima`, `descripcion?`) → `201` (`SalaDTO`, `activa=true`).
- `PUT /api/salas/{id}` (`ActualizarSalaDTO`: mismos campos que crear).
- `PUT /api/salas/{id}/estado` (`CambiarEstadoDTO`: `{ "activo": bool }`).

### Paquetes
- `GET /api/paquetes?activo=true` — lista (`PaqueteDTO[]`).
- `GET /api/paquetes/{id}` — `404` si no existe.
- `POST /api/paquetes` (`CrearPaqueteDTO`: `nombre`, `descripcion`, `precio`, `duracionMinutos`, `maxParticipantes`, `cantidadItemsEstandar`) → `201`.
- `PUT /api/paquetes/{id}` (`ActualizarPaqueteDTO`: mismos campos).
- `PUT /api/paquetes/{id}/estado` (`CambiarEstadoDTO`).

### Inventario (ítems extra)
- `GET /api/inventario?categoria=Vidrio&activo=true` — lista (`ItemExtraDTO[]`), filtros opcionales combinables.
- `GET /api/inventario/{id}` — `404` si no existe.
- `POST /api/inventario` (`CrearItemExtraDTO`: `nombre`, `categoria`, `precioUnitario`, `stockDisponible`) → `201`.
- `PUT /api/inventario/{id}` (`ActualizarItemExtraDTO`: mismos campos).
- `PUT /api/inventario/{id}/estado` (`CambiarEstadoDTO`).

### Contrato interno para Bloque 3
`IInventarioService.DescontarStockAsync(idItem, cantidad)` — no es un
endpoint HTTP, es el método que `ReservaService` debe inyectar y llamar
al crear una reserva con extras. Lanza `ReglaNegocioException` (→ `400`)
si el ítem está inactivo o no hay stock suficiente; si no lanza, deja la
entidad `ItemsExtra` trackeada y descontada en memoria **sin** llamar
`SaveChanges` — quien la invoque debe persistir todo (reserva + detalles
+ descuento de stock) en la misma transacción/`SaveChangesAsync`.

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
