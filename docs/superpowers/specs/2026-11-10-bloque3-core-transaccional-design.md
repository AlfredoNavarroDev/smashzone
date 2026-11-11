# Diseño: Bloque 3 — Core transaccional (Reservas + Pagos con Culqi)

**Fecha:** 2026-11-10
**Estado:** Aprobado

## Contexto

Bloque 2 (Catálogo: Salas, Paquetes, Inventario) ya está implementado
(rama `feature/catalogo-salas-paquetes-inventario`, PR #4, sin mergear a
`main` todavía). Bloque 3 es el núcleo transaccional: crear reservas con
prevención de solapamiento de horario, consumir el contrato de stock de
Bloque 2, registrar el pago (con una pasarela real, Culqi, en vez del
mock originalmente previsto en `docs/modulos/bloque-3-core-transaccional.md`)
y mantener la auditoría completa de cambios de estado en
`HistorialEstadosReserva`.

Alcance de esta iteración: **solo backend**, igual que se hizo con
Bloque 2. El widget de pago de Culqi en el frontend (tokenización en el
navegador) y el resto del flujo de reserva en React quedan fuera —
documentados como dependencia pendiente para quien tome la pieza de
frontend de este bloque.

## Por qué Culqi en vez de un mock

El proyecto es para Perú. Culqi es la pasarela más práctica para un
proyecto académico: sandbox gratis sin afiliación comercial pesada
(a diferencia de Niubiz), moneda PEN nativa, y un flujo de tokenización
client-side que ya resuelve PCI compliance sin trabajo extra. El pago
simulado puro (donde el cliente manda `Exitoso: true/false`) queda
reemplazado por una integración real contra la API de cargos de Culqi
para los métodos de pago "en línea"; los métodos "manuales" (efectivo,
transferencia) siguen sin pasar por ningún gateway porque el dinero
cambia de manos fuera del sistema.

## Decisiones

### 1. Máquina de estados de `Reserva`

Nombres tal cual seedeados en `EstadosReserva` (`Database/script.sql`):
`Pendiente`, `Confirmada`, `EnProceso`, `Completada`, `Cancelada`.

```
Pendiente --(pago exitoso, automático)--> Confirmada
Confirmada --(Staff/Admin, check-in)--> EnProceso
EnProceso --(Staff/Admin, check-out)--> Completada
Pendiente | Confirmada --(cliente dueño o Staff/Admin)--> Cancelada
```

- `Completada` y `Cancelada` son terminales — cualquier transición desde
  ahí lanza `ReglaNegocioException` (400).
- `PUT /api/reservas/{id}/estado` **no acepta `Confirmada`** como
  destino manual — esa transición solo la dispara un pago exitoso vía
  `POST /api/pagos`. Intentarlo por `PUT /estado` es 400.
- Permisos por transición:
  - → `Cancelada`: el cliente dueño de la reserva, o Staff/Admin.
  - → `EnProceso` / `Completada`: solo Staff/Admin.
- Cada transición de `IdEstado` (incluida la creación, `NULL → Pendiente`)
  inserta una fila en `HistorialEstadosReserva` en la misma operación de
  `SaveChanges` que la generó — nunca como paso aparte.

### 2. Creación de reserva (`POST /api/reservas`)

Pueden crear: Cliente (para sí mismo), Staff o Admin (opcionalmente a
nombre de otro usuario vía `IdCliente` en el DTO — si el actor es
Cliente, ese campo se ignora y se usa el id del token).

`CrearReservaDTO`:
```
{ IdCliente?: Guid, IdSala: int, IdPaquete: int, FechaHoraInicio: DateTime,
  NumParticipantes: int, NotasEspeciales?: string,
  Extras: [{ IdItemExtra: int, Cantidad: int }] }
```

`FechaHoraFin` **no la manda el cliente** — se calcula server-side como
`FechaHoraInicio + Paquete.DuracionMinutos`.

Validaciones del `ReservaService`, en orden:
1. Sala existe y `Activa == true`; Paquete existe y `Activo == true`
   (404/400 según corresponda).
2. Si `IdCliente` viene en el DTO, el usuario referenciado debe existir
   (404 si no).
3. `FechaHoraInicio` debe ser futura (no se reserva en el pasado).
4. `NumParticipantes <= Sala.CapacidadMaxima` y
   `NumParticipantes <= Paquete.MaxParticipantes` (400 con mensaje
   específico para cada caso).
5. Sin solapamiento de horario en la misma sala — la query de
   referencia de `docs/modulos/bloque-3-core-transaccional.md`,
   traducida a los campos reales del modelo (`IdSala`, comparación de
   `IdEstadoNavigation.Nombre != "Cancelada"`): 409 si hay cruce.
6. Por cada extra: `IInventarioService.DescontarStockAsync(idItem, cantidad)`
   (ya implementado en Bloque 2; lanza 400 si no hay stock o el ítem
   está inactivo). El precio unitario se congela en
   `DetallesReservaExtra.PrecioUnitarioHistorico` en el momento de la
   reserva.
7. `MontoPaquete = Paquete.Precio`, `MontoExtras = Σ(precio histórico × cantidad)`.
   `MontoTotal` es columna calculada en la propia tabla (no se setea).
8. Arma el grafo completo en memoria (`Reserva` + `DetallesReservaExtra[]`
   + `HistorialEstadosReserva` inicial con `IdEstadoAnterior = null`) y
   hace **un solo `SaveChangesAsync()`** — atómico sin necesitar
   `BeginTransaction()` explícito, tal como permite el documento del
   bloque.

`GET /api/reservas/{id}`: si el actor es Cliente y la reserva no es
suya, `404` (no `403`, para no filtrar si la reserva existe).
`GET /api/reservas`: Cliente ve solo las propias; Staff/Admin ven todas
con filtro opcional `?estado=`. Reutiliza el patrón `PaginadoDTO<T>` ya
usado en `AdminUsuariosController`.
`GET /api/reservas/{id}/historial`: `[Authorize(Roles = "Admin,Staff")]`,
devuelve la línea de tiempo completa (`HistorialEstadoDTO[]`).

### 3. Cancelación y reposición de stock

Al cancelar (`PUT /estado` con destino `Cancelada`), por cada
`DetallesReservaExtra` de esa reserva se llama
`IInventarioService.ReponerStockAsync(idItem, cantidad)` — método nuevo,
extensión aditiva de la interfaz de Bloque 2, mismo contrato que
`DescontarStockAsync` (muta la entidad trackeada en memoria, **no**
llama `SaveChanges`; el cambio de `IdEstado` + el historial + la
reposición de stock se persisten juntos en un solo `SaveChangesAsync`).

### 4. Pagos — ruteo por método

`MetodosPago` seedeados (`Database/script.sql`): `Tarjeta de
Crédito/Débito`, `Transferencia Bancaria`, `Efectivo`. (La fila original
`PasarelaSimulada (Stripe/PayPal)` se eliminó del seed — era un
placeholder previo a decidir Culqi y duplicaba `Tarjeta de
Crédito/Débito`, que es justo lo que Culqi procesa.) Se clasifican por
**nombre** (no por Id, mismo estilo que `AdminUsuarioService.RolAdmin =
"Admin"`):

- **Gateway** (`Tarjeta de Crédito/Débito`): requiere `CulqiToken`
  generado en el navegador. `PagoService` llama
  `ICulqiClient.CrearCargoAsync(token, montoCentimos, email)`. El
  resultado (aprobado/rechazado) lo decide Culqi — el cliente ya no
  puede declarar `Exitoso` para este método.
- **Manual** (`Transferencia Bancaria`, `Efectivo`): sin token; el
  dinero cambió de manos fuera del sistema, así que **Staff/Admin**
  manda `Exitoso` a mano al registrar el pago (un Cliente no puede
  auto-confirmar un pago manual).

`CrearPagoDTO`:
```
{ IdReserva: Guid, IdMetodoPago: int, CulqiToken?: string, Exitoso?: bool }
```
`CulqiToken` es obligatorio (validado por FluentValidation) cuando
`IdMetodoPago` resuelve a un método de gateway; `Exitoso` es obligatorio
(y solo lo puede mandar Staff/Admin) cuando resuelve a un método manual.

Reglas comunes a ambos caminos:
- La reserva debe estar en `Pendiente` para aceptar un pago — si no,
  `409 Conflict` (no se paga dos veces, ni se paga una reserva ya
  cancelada).
- `Monto` **nunca lo manda el cliente** — el servidor lo fija como
  `Reserva.MontoTotal`.
- Pago exitoso: inserta el `Pago` + confirma la reserva
  (`Pendiente → Confirmada`) + inserta `HistorialEstadosReserva`, todo
  en el mismo `SaveChangesAsync`. La confirmación vive en un método
  interno de `IReservaService` (ej. `AplicarConfirmacionPorPagoAsync`)
  que muta la entidad trackeada sin guardar — mismo patrón
  "muta-sin-guardar" que `DescontarStockAsync`/`ReponerStockAsync`, para
  que `PagoService` pueda componerlo en su propia unidad de trabajo.
- Pago fallido (tarjeta rechazada, o manual con `Exitoso: false`): se
  guarda igual el `Pago` (queda en el historial de intentos), la
  reserva sigue `Pendiente` y se puede reintentar con otro método.

### 5. Integración con Culqi

- `Backend/Backend/Configuration/CulqiSettings.cs` — `SecretKey`, mismo
  patrón `IOptions` que `JwtSettings` (bind + `ValidateOnStart`).
  Vive en `appsettings.Development.json` (gitignored) en desarrollo; en
  `appsettings.json` commiteado queda vacío.
- `ICulqiClient` — `HttpClient` tipado
  (`AddHttpClient<ICulqiClient, CulqiClient>()`) contra
  `https://api.culqi.com/v2/charges`, header
  `Authorization: Bearer {SecretKey}`. `CrearCargoAsync(token, montoCentimos,
  email)` arma `{ amount, currency_code: "PEN", email, source_id: token }`.
- El email del cargo es el de `Reserva.IdClienteNavigation.Email`.
- `TransaccionRef` del `Pago` = el `id` de cargo (`chr_...`) que
  devuelve Culqi.
- Manejo de errores: una respuesta de Culqi con tarjeta rechazada
  (típicamente HTTP 400 con cuerpo de error estructurado) se traduce a
  `ReglaNegocioException` con el `user_message` de Culqi — es un
  resultado de negocio esperado, no una falla. Un error de
  red/timeout/respuesta no-JSON inesperada se deja propagar como
  excepción genérica (500) — es una falla de infraestructura, no debe
  confundirse con "tarjeta rechazada".
- En tests automatizados, `ICulqiClient` se reemplaza por un fake —
  la suite nunca pega a la API real de Culqi (mismo criterio que el
  resto del proyecto: tests deterministas, sin red externa).

### 6. Testing

Mismo patrón que Bloques 1 y 2: TDD, `TestDb` (SQLite in-memory) para
`ReservaServiceTests`/`PagoServiceTests`, un fake `ICulqiClient` para los
casos de pago con gateway, e integration tests de autorización
(`CatalogoEndpointsTests`-style) para los nuevos controllers.

### 7. Estrategia de rama

`feature/reservas-pagos-core-transaccional`, creada **sobre**
`feature/catalogo-salas-paquetes-inventario` (no sobre `main`), porque
depende de `IInventarioService` que todavía no está mergeado. El PR de
este bloque se abre contra esa rama (stacked PR); cuando el PR #4 de
Catálogo se mergee a `main` con review humano, este PR se puede
retargetear a `main`.

## Fuera de alcance

- Widget de pago de Culqi en el frontend (tokenización en navegador) y
  el resto del flujo de reserva en React — pendiente para la pieza de
  frontend de este bloque.
- `ExencionesResponsabilidad` (exención de responsabilidad firmada) —
  no está en la lista de "entidades dueñas" del bloque según
  `docs/modulos/bloque-3-core-transaccional.md`.
- Webhooks de Culqi (notificaciones asíncronas) — la API de cargos que
  usamos responde sincrónico, no hace falta para este alcance.
- Protección de concurrencia en el descuento/reposición de stock
  (limitación ya documentada en `docs/api-contracts.md` desde Bloque 2,
  sigue aplicando sin cambios aquí).
