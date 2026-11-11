# Dudas recurrentes — reservas

**P: ¿Por qué `PUT /api/reservas/{id}/estado` no deja poner `Confirmada`?**
R: Esa transición solo la dispara un pago exitoso. Está bloqueada dos
veces: el validator (`ReservaValidators.cs:26-28`, `Must` solo acepta
`Cancelada`/`EnProceso`/`Completada`) y el service
(`ReservaService.cs:132-133`, chequeo explícito antes de mirar la
máquina de transiciones). `AplicarConfirmacionPorPagoAsync` es el único
camino hacia `Confirmada`, y no está expuesto por ningún endpoint —
solo lo llama `PagoService`.

**P: ¿Por qué cancelar/ver una reserva ajena da `404` y no `403`?**
R: Para no filtrar si la reserva existe (`ReservaService.cs:107-108` y
`:129-130`, mismo patrón en ambos métodos). Es deliberado: un `403`
confirmaría que el id es válido aunque sea de otro cliente; un `404`
no distingue "no existe" de "no es tuya".

**P: ¿Por qué `CambiarEstadoAsync` y `CrearAsync` recargan la entidad
después de `SaveChangesAsync` en vez de devolver la que ya tienen en
memoria?**
R: `EstadosAsync()` (el diccionario de catálogo) consulta con
`AsNoTracking()`, así que asignar `reserva.IdEstado = estados[...]`
no actualiza la navegación `IdEstadoNavigation` en memoria — seguiría
apuntando al estado viejo si no se recarga. Comentario explícito en
`ReservaService.cs:166-167`; probado directamente por
`CambiarEstado_SinEstadosTrackeados_DevuelveElEstadoNuevoEnElDTO`.

**P: ¿Quién puede cancelar y quién puede avanzar a `EnProceso`/`Completada`?**
R: A `Cancelada`: el cliente dueño o Staff/Admin. A `EnProceso` o
`Completada`: solo Staff/Admin — un Cliente que lo intente recibe `400`
(regla de dominio, no un `403` de autorización;
`ReservaService.cs:150-151`).

**P: ¿Por qué `IdUsuarioCambio` en el historial a veces es `null`?**
R: Solo se registra cuando quien hizo el cambio es Staff/Admin
(`actorEsStaffOAdmin ? actorId : null`, `ReservaService.cs:163` y
`:97`/`:202` para la fila inicial y la de confirmación por pago, que
tampoco llevan usuario). Un cliente cancelando su propia reserva deja
ese campo en `null`.
