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
si `cantidad <= 0`, el ítem está inactivo o no hay stock suficiente; si
no lanza, deja la entidad `ItemsExtra` trackeada y descontada en memoria
**sin** llamar `SaveChanges` — quien la invoque debe persistir todo
(reserva + detalles + descuento de stock) en la misma
transacción/`SaveChangesAsync`.

**Límite conocido — sin protección de concurrencia:** no hay columna de
concurrencia optimista en `ItemsExtras`. Dos reservas simultáneas sobre
el mismo ítem pueden leer el mismo `StockDisponible` antes de que
cualquiera persista (lost update). Bloque 3 debe decidir cómo serializar
el acceso (transacción con aislamiento adecuado, lock explícito, o
agregar un rowversion) si esto importa en producción — no resuelto en
este bloque.

## Bloque 3 — Core transaccional

Todos los endpoints requieren `Authorization: Bearer <jwt>`. Un Cliente
solo ve/opera sus propias reservas — `GET`/`PUT estado` sobre una
reserva ajena devuelve `404` (no `403`, para no filtrar su existencia).

Todas las fechas son UTC (ISO-8601, con sufijo `Z` o sin offset
interpretado como UTC). Aplica a `fechaHoraInicio` y a cualquier otro
datetime de los contratos de este bloque (`fechaHoraFin`, `fechaPago`,
`fechaCambio`): el servidor no hace conversión de zona horaria.

### `POST /api/reservas`
Cliente (reserva para sí), Staff o Admin (`IdCliente` opcional, reserva
a nombre de otro usuario — ignorado si el actor es Cliente).
Request (`CrearReservaDTO`):
```json
{ "idSala": 1, "idPaquete": 2, "fechaHoraInicio": "2026-12-10T16:00:00",
  "numParticipantes": 4, "notasEspeciales": null,
  "extras": [{ "idItemExtra": 5, "cantidad": 2 }] }
```
`fechaHoraFin` se calcula server-side (`fechaHoraInicio + Paquete.DuracionMinutos`),
no se manda. Response `201` (`ReservaDetalleDTO`). `400` si sala/paquete
inactivos, fecha pasada, supera cupo, o no hay stock suficiente de algún
extra. `404` si sala/paquete/ítem extra no existen. `409` solo si hay
solapamiento de horario en la sala.

### `GET /api/reservas/{id}` · `GET /api/reservas?estado=`
Cliente ve solo las propias; Staff/Admin ven todas, filtro opcional por
`estado` (`Pendiente`/`Confirmada`/`EnProceso`/`Completada`/`Cancelada`).

### `PUT /api/reservas/{id}/estado`
Request: `{ "nuevoEstado": "Cancelada" }`. Transiciones válidas:
`Pendiente|Confirmada → Cancelada` (cliente dueño o Staff/Admin),
`Confirmada → EnProceso` y `EnProceso → Completada` (solo Staff/Admin).
`Confirmada` **no** es un destino válido aquí (solo vía pago exitoso).
`400` si la transición no es válida o la reserva ya está en estado
terminal. Al cancelar, repone el stock de los extras consumidos.

### `GET /api/reservas/{id}/historial`
`[Authorize(Roles = "Admin,Staff")]`. Devuelve `HistorialEstadoDTO[]`
con la línea de tiempo completa de cambios de estado.

### `POST /api/pagos`
Request (`CrearPagoDTO`): `{ "idReserva": "guid", "idMetodoPago": 1,
"culqiToken": "tkn_..." }` para `Tarjeta de Crédito/Débito` (vía Culqi:
el resultado lo decide el gateway), o `{ "idReserva": "guid",
"idMetodoPago": 2, "exitoso": true, "transaccionRef": "..." }` para
`Transferencia Bancaria`/`Efectivo` (solo Staff/Admin, confirman a
mano). `monto` nunca lo manda el cliente — el servidor lo fija como
`MontoPaquete + MontoExtras` de la reserva. La reserva debe estar
`Pendiente` — `409` si no. Pago exitoso confirma la reserva
(`Pendiente → Confirmada`) en la misma operación. Response `201`
(`VoucherDTO`) — un `201` siempre significa pago exitoso.
`400` si: tarjeta rechazada por Culqi, falta el `culqiToken`, un Cliente
(no Staff/Admin) intenta confirmar un método de pago manual, no se indica
`exitoso` en un pago manual, el pago manual se registra como no exitoso
(el intento queda guardado en `Pagos` con `Exitoso = false`, igual que un
rechazo de tarjeta), o el monto a pagar es `0`. Un error de
configuración/infraestructura de la pasarela (API key inválida, endpoint
caído) **no** se reporta como rechazo: sale como `500`.

### Límites conocidos

- **Doble reserva simultánea del mismo horario:** la verificación de
  solapamiento es un `SELECT` previo al `INSERT`, sin lock ni índice
  único. Dos peticiones concurrentes para la misma sala y horario pueden
  pasar ambas la validación y crear dos reservas solapadas — misma clase
  de race condition que el stock de Bloque 2, y tampoco resuelta aquí.
- **Dos pagos simultáneos sobre la misma reserva `Pendiente`:** la
  comprobación de estado también es una lectura previa. Ambas peticiones
  pueden llegar a cobrar en Culqi antes de que cualquiera persista, con
  lo que el cliente termina cobrado dos veces. No hay idempotencia por
  reserva ni clave `Idempotency-Key`.
- **Cancelar una reserva ya pagada (`Confirmada`):** repone el stock de
  los extras, pero **no** genera ningún reembolso en Culqi ni marca ni
  anula el `Pago` exitoso previo. El voucher sigue existiendo tal cual.
  La devolución del dinero queda fuera del alcance de este bloque y hoy
  es un proceso manual.

## Bloque 4 — Reportes

Todos los endpoints requieren `Authorization: Bearer <jwt>` y rol
`Admin` (`[Authorize(Roles = "Admin")]`) — Staff no tiene acceso.
Los 3 aceptan `desde`/`hasta` opcionales (query params, `DateTime`).
`400` si `desde > hasta`. Sin filtro, agregan sobre todo el histórico.

### `GET /api/reportes/ingresos-por-mes?desde=&hasta=`
Filtra por `Pago.FechaPago`. Suma `Monto` de pagos con `Exitoso = true`,
agrupado por año-mes. Response `200`:
```json
[{ "anio": 2026, "mes": 1, "totalIngresos": 1500.00 }]
```
Ordenado por `anio, mes` ascendente.

### `GET /api/reportes/paquete-mas-demandado?desde=&hasta=`
Filtra por `Reserva.FechaHoraInicio`. Cuenta reservas con
`Estado != "Cancelada"`, agrupado por paquete. Response `200`
(ranking completo, no solo el top 1):
```json
[{ "idPaquete": 2, "paquete": "Paquete VIP", "totalReservas": 14 }]
```
Ordenado por `totalReservas` descendente.

### `GET /api/reportes/horas-pico?desde=&hasta=`
Mismo filtro y exclusión de `Cancelada` que el anterior, agrupado por
hora del día (0–23) de `FechaHoraInicio`. Response `200`:
```json
[{ "hora": 18, "totalReservas": 9 }]
```
Ordenado por `totalReservas` descendente.
