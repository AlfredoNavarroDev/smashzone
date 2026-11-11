# Dudas recurrentes — pagos

**P: ¿Por qué `PagosController` tiene `[Authorize]` sin rol, si solo
Staff/Admin puede registrar un pago manual?**
R: Porque un Cliente sí puede pagar su propia reserva con tarjeta — el
endpoint es compartido entre ambos flujos. La restricción por rol para el
pago manual se aplica dentro de `PagoService.CrearAsync`
(`PagoService.cs:55-56`), no en el atributo del controller.

**P: Si la reserva no es del cliente que llama, ¿por qué `404` y no
`403`?**
R: Mismo patrón que `ReservaService` — no distinguir "no existe" de "no es
tuya" evita confirmarle a un usuario que un id de reserva ajeno es válido
(`PagoService.cs:28-29`).

**P: ¿Por qué el service compara `metodo.Nombre ==
PagoService.MetodoTarjeta` (un string literal) en vez de un flag o enum
en la tabla `MetodosPago`?**
R: La tabla `MetodosPago` (`Models/MetodosPago.cs`) solo tiene `Id` y
`Nombre` — no hay columna que distinga "requiere pasarela" de "manual".
El código asume por convención que únicamente `"Tarjeta de
Crédito/Débito"` pasa por Culqi y todo lo demás es manual. Si se agrega un
método de pago automático nuevo (ej. otra pasarela), este `if/else`
binario no lo soporta sin tocar código — no hay evidencia en el código de
que esto esté previsto.

**P: ¿Qué pasa si Culqi tarda o no responde (timeout)?**
R: No hay timeout configurado explícitamente en el `HttpClient` registrado
en `Program.cs` (`AddHttpClient<ICulqiClient, CulqiClient>`, sin
`.SetHandlerLifetime` ni `Timeout` custom) — usa el default de
`HttpClient` (100s). Una respuesta más allá de eso lanza
`TaskCanceledException`, que **no** es un `DomainException`, así que
`ExcepcionesMiddleware` la trata como error no controlado → `500`. No hay
test que cubra este caso.

**P: El `CHECK (Monto > 0)` de la tabla — ¿dónde está, si no aparece en
`SmashZoneDbContext`?**
R: En `Database/script.sql:162`. El scaffold database-first de EF Core no
siempre traduce `CHECK` constraints a `HasCheckConstraint` en el
`DbContext` generado — por eso no aparece ahí. La barrera real contra
violarlo es la validación manual en `PagoService.CrearAsync` (paso 5 de
`flujo.md`), que corta antes de llegar al `INSERT`.
