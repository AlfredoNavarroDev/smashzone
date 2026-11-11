# Backend — SmashZone

Referencia del backend real (ASP.NET Core, .NET 10 + EF Core / SQL
Server). Cada carpeta documenta un módulo/controller tal como está
implementado hoy — no la intención original de los specs en
`docs/superpowers/specs/`. Donde el código se desvió de un spec, se anota
explícitamente en el `notas.md` de la unidad afectada en vez de
silenciarlo.

## Unidades

| Unidad | Controller(s) | Descripción |
|---|---|---|
| [`auth`](./auth/) | `AuthController` (`api/auth`) | Registro, login, heartbeat. |
| [`usuarios`](./usuarios/) | `UsuariosController` (`api/usuarios`) | Perfil propio: ver/editar datos, cambiar password. |
| [`admin-usuarios`](./admin-usuarios/) | `AdminUsuariosController` (`api/admin`) | Gestión admin de usuarios y roles. |
| [`salas`](./salas/) | `SalasController` (`api/salas`) | Catálogo de salas. |
| [`paquetes`](./paquetes/) | `PaquetesController` (`api/paquetes`) | Catálogo de paquetes/planes. |
| [`inventario`](./inventario/) | `InventarioController` (`api/inventario`) | Catálogo de ítems extra y su stock. |
| [`reservas`](./reservas/) | `ReservasController` (`api/reservas`) | Ciclo de vida de una reserva (máquina de estados). |
| [`pagos`](./pagos/) | `PagosController` (`api/pagos`) | Cobro vía Culqi y registro de pagos. |
| [`reportes`](./reportes/) | `ReportesController` (`api/reportes`) | Agregaciones de solo lectura sobre Reservas/Pagos para el dashboard admin. |

## Cross-cutting (no repetido por unidad)

- **Auth global:** JWT Bearer (`Program.cs`) — `AddAuthentication` +
  `AddJwtBearer`, claims validados con `ValidateIssuer`/`ValidateAudience`/
  `ValidateLifetime`, `ClockSkew` de 30s, `MapInboundClaims = false` (el
  claim de id de usuario es `sub` crudo, leído vía
  `ClaimsPrincipalExtensions.GetUserId` en `Infrastructure/Infrastructure.cs`).
  Cada controller decide su propio `[Authorize]`/`[Authorize(Roles=...)]`/
  `[AllowAnonymous]` — no hay policy global más allá de "requiere estar
  autenticado" a nivel `AddAuthorization()`.
- **Traducción de excepciones de dominio:** `ExcepcionesMiddleware`
  (`Infrastructure/Infrastructure.cs`) atrapa `DomainException` y la
  traduce a `ProblemDetails`: `ReglaNegocioException`→400,
  `NoAutorizadoException`→401, `NoEncontradoException`→404,
  `ConflictoException`→409 (jerarquía completa en
  `Services/DomainExceptions.cs`). Cualquier otra excepción no controlada
  cae a 500 con log pero sin detalle expuesto al cliente.
- **Validación de entrada:** `FluentValidationFilter`
  (`Infrastructure/Infrastructure.cs`) corre automáticamente, por acción,
  cualquier `IValidator<T>` registrado en DI para el tipo del argumento —
  no hace falta invocar el validador a mano en el controller ni en el
  service. Devuelve 400 con `ValidationProblemDetails` agrupado por
  campo. Los validadores viven en `Validators/` y se registran todos de
  una vez con `AddValidatorsFromAssemblyContaining<RegistroValidator>()`.
- **Mapeo entidad↔DTO:** AutoMapper con 3 profiles
  (`UsuarioProfile`, `CatalogoProfile`, `ReservaProfile`) registrados en
  `Program.cs`. `reportes` no usa AutoMapper — sus 3 queries proyectan
  directo a record DTOs vía LINQ.
- **Persistencia:** un solo `SmashZoneDbContext` (SQL Server) compartido
  por todas las unidades, inyectado `AddScoped`.
- **CORS:** un único default policy abierto a los orígenes de
  `Cors:Origins` (default `http://localhost:5173`, el puerto de Vite).
- **Seed de datos:** `AdminSeeder.SeedAsync` corre **solo** en
  `Environment.Development` (`Program.cs`), nunca en producción ni en los
  tests de integración (`ApiFactory` no lo invoca).
- **Reloj:** `TimeProvider.System` registrado `AddSingleton` — las
  unidades que necesitan "ahora" (p. ej. `reservas`) lo inyectan en vez de
  usar `DateTime.Now`/`UtcNow` directo, para poder controlarlo en tests.

## Gaps conocidos (agregados de todas las unidades)

- **Cobertura de integración desigual:** `pagos` y `admin-usuarios` no
  tienen ningún test de integración HTTP (`Backend.Tests/Integration/`) —
  solo están probados a nivel de servicio. `usuarios` solo tiene un caso
  HTTP indirecto (vía `AuthEndpointsTests.cs`); `PUT me` y
  `PUT me/password` nunca se ejercitan a nivel HTTP. `paquetes` tampoco
  tiene un archivo de integración propio (su parte de
  `CatalogoEndpointsTests.cs` solo cubre el patrón de auth, reusando el
  caso de `salas`).
- **`reservas`: `GET /api/reservas` no está paginado** pese a que el spec
  de diseño de Bloque 3 pedía reusar el patrón `PaginadoDTO<T>` de
  `AdminUsuariosController` — devuelve una `List<ReservaDetalleDTO>`
  plana. Ni el código ni `docs/api-contracts.md` reflejan la intención
  original del spec. Ver `reservas/notas.md`.
- **`pagos`: sin idempotencia/retry controlado** — dos intentos de pago
  concurrentes sobre la misma reserva pueden ambos cobrar en Culqi (sin
  lock ni `Idempotency-Key`). El CHECK constraint de integridad de pago
  solo existe en `Database/script.sql`, no está declarado en
  `SmashZoneDbContext` vía Fluent API. Ver `pagos/notas.md`.
- **`inventario`: sin control de concurrencia optimista** en el stock de
  `ItemsExtra` — dos reservas simultáneas pueden leer y descontar el
  mismo stock sin detectar la carrera (riesgo ya señalado en el XML-doc
  de la interfaz, no corregido). Ver `inventario/dudas-recurrentes.md`.
- **`usuarios`: `CambiarPasswordAsync` no valida que la password nueva
  sea distinta de la actual** — sin test tampoco. Ver
  `usuarios/dudas-recurrentes.md`.
- **`auth`: sin rate-limiting/lockout** cerca de login — no se encontró
  ninguna protección contra fuerza bruta a nivel de aplicación ni de
  infraestructura visible en el repo. Ver `auth/notas.md`.
- **`reportes`: sin caso de test explícito** para el límite de fin de día
  de `hasta` en `horas-pico` (sí existe para los otros dos reportes,
  mismo código subyacente). Gap menor. Ver `reportes/notas.md`.
