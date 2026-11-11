# Dudas recurrentes — reportes

**P: ¿Por qué `hasta` ignora la hora que le mando?**
R: Decisión deliberada — `FinDeRango` (`Services/ReportesService.cs:70`)
siempre trunca `hasta` a su fecha y filtra `< hasta.Date.AddDays(1)`, para
que un caller que solo piensa en días (`hasta=2026-01-15`) obtenga el 15
de enero completo sin tener que mandar `23:59:59.999` a mano. Documentado
también en `docs/api-contracts.md`, sección Bloque 4.

**P: ¿Por qué `paquete-mas-demandado` y `horas-pico` filtran por
`Reserva.FechaHoraInicio` y no por la fecha en que se creó o pagó la
reserva?**
R: Porque el reporte describe *demanda de uso* (cuándo ocurre la sesión),
no cuándo se registró en el sistema. `ingresos-por-mes` en cambio filtra
por `Pago.FechaPago` porque describe *cuándo entró el dinero*. Cada
reporte filtra por el campo de fecha relevante a su propio dominio — ver
`Services/ReportesService.cs:21` (`Pago.FechaPago`) vs `:59`
(`Reserva.FechaHoraInicio`).

**P: ¿Por qué un pago rechazado (`Exitoso=false`) no aparece en
`ingresos-por-mes` aunque sí existe el registro `Pago`?**
R: El filtro `Where(p => p.Exitoso)` en `Services/ReportesService.cs:20`
lo excluye explícitamente — un intento fallido no es ingreso real, es un
registro de auditoría (ver unidad `pagos` para cómo y por qué se graba
igual).

**P: ¿Por qué el servicio no usa `TimeProvider` como otros servicios del
backend (p. ej. `ReservaService`)?**
R: Porque `ReportesService` no genera ningún timestamp — solo lee datos
ya existentes y agrega. `TimeProvider` solo hace falta donde el código
necesita saber "ahora" para escribir o validar contra el presente (spec de
diseño, sección 6).
